use crate::cli::nextclade_cli::NextcladeDatasetGetArgs;
use eyre::Report;

pub fn nextclade_dataset_get(
  NextcladeDatasetGetArgs {
    name,
    reference,
    tag,
    attribute,
    server,
    output_dir,
    proxy_config,
  }: NextcladeDatasetGetArgs,
) -> Result<(), Report> {
  Ok(())
}
