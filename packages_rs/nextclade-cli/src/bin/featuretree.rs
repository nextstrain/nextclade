use clap::{AppSettings, Parser, ValueHint};
use ctor::ctor;
use eyre::Report;
use log::LevelFilter;
use nextclade::io::feature_tree::{feature_map_to_string, read_gff3_feature_map};
use nextclade::io::json::{json_stringify, json_write};
use nextclade::utils::global_init::global_init;
use nextclade::utils::global_init::setup_logger;
use std::fmt::Debug;
use std::path::PathBuf;

#[ctor]
fn init() {
  global_init();
}

#[derive(Parser, Debug)]
#[clap(name = "featuremap", trailing_var_arg = true)]
#[clap(author, version)]
#[clap(global_setting(AppSettings::DeriveDisplayOrder))]
#[clap(verbatim_doc_comment)]
pub struct FeaturemapArgs {
  #[clap(value_hint = ValueHint::FilePath)]
  #[clap(hide_long_help = true, hide_short_help = true)]
  pub input_feature_map: PathBuf,
}

fn main() -> Result<(), Report> {
  let args = FeaturemapArgs::parse();
  setup_logger(LevelFilter::Warn);
  let feature_map = read_gff3_feature_map(args.input_feature_map)?;
  println!("{}", feature_map_to_string(&feature_map)?);
  Ok(())
}
