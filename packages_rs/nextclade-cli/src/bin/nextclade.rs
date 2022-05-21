use ctor::ctor;
use eyre::Report;
use nextclade::make_internal_error;
use nextclade::utils::global_init::global_init;
use nextclade_cli::cli::nextclade_cli::{nextclade_parse_cli_args, NextcladeCommands, NextcladeDatasetCommands};
use nextclade_cli::cli::nextclade_dataset_get::nextclade_dataset_get;
use nextclade_cli::cli::nextclade_dataset_list::nextclade_dataset_list;
use nextclade_cli::cli::nextclade_loop::nextclade_run;

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
    NextcladeCommands::Run(run_args) => nextclade_run(run_args),
    NextcladeCommands::Dataset(dataset_command) => match dataset_command.command {
      NextcladeDatasetCommands::List(dataset_list_args) => nextclade_dataset_list(dataset_list_args),
      NextcladeDatasetCommands::Get(dataset_get_args) => nextclade_dataset_get(dataset_get_args),
    },
    _ => make_internal_error!("Unhandled CLI subcommand. Subcommand handling must be exhaustive"),
  }
}
