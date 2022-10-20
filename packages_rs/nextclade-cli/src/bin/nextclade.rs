use ctor::ctor;
use eyre::Report;
use nextclade::utils::global_init::global_init;
use nextclade_cli::cli::nextclade_cli::nextclade_parse_cli_args;

#[ctor]
fn init() {
  global_init();
}

fn main() -> Result<(), Report> {
  nextclade_parse_cli_args()
}
