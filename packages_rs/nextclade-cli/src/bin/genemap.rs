use clap::{AppSettings, Parser, ValueHint};
use ctor::ctor;
use eyre::Report;
use log::{info, LevelFilter};
use nextclade::io::gene_map::gene_map_to_string;
use nextclade::io::gff3::read_gff3_file;
use nextclade::utils::global_init::global_init;
use nextclade::utils::global_init::setup_logger;
use std::fmt::Debug;
use std::path::PathBuf;

#[ctor]
fn init() {
  global_init();
}

#[derive(Parser, Debug)]
#[clap(name = "genemap", trailing_var_arg = true)]
#[clap(author, version)]
#[clap(global_setting(AppSettings::DeriveDisplayOrder))]
#[clap(verbatim_doc_comment)]
pub struct GenemapArgs {
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_gene_map: PathBuf,
}

fn main() -> Result<(), Report> {
  let args = GenemapArgs::parse();
  setup_logger(LevelFilter::Warn);
  let gene_map = read_gff3_file(args.input_gene_map)?;
  println!("{}", gene_map_to_string(&gene_map)?);
  Ok(())
}
