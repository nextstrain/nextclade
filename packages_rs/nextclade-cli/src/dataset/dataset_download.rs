use crate::cli::nextclade_cli::{NextcladeRunArgs, NextcladeRunInputArgs};
use crate::cli::nextclade_dataset_get::{dataset_file_http_get, dataset_http_get};
use crate::io::http_client::{HttpClient, ProxyConfig};
use eyre::{eyre, ContextCompat, Report, WrapErr};
use itertools::Itertools;
use log::LevelFilter;
use nextclade::analyze::virus_properties::{LabelledMutationsConfig, VirusProperties};
use nextclade::gene::gene_map::{filter_gene_map, GeneMap};
use nextclade::io::dataset::{Dataset, DatasetFiles, DatasetMeta, DatasetsIndexJson};
use nextclade::io::fasta::{read_one_fasta, read_one_fasta_str};
use nextclade::io::file::create_file_or_stdout;
use nextclade::io::fs::{ensure_dir, has_extension, read_file_to_string};
use nextclade::run::nextclade_wasm::NextcladeParams;
use nextclade::tree::tree::AuspiceTree;
use nextclade::utils::option::OptionMapRefFallible;
use nextclade::{make_error, make_internal_error, o};
use rayon::iter::ParallelIterator;
use std::collections::BTreeMap;
use std::fs::File;
use std::io::{BufReader, Read, Seek, Write};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use zip::ZipArchive;

const PATHOGEN_JSON: &str = "pathogen.json";

pub fn nextclade_get_inputs(
  run_args: &NextcladeRunArgs,
  cdses: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  if let Some(dataset_name) = run_args.inputs.dataset_name.as_ref() {
    dataset_str_download_and_load(run_args, cdses)
      .wrap_err_with(|| format!("When downloading dataset '{dataset_name}'"))
  } else if let Some(input_dataset) = run_args.inputs.input_dataset.as_ref() {
    if input_dataset.is_file() && has_extension(input_dataset, "zip") {
      dataset_zip_load(run_args, input_dataset, cdses)
        .wrap_err_with(|| format!("When loading dataset from {input_dataset:#?}"))
    } else if input_dataset.is_dir() {
      dataset_dir_load(run_args, input_dataset, cdses)
        .wrap_err_with(|| format!("When loading dataset from {input_dataset:#?}"))
    } else {
      make_error!(
        "--input-dataset: path is invalid. \
        Expected a directory path or a zip archive file path, but got: '{input_dataset:#?}'"
      )
    }
  } else {
    dataset_individual_files_load(run_args, cdses)
  }
}

#[inline]
pub fn download_datasets_index_json(http: &mut HttpClient) -> Result<DatasetsIndexJson, Report> {
  let data_bytes = http.get("/index.json")?;
  let data_str = String::from_utf8(data_bytes)?;
  DatasetsIndexJson::from_str(data_str)
}

pub fn dataset_zip_fetch(http: &mut HttpClient, dataset: &Dataset) -> Result<Vec<u8>, Report> {
  http
    .get(&dataset.file_path("dataset.zip"))
    .wrap_err_with(|| format!("When fetching zip file for dataset '{}'", dataset.path))
}

pub fn dataset_zip_download(http: &mut HttpClient, dataset: &Dataset, output_file_path: &Path) -> Result<(), Report> {
  let mut file =
    create_file_or_stdout(output_file_path).wrap_err_with(|| format!("When opening file {output_file_path:?}"))?;

  let content = dataset_zip_fetch(http, dataset)?;

  file
    .write_all(&content)
    .wrap_err_with(|| format!("When writing downloaded dataset zip file to {output_file_path:#?}"))
}

pub fn zip_read_str<R: Read + Seek>(zip: &mut ZipArchive<R>, name: &str) -> Result<String, Report> {
  let mut s = String::new();
  zip.by_name(name)?.read_to_string(&mut s)?;
  Ok(s)
}

pub fn read_from_path_or_zip(
  filepath: &Option<impl AsRef<Path>>,
  zip: &mut ZipArchive<BufReader<File>>,
  zip_filename: &str,
) -> Result<Option<String>, Report> {
  if let Some(filepath) = filepath {
    return Ok(Some(read_file_to_string(filepath)?));
  }
  Ok(zip_read_str(zip, zip_filename).ok())
}

