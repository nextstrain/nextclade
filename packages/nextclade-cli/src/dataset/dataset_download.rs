use crate::cli::nextclade_cli::{NextcladeRunArgs, NextcladeRunInputArgs};
use crate::cli::nextclade_dataset_get::{dataset_file_http_get, dataset_http_get};
use crate::io::http_client::{HttpClient, ProxyConfig};
use color_eyre::{Section, SectionExt};
use eyre::{eyre, ContextCompat, Report, WrapErr};
use itertools::Itertools;
use log::{warn, LevelFilter};
use nextclade::analyze::virus_properties::VirusProperties;
use nextclade::gene::gene_map::{filter_gene_map, GeneMap};
use nextclade::io::dataset::{Dataset, DatasetsIndexJson};
use nextclade::io::fasta::{read_one_fasta, read_one_fasta_str};
use nextclade::io::file::create_file_or_stdout;
use nextclade::io::fs::{ensure_dir, has_extension, read_file_to_string};
use nextclade::run::nextclade_wasm::{NextcladeParams, NextcladeParamsOptional};
use nextclade::tree::tree::{check_ref_seq_mismatch, AuspiceTree};
use nextclade::utils::fs::list_files_recursive;
use nextclade::utils::option::OptionMapRefFallible;
use nextclade::utils::string::{format_list, surround_with_quotes, Indent};
use nextclade::{make_error, make_internal_error, o};
use std::collections::BTreeSet;
use std::fs::File;
use std::io::{BufReader, Cursor, Read, Seek, Write};
use std::ops::Deref;
use std::path::Path;
use zip::ZipArchive;

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
    } else if input_dataset.is_file() && has_extension(input_dataset, "json") {
      dataset_json_load(run_args, input_dataset, cdses)
        .wrap_err_with(|| format!("When loading dataset from {input_dataset:#?}"))
    } else if input_dataset.is_dir() {
      dataset_dir_load(run_args, input_dataset, cdses)
        .wrap_err_with(|| format!("When loading dataset from {input_dataset:#?}"))
    } else {
      make_error!(
        "--input-dataset: path is invalid. \
        Expected a directory path, a zip file path or json file path, but got: '{input_dataset:#?}'"
      )
    }
  } else {
    dataset_individual_files_load(run_args, cdses)
  }
}

#[inline]
pub fn download_datasets_index_json(http: &HttpClient) -> Result<DatasetsIndexJson, Report> {
  let data_bytes = http.get("/index.json")?;
  let data_str = String::from_utf8(data_bytes)?;
  DatasetsIndexJson::from_str(data_str)
}

pub fn dataset_zip_fetch(http: &HttpClient, dataset: &Dataset, tag: &Option<String>) -> Result<Vec<u8>, Report> {
  http
    .get(&dataset.zip_path(tag))
    .wrap_err_with(|| format!("When fetching zip file for dataset '{}'", dataset.path))
}

pub fn dataset_zip_download(
  http: &HttpClient,
  dataset: &Dataset,
  tag: &Option<String>,
  output_file_path: &Path,
) -> Result<(), Report> {
  let mut file =
    create_file_or_stdout(output_file_path).wrap_err_with(|| format!("When opening file {output_file_path:?}"))?;

  let content = dataset_zip_fetch(http, dataset, tag)?;

  file
    .write_all(&content)
    .wrap_err_with(|| format!("When writing downloaded dataset zip file to {output_file_path:#?}"))
}

pub fn zip_read_str<R: Read + Seek>(zip: &mut ZipArchive<R>, name: impl AsRef<str>) -> Result<String, Report> {
  let mut s = String::new();
  zip.by_name(name.as_ref())?.read_to_string(&mut s)?;
  Ok(s)
}

pub fn read_from_path_or_zip(
  filepath: &Option<impl AsRef<Path>>,
  zip: &mut ZipArchive<BufReader<File>>,
  zip_filename: &Option<impl AsRef<str>>,
) -> Result<Option<String>, Report> {
  if let Some(filepath) = filepath {
    Ok(Some(read_file_to_string(filepath)?))
  } else if let Some(zip_filename) = zip_filename {
    zip_read_str(zip, zip_filename)
      .map(Some)
      .wrap_err_with(|| format!("When extracting file {:#?}", zip_filename.as_ref()))
      .with_section(|| {
        let files = zip.file_names().take(30).sorted().map(surround_with_quotes);
        format_list(Indent::default(), files).header("The archive contains the following files:")
      })
  } else {
    Ok(None)
  }
}

