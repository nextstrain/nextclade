use clap::{AppSettings, Parser, ValueHint};
use ctor::ctor;
use eyre::Report;
use log::LevelFilter;
use nextclade::io::gene_map::{gene_map_to_string, GeneMap};
use nextclade::io::json::{json_stringify, json_write};
use nextclade::io::yaml::yaml_write;
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

  /// Path to output file
  #[clap(long, short = 'o')]
  #[clap(value_hint = ValueHint::DirPath)]
  pub output: Option<PathBuf>,

  /// Print output in JSON format
  #[clap(long)]
  pub json: bool,
}

fn main() -> Result<(), Report> {
  let args = GenemapArgs::parse();
  setup_logger(LevelFilter::Warn);
  let gene_map = GeneMap::from_file(args.input_gene_map)?;

  if let Some(output) = args.output {
    if output.to_string_lossy().ends_with("yaml") || output.to_string_lossy().ends_with("yml") {
      yaml_write(output, &gene_map)?;
    } else {
      json_write(output, &gene_map)?;
    }
  }

  if args.json {
    println!("{}\n", json_stringify(&gene_map)?);
  } else {
    println!("{}", gene_map_to_string(&gene_map)?);
  }

  Ok(())
}
