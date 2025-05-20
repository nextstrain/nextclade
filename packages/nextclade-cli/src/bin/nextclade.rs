use eyre::Report;
use nextclade_cli::cli::nextclade_cli::nextclade_parse_cli_args;

fn main() -> Result<(), Report> {
  nextclade_parse_cli_args()
}
