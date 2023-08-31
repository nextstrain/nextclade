use crate::cli::nextclade_cli::NextcladeDatasetGetArgs;
use crate::dataset::dataset_download::{dataset_dir_download, dataset_zip_download, download_datasets_index_json};
use crate::io::http_client::HttpClient;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::{warn, LevelFilter};
use nextclade::io::dataset::{Dataset, DatasetsIndexJson};
use nextclade::utils::string::find_similar_strings;
use nextclade::{getenv, make_error, make_internal_error};

const THIS_VERSION: &str = getenv!("CARGO_PKG_VERSION");

pub struct DatasetHttpGetParams<'s> {
  pub name: &'s str,
  pub tag: &'s str,
}

pub fn nextclade_dataset_get(
  NextcladeDatasetGetArgs {
    name,
    reference,
    tag,
    attribute,
    server,
    output_dir,
    output_zip,
    proxy_config,
  }: &NextcladeDatasetGetArgs,
) -> Result<(), Report> {
  if reference.is_some() || !attribute.is_empty() {
    return make_error!("The arguments `--reference` and `--attribute` are removed. Datasets are now queried by `--name` and `--tag` only.\n\nIn order to list all dataset names, type:\n\n  nextclade dataset list --names-only\n\n. Please refer to `--help` and to Nextclade documentation for more details.");
  }

  let verbose = log::max_level() > LevelFilter::Info;

  let mut http = HttpClient::new(server, proxy_config, verbose)?;
  let dataset = dataset_http_get(&mut http, name, tag)?;

  if let Some(output_dir) = &output_dir {
    dataset_dir_download(&mut http, &dataset, output_dir)?;
  } else if let Some(output_zip) = &output_zip {
    dataset_zip_download(&mut http, &dataset, output_zip)?;
  } else {
  }

  Ok(())
}

pub fn dataset_http_get(http: &mut HttpClient, name: impl AsRef<str>, tag: &Option<String>) -> Result<Dataset, Report> {
  let name = name.as_ref();
  let tag = tag.as_ref();

  let DatasetsIndexJson { collections, .. } = download_datasets_index_json(http)?;

  let datasets = collections
    .into_iter()
    .flat_map(|collection| collection.datasets)
    .collect_vec();

  let paths = datasets.iter().map(|dataset| dataset.path.clone()).collect_vec();

  let mut filtered = datasets.into_iter().filter(Dataset::is_enabled)
    .filter(|dataset| -> bool  {
      // If a concrete version `tag` is specified, we skip 'enabled', 'compatibility' and 'latest' checks
      if let Some(tag) = tag.as_ref() {
        dataset.is_tag(tag)
      } else {
        dataset.is_latest()
      }
    })
    // Filter by name
    .filter(|dataset| {
      dataset.path == name
    })
    .collect_vec();

  let dataset = match &filtered.len() {
    0 => {
      let suggestions = find_similar_strings(paths.iter(), &name).take(10).collect_vec();
      let suggestions_msg = (!suggestions.is_empty())
        .then(|| {
          let suggestions = suggestions.iter().map(|s| format!("- {s}")).join("\n");
          format!("\n\nDid you mean:\n{suggestions}\n?")
        })
        .unwrap_or_default();
      make_error!(
        "Dataset not found: '{name}'.{suggestions_msg}\n\nType `nextclade dataset list` to show available datasets."
      )
    }
    1 => Ok(filtered.remove(0)),
    _ => {
      make_internal_error!("Expected to find a single dataset, but multiple datasets found.")
    }
  }?;

  if !dataset.is_cli_compatible(THIS_VERSION) {
    warn!(
      "The requested dataset '{}' with version tag '{}' is not compatible with this version of Nextclade ({}). This may cause errors and unexpected results. Please try to upgrade your Nextclade version and/or report this to dataset authors.",
      dataset.path,
      dataset.tag(),
      THIS_VERSION
    );
  }

  Ok(dataset)
}

pub fn dataset_file_http_get(
  http: &mut HttpClient,
  dataset: &Dataset,
  filename: impl AsRef<str>,
) -> Result<String, Report> {
  let filename = filename.as_ref();
  let url = dataset.file_path(filename);

  let content = http
    .get(&url)
    .wrap_err_with(|| format!("when fetching dataset file '{filename}'"))?;

  let content_string = String::from_utf8(content)?;

  Ok(content_string)
}