pub fn dataset_zip_load(
  run_args: &NextcladeRunArgs,
  dataset_zip: impl AsRef<Path>,
  cdses: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let file = File::open(dataset_zip)?;
  let buf_file = BufReader::new(file);
  let mut zip = ZipArchive::new(buf_file)?;

  let virus_properties = read_from_path_or_zip(&run_args.inputs.input_pathogen_json, &mut zip, "pathogen.json")?
    .map_ref_fallible(VirusProperties::from_str)
    .wrap_err("When reading pathogen JSON from dataset")?
    .ok_or_else(|| eyre!("Pathogen JSON must always be present in the dataset but not found."))?;

  let ref_record = read_from_path_or_zip(&run_args.inputs.input_ref, &mut zip, &virus_properties.files.reference)?
    .map_ref_fallible(read_one_fasta_str)
    .wrap_err("When reading reference sequence from dataset")?
    .ok_or_else(|| eyre!("Reference sequence must always be present in the dataset but not found."))?;

  let gene_map = read_from_path_or_zip(&run_args.inputs.input_annotation, &mut zip, "genome_annotation.gff3")?
    .map_ref_fallible(GeneMap::from_str)
    .wrap_err("When reading genome annotation from dataset")?
    .map(|gene_map| filter_gene_map(gene_map, cdses))
    .unwrap_or_default();

  let tree = read_from_path_or_zip(&run_args.inputs.input_tree, &mut zip, "tree.json")?
    .map_ref_fallible(AuspiceTree::from_str)
    .wrap_err("When reading reference tree JSON from dataset")?;

  Ok(NextcladeParams {
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}

pub fn dataset_dir_download(http: &mut HttpClient, dataset: &Dataset, output_dir: &Path) -> Result<(), Report> {
  let mut content = dataset_zip_fetch(http, dataset)?;
  let mut reader = std::io::Cursor::new(content.as_mut_slice());
  let mut zip = ZipArchive::new(&mut reader)?;

  ensure_dir(output_dir).wrap_err_with(|| format!("When creating directory {output_dir:#?}"))?;

  zip
    .extract(output_dir)
    .wrap_err_with(|| format!("When extracting zip archive of dataset '{}'", dataset.path))
}

pub fn dataset_dir_load(
  run_args: &NextcladeRunArgs,
  dataset_dir: impl AsRef<Path>,
  cdses: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let dataset_dir = dataset_dir.as_ref();

  let NextcladeRunInputArgs {
    input_ref,
    input_tree,
    input_pathogen_json,
    input_annotation,
    ..
  } = &run_args.inputs;

  let input_pathogen_json = input_pathogen_json
    .clone()
    .unwrap_or_else(|| dataset_dir.join("pathogen.json"));

  let virus_properties = VirusProperties::from_path(input_pathogen_json)?;

  let input_ref = input_ref
    .clone()
    .unwrap_or_else(|| dataset_dir.join(&virus_properties.files.reference));
  let ref_record = read_one_fasta(input_ref).wrap_err("When reading reference sequence")?;

  let gene_map = input_annotation
    .clone()
    .or_else(|| {
      virus_properties
        .files
        .genome_annotation
        .as_ref()
        .map(|genome_annotation| dataset_dir.join(genome_annotation))
    })
    .map_ref_fallible(GeneMap::from_path)
    .wrap_err("When reading genome annotation")?
    .map(|gen_map| filter_gene_map(gen_map, cdses))
    .unwrap_or_default();

  let tree = input_tree
    .clone()
    .or_else(|| {
      virus_properties
        .files
        .tree_json
        .as_ref()
        .map(|tree_json| dataset_dir.join(tree_json))
    })
    .map_ref_fallible(AuspiceTree::from_path)
    .wrap_err("When reading reference tree JSON")?;

  Ok(NextcladeParams {
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}

pub fn dataset_individual_files_load(
  run_args: &NextcladeRunArgs,
  cdses: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  match (&run_args.inputs.input_dataset, &run_args.inputs.input_ref) {
    (None, None) => make_error!("When `--input-dataset` is not specified, --input-ref is required"),
    (_, Some(input_ref)) => {
      let virus_properties = run_args
        .inputs
        .input_pathogen_json
        .as_ref()
        .and_then(|input_pathogen_json| read_file_to_string(input_pathogen_json).ok())
        .map_ref_fallible(VirusProperties::from_str)
        .wrap_err("When reading pathogen JSON")?
        .unwrap_or_else(|| {
          // The only case where we allow pathogen.json to be missing is when there's no dataset and files are provided
          // explicitly through args. Let's create a dummy value to avoid making the field optional,
          // and avoid adding `Default` trait.
          VirusProperties {
            schema_version: "".to_owned(),
            attributes: BTreeMap::default(),
            shortcuts: vec![],
            meta: DatasetMeta::default(),
            files: DatasetFiles {
              reference: "".to_owned(),
              pathogen_json: "".to_owned(),
              genome_annotation: None,
              tree_json: None,
              examples: None,
              readme: None,
              changelog: None,
              rest_files: BTreeMap::default(),
              other: serde_json::Value::default(),
            },
            default_cds: None,
            cds_order_preference: vec![],
            mut_labels: LabelledMutationsConfig::default(),
            primers: vec![],
            qc: None,
            general_params: None,
            alignment_params: None,
            tree_builder_params: None,
            phenotype_data: None,
            aa_motifs: vec![],
            versions: vec![],
            version: None,
            compatibility: None,
            other: serde_json::Value::default(),
          }
        });

      let ref_record = read_one_fasta(input_ref).wrap_err("When reading reference sequence")?;

      let gene_map = run_args
        .inputs
        .input_annotation
        .as_ref()
        .map_ref_fallible(GeneMap::from_path)
        .wrap_err("When reading genome annotation")?
        .map(|gen_map| filter_gene_map(gen_map, cdses))
        .unwrap_or_default();

      let tree = run_args
        .inputs
        .input_tree
        .as_ref()
        .map_ref_fallible(AuspiceTree::from_path)
        .wrap_err("When reading reference tree JSON")?;

      Ok(NextcladeParams {
        ref_record,
        gene_map,
        tree,
        virus_properties,
      })
    }
    _ => make_internal_error!("Reached unknown match arm"),
  }
}

pub struct DatasetFilePaths<'a> {
  input_ref: &'a Path,
  input_tree: &'a Option<PathBuf>,
  input_pathogen_json: &'a Option<PathBuf>,
  input_annotation: &'a Option<PathBuf>,
}

pub fn read_from_path_or_url(
  http: &mut HttpClient,
  dataset: &Dataset,
  filepath: &Option<impl AsRef<Path>>,
  url: &Option<String>,
) -> Result<Option<String>, Report> {
  if let Some(filepath) = filepath {
    return Ok(Some(read_file_to_string(filepath)?));
  } else if let Some(url) = url {
    return Ok(Some(dataset_file_http_get(http, dataset, url)?));
  }
  Ok(None)
}

pub fn dataset_str_download_and_load(
  run_args: &NextcladeRunArgs,
  cdses: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let verbose = log::max_level() > LevelFilter::Info;
  let mut http = HttpClient::new(&run_args.inputs.server, &ProxyConfig::default(), verbose)?;

  let name = run_args
    .inputs
    .dataset_name
    .as_ref()
    .expect("Dataset name is expected, but got 'None'");

  let dataset = dataset_http_get(&mut http, name, &None)?;

  let virus_properties = read_from_path_or_url(
    &mut http,
    &dataset,
    &run_args.inputs.input_pathogen_json,
    &Some(o!("pathogen.json")),
  )?
  .map_ref_fallible(VirusProperties::from_str)
  .wrap_err("When reading pathogen JSON from dataset")?
  .ok_or_else(|| eyre!("Required file not found in dataset: 'pathogen.json'. Please report it to dataset authors."))?;

  let ref_record = read_from_path_or_url(
    &mut http,
    &dataset,
    &run_args.inputs.input_ref,
    &Some(dataset.files.reference.clone()),
  )?
  .map_ref_fallible(read_one_fasta_str)?
  .wrap_err("When reading reference sequence from dataset")?;

  let gene_map = read_from_path_or_url(
    &mut http,
    &dataset,
    &run_args.inputs.input_annotation,
    &dataset.files.genome_annotation,
  )?
  .map_ref_fallible(GeneMap::from_str)
  .wrap_err("When reading genome annotation from dataset")?
  .map(|gene_map| filter_gene_map(gene_map, cdses))
  .unwrap_or_default();

  let tree = read_from_path_or_url(
    &mut http,
    &dataset,
    &run_args.inputs.input_tree,
    &dataset.files.tree_json,
  )?
  .map_ref_fallible(AuspiceTree::from_str)
  .wrap_err("When reading reference tree from dataset")?;

  Ok(NextcladeParams {
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}
