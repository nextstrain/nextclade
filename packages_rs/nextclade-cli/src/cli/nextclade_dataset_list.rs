use crate::cli::nextclade_cli::NextcladeDatasetListArgs;
use crate::dataset::dataset_download::download_datasets_index_json;
use crate::dataset::dataset_table::format_dataset_table;
use crate::io::http_client::HttpClient;
use eyre::Report;
use itertools::Itertools;
use log::LevelFilter;
use nextclade::io::dataset::{Dataset, DatasetsIndexJson};
use nextclade::io::json::{json_stringify, JsonPretty};
use nextclade::utils::info::this_package_version;

pub fn nextclade_dataset_list(
  NextcladeDatasetListArgs {
    name,
    tag,
    include_incompatible,
    include_deprecated,
    no_experimental,
    no_community,
    json,
    only_names,
    server,
    proxy_config,
    ..
  }: NextcladeDatasetListArgs,
) -> Result<(), Report> {
  let verbose = log::max_level() > LevelFilter::Info;

  let mut http = HttpClient::new(&server, &proxy_config, verbose)?;
  let DatasetsIndexJson { collections, .. } = download_datasets_index_json(&mut http)?;

  let filtered = collections
    .into_iter()
    .flat_map(|collection| collection.datasets)
    .filter(Dataset::is_enabled)
    .filter(|dataset| -> bool  {
      // If a concrete version `tag` is specified, we skip 'enabled', 'compatibility' and 'latest' checks
      if let Some(tag) = tag.as_ref() {
        dataset.is_tag(tag)
      } else {
        let is_compatible = include_incompatible || dataset.is_cli_compatible(this_package_version());
        let is_not_deprecated = include_deprecated || !dataset.is_deprecated();
        let is_not_experimental = !no_experimental || !dataset.is_experimental();
        let is_not_community = !no_community || !dataset.is_community();
        is_compatible && is_not_deprecated && is_not_experimental && is_not_community
      }
    })
    // Filter by name
    .filter(|dataset| {
      if let Some(name) = &name { &dataset.attributes.name.value == name } else {true}
    })
    .collect_vec();

  let names = filtered.iter().map(|dataset| &dataset.path).collect_vec();

  if json {
    let content = if only_names {
      json_stringify(&names, JsonPretty(true))
    } else {
      json_stringify(&filtered, JsonPretty(true))
    }?;
    println!("{content}");
  } else {
    if filtered.is_empty() {
      return Ok(());
    }

    let content = if only_names {
      names.into_iter().join("\n")
    } else {
      format_dataset_table(&filtered)
    };

    println!("{content}");
  }

  Ok(())
}
