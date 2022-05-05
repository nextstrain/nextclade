use ctor::ctor;
use eyre::Report;
use nextclade::cli::nextclade_cli::{nextclade_parse_cli_args, NextcladeCommands, NextcladeDatasetCommands};
use nextclade::cli::nextclade_dataset_get::nextclade_dataset_get;
use nextclade::cli::nextclade_dataset_list::nextclade_dataset_list;
use nextclade::cli::nextclade_loop::nextclade_run;
use nextclade::utils::global_init::global_init;

#[cfg(all(target_family = "linux", target_arch = "x86_64"))]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  let args = nextclade_parse_cli_args()?;

  match args.command {
    Some(NextcladeCommands::Run(run_args)) => nextclade_run(run_args),
    Some(NextcladeCommands::Dataset(dataset_command)) => match dataset_command.command {
      Some(NextcladeDatasetCommands::List(dataset_list_args)) => nextclade_dataset_list(dataset_list_args),
      Some(NextcladeDatasetCommands::Get(dataset_get_args)) => nextclade_dataset_get(dataset_get_args),
      _ => Ok(()),
    },
    _ => Ok(()),
  }
}
