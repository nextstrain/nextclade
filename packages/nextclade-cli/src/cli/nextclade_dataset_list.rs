use crate::cli::nextclade_cli::NextcladeDatasetListArgs;
use crate::dataset::dataset_download::download_datasets_index_json;
use crate::dataset::dataset_table::format_dataset_table;
use crate::io::http_client::HttpClient;
use eyre::Report;
use itertools::Itertools;
use log::LevelFilter;
use nextclade::io::dataset::DatasetsIndexJson;
use nextclade::io::json::{json_stringify, JsonPretty};
use nextclade::utils::info::this_package_version;

pub fn nextclade_dataset_list(
  NextcladeDatasetListArgs {
    name,
    search,
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
    .filter(|dataset| -> bool {
      if let Some(tag) = tag.as_ref() {
        dataset.is_tag(tag)
      } else {
        let is_compatible = include_incompatible || dataset.is_cli_compatible(this_package_version());
        let is_not_deprecated = include_deprecated || !dataset.deprecated();
        let is_not_experimental = !no_experimental || !dataset.experimental();
        let is_not_community = !no_community || dataset.official();
        is_compatible && is_not_deprecated && is_not_experimental && is_not_community
      }
    })
    .filter(|dataset| {
      if let Some(name) = &name {
        name == &dataset.path || dataset.shortcuts.contains(name)
      } else {
        true
      }
    })
    .filter(|dataset| {
      if let Some(search) = &search {
        dataset.search_strings().any(|candidate| candidate.contains(search))
      } else {
        true
      }
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
