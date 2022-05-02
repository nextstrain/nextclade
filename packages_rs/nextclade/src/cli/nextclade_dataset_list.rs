use crate::cli::nextclade_cli::NextcladeDatasetListArgs;
use crate::dataset::dataset::{Dataset, DatasetAttributes, DatasetsIndexJson};
use crate::dataset::dataset_table::format_dataset_table;
use crate::getenv;
use crate::io::http_client::HttpClient;
use crate::io::json::json_stringify;
use eyre::Report;
use itertools::Itertools;
use log::LevelFilter;

pub fn nextclade_dataset_list(
  NextcladeDatasetListArgs {
    name,
    reference,
    tag,
    include_incompatible,
    include_old,
    json,
    server,
    proxy_config,
  }: NextcladeDatasetListArgs,
) -> Result<(), Report> {
  let this_version = getenv!("CARGO_PKG_VERSION");
  let verbose = log::max_level() > LevelFilter::Info;
  let mut http = HttpClient::new(server, proxy_config, verbose)?;
  let DatasetsIndexJson { datasets, .. } = DatasetsIndexJson::download(&mut http)?;

  let filtered = datasets
    .into_iter()
    .filter(|dataset| dataset.enabled)
    .filter(|dataset| -> bool  {
      // If a concrete version `tag` is specified, we skip 'enabled', 'compatibility' and 'latest' checks
      if tag == "latest" {
        let is_not_old = include_old || dataset.is_latest();
        let is_compatible = include_incompatible || dataset.is_compatible(this_version);
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
      if let Some(name) = &name { &dataset.attributes.name.value == name } else {true}
    }).collect_vec();

  if json {
    println!("{}", json_stringify(&filtered)?);
  } else {
    if filtered.is_empty() {
      println!("Nothing found");
      return Ok(());
    }

    let table = format_dataset_table(&filtered);

    if include_incompatible && include_old {
      println!("Showing latest dataset(s) compatible with this version of Nextclade ({this_version}):\n{table}");
    } else if !include_incompatible {
      println!("Showing latest dataset(s):\n{table}");
    } else if !include_old {
      println!("Showing datasets compatible with this version of Nextclade ({this_version}):\n{table}");
    } else {
      println!("Showing all datasets:\n{table}");
    }
    println!("Asterisk (*) marks default values");
  }

  Ok(())
}
