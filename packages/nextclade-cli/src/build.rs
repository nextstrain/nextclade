use ctor::ctor;
use eyre::Report;
use nextclade::{
  io::json_schema::JsonSchemaOutputFormat,
  schema::schema::{generate_schema, NextcladeFileFormat},
  utils::global_init::{global_init, GlobalInitConfig},
};
use std::path::PathBuf;

#[ctor]
fn init() {
  global_init(&GlobalInitConfig::default());
}

fn main() -> Result<(), Report> {
  generate_schema(
    &NextcladeFileFormat::All,
    &JsonSchemaOutputFormat::Json,
    &Some(PathBuf::from("../nextclade-schemas")),
  )?;
  generate_schema(
    &NextcladeFileFormat::All,
    &JsonSchemaOutputFormat::Yaml,
    &Some(PathBuf::from("../nextclade-schemas")),
  )?;
  Ok(())
}
