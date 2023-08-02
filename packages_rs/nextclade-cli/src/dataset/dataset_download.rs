use crate::cli::nextclade_cli::NextcladeRunArgs;
use crate::cli::nextclade_dataset_get::{dataset_file_http_get, nextclade_dataset_http_get, DatasetHttpGetParams};
use crate::io::http_client::{HttpClient, ProxyConfig};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::LevelFilter;
use nextclade::analyze::virus_properties::VirusProperties;
use nextclade::gene::gene_map::{filter_gene_map, GeneMap};
use nextclade::io::dataset::{Dataset, DatasetsIndexJson};
use nextclade::io::fasta::{read_one_fasta, read_one_fasta_str};
use nextclade::io::fs::absolute_path;
use nextclade::io::json::json_parse_bytes;
use nextclade::make_error;
use nextclade::run::nextclade_wasm::NextcladeParams;
use nextclade::tree::tree::AuspiceTree;
use rayon::iter::{IntoParallelRefIterator, ParallelIterator};
use std::fs;
use std::fs::File;
use std::io::{BufReader, Read, Seek};
use std::path::Path;
use std::str::FromStr;
use zip::ZipArchive;

#[inline]
pub fn download_datasets_index_json(http: &mut HttpClient) -> Result<DatasetsIndexJson, Report> {
  json_parse_bytes(http.get(&"/index_v2.json")?.as_slice())
}

pub fn dataset_dir_download(http: &mut HttpClient, dataset: &Dataset, output_dir: &Path) -> Result<(), Report> {
  let output_dir = &absolute_path(output_dir)?;
  fs::create_dir_all(output_dir).wrap_err_with(|| format!("When creating directory '{output_dir:#?}'"))?;

  dataset
    .files
    .par_iter()
    .map(|(filename, url)| -> Result<(), Report> {
      let output_file_path = output_dir.join(filename);
      let content = http.get(url)?;
      fs::write(output_file_path, content)?;
      Ok(())
    })
    .collect::<Result<(), Report>>()
    .wrap_err_with(|| format!("When downloading dataset {dataset:#?}"))
}

pub fn dataset_zip_download(http: &mut HttpClient, dataset: &Dataset, output_file_path: &Path) -> Result<(), Report> {
  if let Some(parent_dir) = output_file_path.parent() {
    let parent_dir = &absolute_path(parent_dir)?;
    fs::create_dir_all(parent_dir)
      .wrap_err_with(|| format!("When creating parent directory '{parent_dir:#?}' for file '{output_file_path:#?}'"))?;
  }

  let content = http.get(&dataset.zip_bundle)?;
  fs::write(output_file_path, content)
    .wrap_err_with(|| format!("When writing downloaded dataset zip file to {output_file_path:#?}"))
}

pub fn zip_read_str<R: Read + Seek>(zip: &mut ZipArchive<R>, name: &str) -> Result<String, Report> {
  let mut s = String::new();
  zip.by_name(name)?.read_to_string(&mut s)?;
  Ok(s)
}

