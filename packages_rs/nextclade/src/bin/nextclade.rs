use ctor::ctor;
use eyre::Report;
use nextclade::cli::nextclade_cli::{nextclade_parse_cli_args, NextcladeCommands};
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
    Some(NextcladeCommands::Run { 0: run_args }) => nextclade_run(*run_args),
    _ => Ok(()),
  }
}
