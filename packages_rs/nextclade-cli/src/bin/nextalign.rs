use ctor::ctor;
use eyre::Report;
use nextclade::utils::global_init::global_init;
use nextclade_cli::cli::nextalign_cli::nextalign_handle_cli_args;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  nextalign_handle_cli_args()
}
