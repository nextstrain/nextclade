use eyre::Report;
use nextclade_cli::cli::nextclade_cli::nextclade_parse_cli_args;
use nextclade_cli::cli::stdout::ignore_stdout_closed;

fn main() -> Result<(), Report> {
  ignore_stdout_closed(nextclade_parse_cli_args())
}
