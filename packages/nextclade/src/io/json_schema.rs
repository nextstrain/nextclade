use crate::io::json::{json_or_yaml_write, json_write, JsonPretty};
use crate::io::yaml::yaml_write;
use clap::ValueEnum;
use eyre::Report;
use log::info;
use schemars::{gen::SchemaSettings, JsonSchema};
use std::path::Path;
use strum_macros::EnumIter;

/// Write JSON Schema derived from type T into a file
pub fn jsonschema_write_file<T: JsonSchema>(
  output_file: &Option<impl AsRef<Path>>,
  format: &JsonSchemaOutputFormat,
) -> Result<(), Report> {
  let settings = SchemaSettings::draft07();
  let gen = settings.into_generator();
  let schema = gen.into_root_schema_for::<T>();

  let title = schema
    .schema
    .metadata
    .clone()
    .unwrap_or_default()
    .title
    .unwrap_or_default();

  let output_file = output_file.as_ref().map_or_else(|| Path::new("-"), AsRef::as_ref);

  info!("Writing JSON schema for '{:?}' to {:?}", title, output_file);

  match &format {
    JsonSchemaOutputFormat::Auto => json_or_yaml_write(output_file, &schema),
    JsonSchemaOutputFormat::Json => json_write(output_file, &schema, JsonPretty(true)),
    JsonSchemaOutputFormat::Yaml => yaml_write(output_file, &schema),
  }
}

#[derive(Debug, Clone, Default, ValueEnum, EnumIter)]
pub enum JsonSchemaOutputFormat {
  #[default]
  Auto,
  Json,
  Yaml,
}