pub fn dataset_zip_load(
  run_args: &NextcladeRunArgs,
  dataset_zip: impl AsRef<Path>,
  cdses: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let dataset_zip = dataset_zip.as_ref();
  let file = File::open(dataset_zip)?;
  let buf_file = BufReader::new(file);
  let mut zip = ZipArchive::new(buf_file)?;

  let virus_properties = read_from_path_or_zip(&run_args.inputs.input_pathogen_json, &mut zip, &Some("pathogen.json"))?
    .map_ref_fallible(VirusProperties::from_str)
    .wrap_err("When reading pathogen JSON from dataset")?
    .ok_or_else(|| eyre!("Pathogen JSON must always be present in the dataset but not found."))?;

  let ref_record = read_from_path_or_zip(&run_args.inputs.input_ref, &mut zip, &virus_properties.files.reference)?
    .map_ref_fallible(read_one_fasta_str)
    .wrap_err("When reading reference sequence from dataset")?
    .ok_or_else(|| eyre!("Reference sequence must always be present in the dataset but not found."))?;

  let gene_map = read_from_path_or_zip(
    &run_args.inputs.input_annotation,
    &mut zip,
    &virus_properties.files.genome_annotation,
  )?
  .map_ref_fallible(GeneMap::from_str)
  .wrap_err("When reading genome annotation from dataset")?
  .map(|gene_map| filter_gene_map(gene_map, cdses))
  .unwrap_or_default();

  let tree = read_from_path_or_zip(&run_args.inputs.input_tree, &mut zip, &virus_properties.files.tree_json)?
    .map_ref_fallible(AuspiceTree::from_str)
    .wrap_err("When reading reference tree JSON from dataset")?;

  verify_dataset_files(&virus_properties, zip.file_names());

  if let Some(tree) = &tree {
    if let Some(tree_ref) = tree.root_sequence() {
      check_ref_seq_mismatch(&ref_record.seq, tree_ref)?;
    }
  }

  Ok(NextcladeParams {
    dataset_name: dataset_zip.to_str().unwrap().to_owned(),
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}

fn verify_dataset_files<'a, T: AsRef<str> + 'a + ?Sized>(
  virus_properties: &VirusProperties,
  files_present: impl Iterator<Item = &'a T> + 'a,
) {
  let declared: BTreeSet<&str> = [
    virus_properties.files.reference.as_deref(),
    virus_properties.files.pathogen_json.as_deref(),
    virus_properties.files.genome_annotation.as_deref(),
    virus_properties.files.tree_json.as_deref(),
    virus_properties.files.examples.as_deref(),
    virus_properties.files.readme.as_deref(),
    virus_properties.files.changelog.as_deref(),
  ]
  .into_iter()
  .flatten()
  .chain(virus_properties.files.rest_files.values().map(Deref::deref))
  .collect();

  let present: BTreeSet<&str> = files_present.map(AsRef::as_ref).collect();

  let mut warnings = vec![];
  let not_declared: BTreeSet<&str> = present.difference(&declared).copied().collect();
  if !not_declared.is_empty() {
    warnings.push(format!(
      "The following files are present in the dataset archive, but are not declared in its pathogen.json:\n{}",
      format_list(Indent(2), not_declared.iter()),
    ));
  }

  let not_present: BTreeSet<&str> = declared.difference(&present).copied().collect();
  if !not_present.is_empty() {
    warnings.push(format!(
      "The following files are not present in the dataset archive, but are declared in its pathogen.json:\n{}",
      format_list(Indent(2), not_present.iter()),
    ));
  }

  if !warnings.is_empty() {
    warnings.push(format!(
      "\nContext:\nFiles declared in pathogen.json:\n{}\nFiles present in the archive:\n{}\n",
      format_list(Indent(2), declared.iter()),
      format_list(Indent(2), present.iter()),
    ));
    warn!("When reading dataset: {}\nThis is not an error. Nextclade ignores unknown file declarations and undeclared files. But this could be a mistake by the dataset author. For example, there could be a typo in pathogen.json file declaration, or a file could have been added to the dataset, but not declared in the pathogen.json. In this case, Nextclade analysis could be missing some of the features intended by the author. Contact the author to resolve this. It could also be that the dataset contains files for a newer version of Nextclade, and that the currently used version does not recognize these files. In which case try to upgrade Nextclade.", warnings.join("\n"));
  }
}

pub fn dataset_dir_download(
  http: &HttpClient,
  dataset: &Dataset,
  tag: &Option<String>,
  output_dir: &Path,
) -> Result<(), Report> {
  let mut content = dataset_zip_fetch(http, dataset, tag)?;
  let mut reader = Cursor::new(content.as_mut_slice());
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
    .as_ref()
    .cloned()
    .or_else(|| {
      virus_properties
        .files
        .reference
        .as_ref()
        .map(|reference| dataset_dir.join(reference))
    })
    .expect("Reference sequence is required but it is neither declared in the dataset's pathogen.json `.files` section, nor provided as a separate file");

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

  let dataset_dir_files = list_files_recursive(dataset_dir)?
    .into_iter()
    .map(|p| p.strip_prefix(dataset_dir).unwrap_or(&p).to_owned())
    .map(|p| p.to_string_lossy().into_owned())
    .collect_vec();
  verify_dataset_files(&virus_properties, dataset_dir_files.iter());

  if let Some(tree) = &tree {
    if let Some(tree_ref) = tree.root_sequence() {
      check_ref_seq_mismatch(&ref_record.seq, tree_ref)?;
    }
  }

  Ok(NextcladeParams {
    dataset_name: dataset_dir.to_str().unwrap().to_owned(),
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}

pub fn dataset_json_load(
  run_args: &NextcladeRunArgs,
  dataset_json: impl AsRef<Path>,
  cdses: &Option<Vec<String>>,
) -> Result<NextcladeParams, Report> {
  let dataset_json = dataset_json.as_ref();

  let NextcladeRunInputArgs {
    input_ref,
    input_tree,
    input_pathogen_json,
    input_annotation,
    ..
  } = &run_args.inputs;

  let auspice_json = AuspiceTree::from_path(dataset_json).wrap_err("When reading Auspice JSON v2")?;

  let overrides = {
    let virus_properties = input_pathogen_json
      .map_ref_fallible(VirusProperties::from_path)
      .wrap_err("When parsing pathogen JSON")?;

    let ref_record = input_ref
      .map_ref_fallible(read_one_fasta)
      .wrap_err("When parsing reference sequence")?;

    let tree = input_tree
      .map_ref_fallible(AuspiceTree::from_path)
      .wrap_err("When parsing reference tree Auspice JSON v2")?;

    let gene_map = input_annotation
      .map_ref_fallible(GeneMap::from_path)
      .wrap_err("When parsing genome annotation")?;

    if let (Some(tree), Some(ref_record)) = (&tree, &ref_record) {
      if let Some(tree_ref) = tree.root_sequence() {
        check_ref_seq_mismatch(&ref_record.seq, tree_ref)?;
      }
    }

    NextcladeParamsOptional {
      dataset_name: dataset_json.to_str().map(ToOwned::to_owned),
      ref_record,
      gene_map,
      tree,
      virus_properties,
    }
  };

  NextcladeParams::from_auspice(&auspice_json, &overrides, cdses)
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
        .unwrap_or_default();

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

      if let Some(tree) = &tree {
        if let Some(tree_ref) = tree.root_sequence() {
          check_ref_seq_mismatch(&ref_record.seq, tree_ref)?;
        }
      }

      Ok(NextcladeParams {
        dataset_name: run_args
          .inputs
          .input_pathogen_json
          .as_ref()
          .map(|s| s.to_str().unwrap().to_owned())
          .unwrap_or_default(),
        ref_record,
        gene_map,
        tree,
        virus_properties,
      })
    }
    _ => make_internal_error!("Reached unknown match arm"),
  }
}

pub fn read_from_path_or_url(
  http: &HttpClient,
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
  let http = HttpClient::new(&run_args.inputs.server, &ProxyConfig::default(), verbose)?;

  let name = run_args
    .inputs
    .dataset_name
    .as_ref()
    .expect("Dataset name is expected, but got 'None'");

  let dataset = dataset_http_get(&http, name, &None)?;

  let virus_properties = read_from_path_or_url(
    &http,
    &dataset,
    &run_args.inputs.input_pathogen_json,
    &Some(o!("pathogen.json")),
  )?
  .map_ref_fallible(VirusProperties::from_str)
  .wrap_err("When reading pathogen JSON from dataset")?
  .ok_or_else(|| eyre!("Required file not found in dataset: 'pathogen.json'. Please report it to dataset authors."))?;

  let ref_record = read_from_path_or_url(&http, &dataset, &run_args.inputs.input_ref, &dataset.files.reference)?
    .map_ref_fallible(read_one_fasta_str)?
    .wrap_err("When reading reference sequence from dataset")?;

  let gene_map = read_from_path_or_url(
    &http,
    &dataset,
    &run_args.inputs.input_annotation,
    &dataset.files.genome_annotation,
  )?
  .map_ref_fallible(GeneMap::from_str)
  .wrap_err("When reading genome annotation from dataset")?
  .map(|gene_map| filter_gene_map(gene_map, cdses))
  .unwrap_or_default();

  let tree = read_from_path_or_url(&http, &dataset, &run_args.inputs.input_tree, &dataset.files.tree_json)?
    .map_ref_fallible(AuspiceTree::from_str)
    .wrap_err("When reading reference tree from dataset")?;

  if let Some(tree) = &tree {
    if let Some(tree_ref) = tree.root_sequence() {
      check_ref_seq_mismatch(&ref_record.seq, tree_ref)?;
    }
  }

  Ok(NextcladeParams {
    dataset_name: name.to_owned(),
    ref_record,
    gene_map,
    tree,
    virus_properties,
  })
}
