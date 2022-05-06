use crate::cli::nextclade_cli::NextcladeDatasetGetArgs;
use crate::dataset::dataset::DatasetsIndexJson;
use crate::dataset::dataset_attributes::{format_attribute_list, parse_dataset_attributes};
use crate::dataset::dataset_download::dataset_download;
use crate::dataset::dataset_table::format_dataset_table;
use crate::io::http_client::HttpClient;
use eyre::Report;
use itertools::Itertools;
use nextclade::{getenv, make_error};
use log::{info, LevelFilter};

const THIS_VERSION: &str = getenv!("CARGO_PKG_VERSION");

pub fn nextclade_dataset_get(
  NextcladeDatasetGetArgs {
    mut name,
    mut reference,
    mut tag,
    attribute,
    server,
    output_dir,
    proxy_config,
  }: NextcladeDatasetGetArgs,
) -> Result<(), Report> {
  let verbose = log::max_level() > LevelFilter::Info;
  let mut http = HttpClient::new(server, proxy_config, verbose)?;
  let DatasetsIndexJson { datasets, .. } = DatasetsIndexJson::download(&mut http)?;

  // Parse attribute key-value pairs
  let mut attributes = parse_dataset_attributes(&attribute)?;

  // Handle special attributes differently
  if let Some(attr_name) = attributes.remove("name") {
    name = attr_name;
  }
  if let Some(attr_reference) = attributes.remove("reference") {
    reference = attr_reference;
  }
  if let Some(attr_tag) = attributes.remove("tag") {
    tag = attr_tag;
  }

  let filtered = datasets
    .into_iter()
    .filter(|dataset| dataset.enabled)
    .filter(|dataset| -> bool  {
      // If a concrete version `tag` is specified, we skip 'enabled', 'compatibility' and 'latest' checks
      if tag == "latest" {
        let is_not_old = dataset.is_latest();
        let is_compatible = dataset.is_compatible(THIS_VERSION);
        is_compatible && is_not_old
      } else {
        dataset.attributes.tag.value == tag
      }
    })
    // Filter by reference sequence
    .filter(|dataset| {
      if reference == "default" {
        dataset.attributes.reference.is_default
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
              attr.is_default
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
    let attributes_fmt = format_attribute_list(&Some(name), &reference, &tag, &attributes);
    if attributes_fmt.is_empty() {
      "".to_owned()
    } else {
      format!(" having attributes: {attributes_fmt}")
    }
  };

  info!("Searching for datasets{attributes_fmt}");

  match filtered.len() {
    0 => make_error!("No datasets found{attributes_fmt}. Use `datasets list` command to show available datasets."),
    1 => dataset_download(&mut http, &filtered[0], &output_dir),
    _ => {
      let table = format_dataset_table(&filtered);
      make_error!("Can download only a single dataset, but multiple datasets found{attributes_fmt}. Add more specific attributes to select one of them. Given current attributes, the candidates are:\n{table}")
    }
  }
}