pub fn dataset_zip_load(
  run_args: &NextcladeRunArgs,
  dataset_zip: impl AsRef<Path>,
  genes: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let file = File::open(dataset_zip)?;
  let buf_file = BufReader::new(file);
  let mut zip = ZipArchive::new(buf_file)?;

  let ref_record = run_args.inputs.input_ref.as_ref().map_or_else(
    || read_one_fasta_str(&zip_read_str(&mut zip, "reference.fasta")?),
    read_one_fasta,
  )?;

  let tree = Some(run_args.inputs.input_tree.as_ref().map_or_else(
    || AuspiceTree::from_str(&zip_read_str(&mut zip, "tree.json")?),
    AuspiceTree::from_path,
  )?);

  let virus_properties = run_args.inputs.input_pathogen_json.as_ref().map_or_else(
    || VirusProperties::from_str(&zip_read_str(&mut zip, "pathogen.json")?),
    VirusProperties::from_path,
  )?;

  let gene_map = run_args.inputs.input_gene_map.as_ref().map_or_else(
    || {
      filter_gene_map(
        Some(GeneMap::from_str(zip_read_str(&mut zip, "genome_annotation.gff3")?)?),
        genes,
      )
    },
    |input_gene_map| filter_gene_map(Some(GeneMap::from_file(input_gene_map)?), genes),
  )?;

  Ok(NextcladeParams {
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}

#[rustfmt::skip]
pub fn dataset_dir_load(
  run_args: NextcladeRunArgs,
  dataset_dir: impl AsRef<Path>,
  genes: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let input_dataset = dataset_dir.as_ref();
  dataset_load_files(DatasetFilePaths {
    input_ref: &run_args.inputs.input_ref.unwrap_or_else(|| input_dataset.join("reference.fasta")),
    input_tree: &run_args.inputs.input_tree.unwrap_or_else(|| input_dataset.join("tree.json")),
    input_virus_properties: &run_args.inputs.input_pathogen_json.unwrap_or_else(|| input_dataset.join("pathogen.json")),
    input_gene_map: &run_args.inputs.input_gene_map.unwrap_or_else(|| input_dataset.join("genome_annotation.gff3")),
  }, genes)
}

pub fn dataset_individual_files_load(
  run_args: &NextcladeRunArgs,
  genes: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  #[rustfmt::skip]
  let required_args = &[
    (String::from("--input-ref"), &run_args.inputs.input_ref),
    (String::from("--input-tree"), &run_args.inputs.input_tree),
    (String::from("--input-gene-map"), &run_args.inputs.input_gene_map),
    (String::from("--input-pathogen-json"), &run_args.inputs.input_pathogen_json),
  ];

  #[allow(clippy::single_match_else)]
  match required_args {
    #[rustfmt::skip]
    [
      (_, Some(input_ref)),
      (_, Some(input_tree)),
      (_, Some(input_gene_map)),
      (_, Some(input_virus_properties)),
    ] => {
      dataset_load_files(DatasetFilePaths {
        input_ref,
        input_tree,
        input_virus_properties,
        input_gene_map,
      }, genes)
    },
    _ => {
      let missing_args = required_args
        .iter()
        .filter_map(|(key, val)| match val {
          None => Some(key),
          Some(_) => None,
        })
        .cloned()
        .join("  \n");

      make_error!("When `--input-dataset` is not specified, the following arguments are required:\n{missing_args}")
    }
  }
}

pub struct DatasetFilePaths<'a> {
  input_ref: &'a Path,
  input_tree: &'a Path,
  input_virus_properties: &'a Path,
  input_gene_map: &'a Path,
}

pub fn dataset_load_files(
  DatasetFilePaths {
    input_ref,
    input_tree,
    input_virus_properties,
    input_gene_map,
  }: DatasetFilePaths,
  genes: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let ref_record = read_one_fasta(input_ref)?;
  Ok(NextcladeParams {
    ref_record,
    virus_properties: VirusProperties::from_path(input_virus_properties)?,
    gene_map: filter_gene_map(Some(GeneMap::from_file(input_gene_map)?), genes)?,
    tree: Some(AuspiceTree::from_path(input_tree)?),
  })
}

pub fn dataset_str_download_and_load(
  run_args: &NextcladeRunArgs,
  dataset_name: &str,
  genes: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let verbose = log::max_level() > LevelFilter::Info;
  let mut http = HttpClient::new(&run_args.inputs.server, &ProxyConfig::default(), verbose)?;

  let name = run_args
    .inputs
    .dataset_name
    .as_ref()
    .expect("Dataset name is expected, but got 'None'");

  let dataset = nextclade_dataset_http_get(
    &mut http,
    DatasetHttpGetParams {
      name,
      reference: "default",
      tag: "latest",
    },
    &[],
  )?;

  let ref_record = run_args.inputs.input_ref.as_ref().map_or_else(
    || read_one_fasta_str(&dataset_file_http_get(&mut http, &dataset, "reference.fasta")?),
    read_one_fasta,
  )?;

  let tree = Some(run_args.inputs.input_tree.as_ref().map_or_else(
    || AuspiceTree::from_str(&dataset_file_http_get(&mut http, &dataset, "tree.json")?),
    AuspiceTree::from_path,
  )?);

  let virus_properties = run_args.inputs.input_pathogen_json.as_ref().map_or_else(
    || VirusProperties::from_str(&dataset_file_http_get(&mut http, &dataset, "virus_properties.json")?),
    VirusProperties::from_path,
  )?;

  let gene_map = run_args.inputs.input_gene_map.as_ref().map_or_else(
    || {
      filter_gene_map(
        Some(GeneMap::from_str(dataset_file_http_get(
          &mut http,
          &dataset,
          "genemap.gff",
        )?)?),
        genes,
      )
    },
    |input_gene_map| filter_gene_map(Some(GeneMap::from_file(input_gene_map)?), genes),
  )?;

  Ok(NextcladeParams {
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}
