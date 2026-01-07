use ctor::ctor;
use eyre::Report;
use nextclade::{
  io::json_schema::JsonSchemaOutputFormat,
  schema::schema::{NextcladeFileFormat, generate_schema},
  utils::global_init::{GlobalInitConfig, global_init},
};
use std::path::PathBuf;

#[ctor]
fn init() {
  global_init(&GlobalInitConfig::default());
}

fn main() -> Result<(), Report> {
  // Tell Cargo to re-run this build script when any source file in the nextclade library changes
  // This ensures schemas are never stale when types are modified. Could be slow.
  println!("cargo:rerun-if-changed=../nextclade/src");

  generate_schema(
    &NextcladeFileFormat::All,
    &JsonSchemaOutputFormat::Json,
    Some(&PathBuf::from("../nextclade-schemas")),
  )?;
  generate_schema(
    &NextcladeFileFormat::All,
    &JsonSchemaOutputFormat::Yaml,
    Some(&PathBuf::from("../nextclade-schemas")),
  )?;
  Ok(())
}
