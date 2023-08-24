use crate::cli::nextclade_cli::NextcladeDatasetListArgs;
use crate::dataset::dataset_attributes::{format_attribute_list, parse_dataset_attributes};
use crate::dataset::dataset_download::download_datasets_index_json;
use crate::dataset::dataset_table::format_dataset_table;
use crate::io::http_client::HttpClient;
use eyre::Report;
use itertools::Itertools;
use log::LevelFilter;
use nextclade::getenv;
use nextclade::io::dataset::{Dataset, DatasetsIndexJson};
use nextclade::io::json::{json_stringify, JsonPretty};

const THIS_VERSION: &str = getenv!("CARGO_PKG_VERSION");

pub fn nextclade_dataset_list(
  NextcladeDatasetListArgs {
    mut name,
    mut reference,
    updated_at,
    attribute,
    include_incompatible,
    include_old,
    include_deprecated,
    include_experimental,
    include_community,
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

  let filtered = datasets
    .into_iter()
    .filter(Dataset::is_enabled)
    .filter(|dataset| -> bool  {
      // If a concrete version `tag` is specified, we skip 'enabled', 'compatibility' and 'latest' checks
      if updated_at == "latest" {
        let is_not_old = include_old || dataset.is_latest();
        let is_compatible = include_incompatible || dataset.is_compatible(THIS_VERSION);
        let is_not_deprecated = include_deprecated || !dataset.is_deprecated();
        let is_not_experimental = include_experimental || !dataset.is_experimental();
        let is_not_community = include_community || !dataset.is_community();
        is_compatible && is_not_old && is_not_deprecated && is_not_experimental && is_not_community
      } else {
        dataset.updated_at == updated_at
      }
    })
    // Filter by reference sequence
    .filter(|dataset| {
      if reference == "all" {
        true
      } else if reference == "default" {
        dataset.attributes.reference.is_default()
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
    .sorted_by_key(|dataset| (
      !dataset.attributes.name.is_default(),
      dataset.attributes.name.value.to_ascii_lowercase(),
      !dataset.attributes.reference.is_default(),
      dataset.attributes.reference.value.to_ascii_lowercase(),
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
      let attributes_fmt = format_attribute_list(&name, &reference, &updated_at, &attributes);
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
