use crate::cli::nextclade_cli::NextcladeDatasetGetArgs;
use crate::dataset::dataset_download::{dataset_dir_download, dataset_zip_download, download_datasets_index_json};
use crate::io::http_client::HttpClient;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::{warn, LevelFilter};
use nextclade::io::dataset::{Dataset, DatasetsIndexJson};
use nextclade::make_error;
use nextclade::utils::info::{this_package_version, this_package_version_str};
use nextclade::utils::string::find_similar_strings;

pub struct DatasetHttpGetParams<'s> {
  pub name: &'s str,
  pub tag: &'s str,
}

pub fn nextclade_dataset_get(
  NextcladeDatasetGetArgs {
    name,
    tag,
    server,
    output_dir,
    output_zip,
    proxy_config,
    ..
  }: &NextcladeDatasetGetArgs,
) -> Result<(), Report> {
  let verbose = log::max_level() > LevelFilter::Info;

  let http = HttpClient::new(server, proxy_config, verbose)?;
  let dataset = dataset_http_get(&http, name, tag.as_ref())?;

  if let Some(output_dir) = &output_dir {
    dataset_dir_download(&http, &dataset, tag.as_ref(), output_dir)?;
  } else if let Some(output_zip) = &output_zip {
    dataset_zip_download(&http, &dataset, tag.as_ref(), output_zip)?;
  }

  Ok(())
}

pub fn dataset_http_get(http: &HttpClient, name: impl AsRef<str>, tag: Option<&String>) -> Result<Dataset, Report> {
  let name = name.as_ref();

  let DatasetsIndexJson { collections, .. } = download_datasets_index_json(http)?;

  let datasets = collections
    .into_iter()
    .flat_map(|collection| collection.datasets)
    .collect_vec();

  let with_matching_name = datasets
    .iter()
    .find(|dataset| dataset.path == name || dataset.shortcuts.contains(&String::from(name)));

  let (dataset, tag) = match with_matching_name {
    None => {
      // If name is incorrect, display error
      let names = datasets.iter().flat_map(Dataset::path_and_shortcuts);
      let suggestions_msg = format_suggestions(names, name);
      make_error!(
        "Dataset not found: '{name}'.{suggestions_msg}\n\nType `nextclade dataset list` to show available datasets.",
      )
    }
    // If name is correct...
    Some(dataset) => match tag.map(String::as_str) {
      None | Some("latest") => {
        // ...and if tag is not provided or a placeholder, use latest tag
        let tag = dataset.tag_latest();
        Ok((dataset, tag.to_owned()))
      }
      Some(tag) => {
        if dataset.has_tag(tag) {
          // ...and if a tag is matching, use that tag
          let tag = dataset.resolve_tag(Some(&tag));
          Ok((dataset, tag))
        } else {
          // ...and if no tags matching, display error
          let suggestions_msg = format_suggestions(dataset.tags(), tag);
          make_error!(
              "Dataset '{name}' is found, but requested version tag for it not found: '{tag}'.{suggestions_msg}\n\nType `nextclade dataset list --name='{name}'` to show available version tags for this dataset or use --tag='latest' or omit the --tag argument to use the latest version tag.",
            )
        }
      }
    },
  }?;

  if !dataset.is_cli_compatible(this_package_version(), &tag)? {
    warn!(
      "The requested dataset '{}' with version tag '{}' is not compatible with this version of Nextclade ({}). This may cause errors and unexpected results. Please try to upgrade your Nextclade version and/or report this to dataset authors.",
      dataset.path,
      tag,
      this_package_version_str()
    );
  }

  Ok(dataset.clone())
}

pub fn dataset_file_http_get(
  http: &HttpClient,
  dataset: &Dataset,
  filename: impl AsRef<str>,
) -> Result<String, Report> {
  let filename = filename.as_ref();
  let url = dataset.file_path_latest(filename);

  let content = http
    .get(&url)
    .wrap_err_with(|| format!("when fetching dataset file '{filename}'"))?;

  let content_string = String::from_utf8(content)?;

  Ok(content_string)
}

fn format_suggestions(candidates: impl Iterator<Item = impl AsRef<str> + Copy>, actual: impl AsRef<str>) -> String {
  let suggestions = find_similar_strings(candidates, &actual).take(20).collect_vec();
  if !suggestions.is_empty() {
    {
      let suggestions = suggestions.iter().map(|s| format!("- {}", s.as_ref())).join("\n");
      format!("\n\nDid you mean:\n{suggestions}\n?")
    }
  } else {
    String::new()
  }
}
