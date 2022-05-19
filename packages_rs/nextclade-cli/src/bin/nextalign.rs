use ctor::ctor;
use eyre::Report;
use nextclade::utils::global_init::global_init;
use nextclade_cli::cli::nextalign_cli::{nextalign_parse_cli_args, NextalignCommands};
use nextclade_cli::cli::nextalign_loop::nextalign_run;

#[cfg(all(target_family = "linux", target_arch = "x86_64"))]
#[global_allocator]
static GLOBAL: mimalloc::MiMalloc = mimalloc::MiMalloc;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  let args = nextalign_parse_cli_args()?;

  match args.command {
    Some(NextalignCommands::Run { 0: run_args }) => nextalign_run(*run_args),
    _ => Ok(()),
  }
}
