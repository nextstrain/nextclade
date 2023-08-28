use crate::cli::nextclade_cli::NextcladeDatasetGetArgs;
use crate::dataset::dataset_attributes::{format_attribute_list, parse_dataset_attributes};
use crate::dataset::dataset_download::{dataset_dir_download, dataset_zip_download, download_datasets_index_json};
use crate::dataset::dataset_table::format_dataset_table;
use crate::io::http_client::HttpClient;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::{info, LevelFilter};
use nextclade::io::dataset::{Dataset, DatasetsIndexJson};
use nextclade::{getenv, make_error};

const THIS_VERSION: &str = getenv!("CARGO_PKG_VERSION");

pub struct DatasetHttpGetParams<'s> {
  pub name: &'s str,
  pub reference: &'s str,
  pub updated_at: &'s str,
}

pub fn nextclade_dataset_http_get(
  http: &mut HttpClient,
  DatasetHttpGetParams {
    name,
    reference,
    updated_at: tag,
  }: DatasetHttpGetParams,
  attributes: &[String],
) -> Result<Dataset, Report> {
  let DatasetsIndexJson { collections, .. } = download_datasets_index_json(http)?;

  // Parse attribute key-value pairs
  let mut attributes = parse_dataset_attributes(attributes)?;

  // Handle special attributes differently
  let name = if let Some(attr_name) = attributes.remove("name") {
    attr_name
  } else {
    name.to_owned()
  };

  if let Some(attr_reference) = attributes.remove("reference") {
    attr_reference
  } else {
    reference.to_owned()
  };

  if let Some(attr_tag) = attributes.remove("tag") {
    attr_tag
  } else {
    tag.to_owned()
  };

  let mut filtered = collections
    .into_iter()
    .flat_map(|collection| collection.datasets)
    .filter(Dataset::is_enabled)
    .filter(|dataset| -> bool  {
      // If a concrete version `tag` is specified, we skip 'enabled', 'compatibility' and 'latest' checks
      if tag == "latest" {
        let is_not_old =  dataset.is_latest();
        let is_compatible =  dataset.is_compatible(THIS_VERSION);
        let is_not_deprecated =  !dataset.is_deprecated();
        let is_not_experimental =  !dataset.is_experimental();
        let is_not_community =  !dataset.is_community();
        is_compatible && is_not_old && is_not_deprecated && is_not_experimental && is_not_community
      } else {
        dataset.is_tag(tag)
      }
    })
    // Filter by reference sequence
    .filter(|dataset| {
      if reference == "default" {
        dataset.attributes.reference.is_default()
      } else {
        dataset.attributes.reference.value == reference
      }
    })
    // Filter by name
    .filter(|dataset| {
      dataset.attributes.name.value == name
    })
    // Filter by remaining attributes
    .filter(|dataset| {
      let mut should_include = true;
      for (key, val) in &attributes {
        let is_attr_matches = match dataset.attributes.rest_attrs.get(key) {
          Some(attr) => {
            if val == "default" {
              attr.is_default()
            } else {
              &attr.value == val
            }
          }
          None => false
        };
        should_include = should_include && is_attr_matches;
      }
      should_include
    })
    .collect_vec();

  let attributes_fmt = {
    let attributes_fmt = format_attribute_list(&Some(name), reference, tag, &attributes);
    if attributes_fmt.is_empty() {
      "".to_owned()
    } else {
      format!(" having attributes: {attributes_fmt}")
    }
  };

  info!("Searching for datasets{attributes_fmt}");

  match &filtered.len() {
    0 => make_error!("No datasets found{attributes_fmt}. Use `datasets list` command to show available datasets."),
    1 => Ok(filtered.remove(0)),
    _ => {
      let table = format_dataset_table(&filtered);
      make_error!("Can download only a single dataset, but multiple datasets found{attributes_fmt}. Add more specific attributes to select one of them. Given current attributes, the candidates are:\n{table}")
    }
  }
}

pub fn nextclade_dataset_get(args: &NextcladeDatasetGetArgs) -> Result<(), Report> {
  let verbose = log::max_level() > LevelFilter::Info;
  let mut http = HttpClient::new(&args.server, &args.proxy_config, verbose)?;

  let dataset = nextclade_dataset_http_get(
    &mut http,
    DatasetHttpGetParams {
      name: &args.name,
      reference: &args.reference,
      updated_at: &args.updated_at,
    },
    &args.attribute,
  )?;

  if let Some(output_dir) = &args.output_dir {
    dataset_dir_download(&mut http, &dataset, output_dir)?;
  }

  if let Some(output_zip) = &args.output_zip {
    dataset_zip_download(&mut http, &dataset, output_zip)?;
  }

  Ok(())
}

pub fn dataset_file_http_get(
  http: &mut HttpClient,
  dataset: &Dataset,
  filename: impl AsRef<str>,
) -> Result<String, Report> {
  let url = format!("{}/{}", dataset.url, filename.as_ref());
  let content = http
    .get(&url)
    .wrap_err_with(|| format!("Dataset file download failed: '{}'", http.root.join(&url).unwrap()))?;

  let content_string = String::from_utf8(content)?;

  Ok(content_string)
}
