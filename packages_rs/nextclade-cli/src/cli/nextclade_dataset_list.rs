use crate::cli::nextclade_cli::NextcladeDatasetListArgs;
use crate::dataset::dataset_attributes::{format_attribute_list, parse_dataset_attributes};
use crate::dataset::dataset_download::download_datasets_index_json;
use crate::dataset::dataset_table::format_dataset_table;
use crate::io::http_client::HttpClient;
use eyre::Report;
use itertools::Itertools;
use log::LevelFilter;
use nextclade::getenv;
use nextclade::io::dataset::DatasetsIndexJson;
use nextclade::io::json::{json_stringify, JsonPretty};

const THIS_VERSION: &str = getenv!("CARGO_PKG_VERSION");

pub fn nextclade_dataset_list(
  NextcladeDatasetListArgs {
    mut name,
    mut reference,
    mut tag,
    attribute,
    include_incompatible,
    include_old,
    json,
    server,
    proxy_config,
  }: NextcladeDatasetListArgs,
) -> Result<(), Report> {
  let verbose = log::max_level() > LevelFilter::Info;
  let mut http = HttpClient::new(&server, &proxy_config, verbose)?;
  let DatasetsIndexJson { datasets, .. } = download_datasets_index_json(&mut http)?;

  // Parse attribute key-value pairs
  let mut attributes = parse_dataset_attributes(&attribute)?;

  // Handle special attributes differently
  if let Some(attr_name) = attributes.remove("name") {
    name = Some(attr_name);
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
        let is_not_old = include_old || dataset.is_latest();
        let is_compatible = include_incompatible || dataset.is_compatible(THIS_VERSION);
        is_compatible && is_not_old
      } else {
        dataset.attributes.tag.value == tag
      }
    })
    // Filter by reference sequence
    .filter(|dataset| {
      if reference == "all" {
        true
      } else if reference == "default" {
        dataset.attributes.reference.is_default
      } else {
        dataset.attributes.reference.value == reference
      }
    })
    // Filter by name
    .filter(|dataset| {
      if let Some(name) = &name { &dataset.attributes.name.value == name } else {true}
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
    .sorted_by_key(|dataset| (
      !dataset.attributes.name.is_default,
      dataset.attributes.name.value.to_ascii_lowercase(),
      !dataset.attributes.reference.is_default,
      dataset.attributes.reference.value.to_ascii_lowercase(),
      !dataset.attributes.tag.is_default,
      dataset.attributes.tag.value.to_ascii_lowercase(),
    ))
    .collect_vec();

  if json {
    println!("{}", json_stringify(&filtered, JsonPretty(true))?);
  } else {
    if filtered.is_empty() {
      return Ok(());
    }

    let table = format_dataset_table(&filtered);

    let attributes_fmt = {
      let attributes_fmt = format_attribute_list(&name, &reference, &tag, &attributes);
      if attributes_fmt.is_empty() {
        "".to_owned()
      } else {
        format!(", having attributes: {attributes_fmt}")
      }
    };

    if !include_incompatible && !include_old {
      println!("Showing latest dataset(s) compatible with this version of Nextclade ({THIS_VERSION}){attributes_fmt}:\n{table}");
    } else if !include_incompatible {
      println!("Showing latest dataset(s){attributes_fmt}:\n{table}");
    } else if !include_old {
      println!("Showing datasets compatible with this version of Nextclade ({THIS_VERSION}){attributes_fmt}:\n{table}");
    } else {
      println!("Showing all datasets{attributes_fmt}:\n{table}");
    }
  }

  Ok(())
}
