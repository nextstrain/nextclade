use crate::cli::nextclade_cli::NextcladeArgs;
use eyre::Report;

pub fn print_help_markdown() -> Result<(), Report> {
  println!("{}", clap_markdown::help_markdown::<NextcladeArgs>());
  Ok(())
}
