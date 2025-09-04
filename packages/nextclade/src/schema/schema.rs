use crate::analyze::virus_properties::VirusProperties;
use crate::io::dataset::{Dataset, DatasetCollection, DatasetListJson, DatasetsIndexJson};
use crate::io::fs::add_extension;
use crate::io::json_schema::{jsonschema_write_file, JsonSchemaOutputFormat};
use crate::io::results_json::ResultsJson;
use crate::make_error;
use crate::sort::minimizer_index::MinimizerIndexJson;
use crate::types::outputs::NextcladeOutputs;
use clap::{Parser, Subcommand, ValueEnum, ValueHint};
use eyre::Report;
use std::fmt::Debug;
use std::path::PathBuf;
use strum::IntoEnumIterator;
use strum_macros::EnumIter;

#[derive(Parser, Debug)]
pub struct NextcladeSchemaArgs {
  #[clap(subcommand)]
  pub command: NextcladeSchemaCommand,
}

#[derive(Subcommand, Debug, Clone)]
pub enum NextcladeSchemaCommand {
  /// Write JSON schema definitions for Nextclade formats
  ///
  /// See: https://json-schema.org
  Write(NextcladeSchemaWriteArgs),
}

#[derive(Parser, Debug, Clone, Default)]
pub struct NextcladeSchemaWriteArgs {
  /// Write JSON schema definitions to this file (--for=<format>) or directory (--for=all).
  ///
  /// Can produce schema file in JSON or YAML format, depending on the file extension provided. Use "-" to write the data in JSON format to standard output.
  ///
  /// Use --as=json or --as=yaml to force a particular output schema format.
  #[clap(short = 'o', long, value_hint = ValueHint::AnyPath)]
  pub output: Option<PathBuf>,

  /// Write JSON schema definitions for this file format
  ///
  /// Use 'all' to output schemas for all formats to a given directory
  #[clap(short = 'f', long = "for", value_enum, default_value_t = NextcladeFileFormat::default())]
  pub for_format: NextcladeFileFormat,

  /// Force output format of the produced schema file(s)
  ///
  /// With the default value 'auto', the format will be deduced based on output file extension
  #[clap(short = 'a', long = "as", value_enum, default_value_t = JsonSchemaOutputFormat::default())]
  pub as_format: JsonSchemaOutputFormat,
}

#[derive(Debug, Clone, Default, ValueEnum, EnumIter)]
pub enum NextcladeFileFormat {
  /// All formats
  #[default]
  All,

  /// "Input pathogen JSON" format (`nextclade run --input-pathogen-json`)
  InputPathogenJson,

  /// "Nextclade output JSON" format (`nextclade run --output-json`)
  OutputJson,

  /// A single entry in "Nextclade output NDJSON" format (`nextclade run --output-ndjson`). Same format as for the entries in "Nextclade output JSON" `.results` array
  OutputNdjson,

  /// A list of datasets produced with `nextclade dataset list --json`
  OutputDatasetListJson,

  /// Index JSON format. This format is used to store a list of known datasets and their properties.
  /// This is how Nextclade knows which datasets are available for a given pathogen (e.g. to display them in the web UI or with `nextclade dataset list` command).
  /// This is an internal format, not meant to be used directly.
  /// Hosted at: http://data.clades.nextstrain.org/v3/index.json
  /// Produced at: https://github.com/nextstrain/nextclade_data
  InternalIndexJson,

  /// Internal dataset collection JSON format. This format is used to store dataset collections in dataset index file.
  /// This is an internal format, not meant to be used directly.
  InternalDatasetCollectionJson,

  /// Internal dataset JSON format. This format is used to store properties of concrete datasets in dataset index file.
  /// This is an internal format, not meant to be used directly.
  InternalDatasetJson,

  /// Minimizer index JSON format. This format is used to store minimizer data which is used for dataset detection from sequences (dataset suggestions in Nextclade Web and `nextclade sort`  command).
  /// This is an internal format, not meant to be used directly.
  /// Hosted at: http://data.clades.nextstrain.org/v3/minimizer_index.json
  /// Produced at: https://github.com/nextstrain/nextclade_data
  InternalMinimizerIndexJson,
}

impl NextcladeFileFormat {
  const fn get_default_filename(&self) -> Option<&'static str> {
    match self {
      NextcladeFileFormat::All => None,
      NextcladeFileFormat::InputPathogenJson => Some("input-pathogen-json.schema"),
      NextcladeFileFormat::OutputJson => Some("output-json.schema"),
      NextcladeFileFormat::OutputNdjson => Some("output-ndjson.schema"),
      NextcladeFileFormat::OutputDatasetListJson => Some("output-dataset-list-json.schema"),
      NextcladeFileFormat::InternalIndexJson => Some("internal-index-json.schema"),
      NextcladeFileFormat::InternalDatasetCollectionJson => Some("internal-dataset-collection-json.schema"),
      NextcladeFileFormat::InternalDatasetJson => Some("internal-dataset-json.schema"),
      NextcladeFileFormat::InternalMinimizerIndexJson => Some("internal-minimizer-index-json.schema"),
    }
  }
}

impl JsonSchemaOutputFormat {
  pub const fn get_extension(&self) -> &'static str {
    match self {
      JsonSchemaOutputFormat::Auto | JsonSchemaOutputFormat::Json => "json",
      JsonSchemaOutputFormat::Yaml => "yaml",
    }
  }
}

pub fn cli_handle_schema(args: &NextcladeSchemaArgs) -> Result<(), Report> {
  match &args.command {
    NextcladeSchemaCommand::Write(args) => generate_schema(&args.for_format, &args.as_format, &args.output)?,
  }
  Ok(())
}

pub fn generate_schema(
  for_format: &NextcladeFileFormat,
  as_format: &JsonSchemaOutputFormat,
  output: &Option<PathBuf>,
) -> Result<(), Report> {
  match &for_format {
    NextcladeFileFormat::All => {
      if let Some(output) = output {
        for fmt in NextcladeFileFormat::iter() {
          let Some(filename) = fmt.get_default_filename() else {
            continue;
          };
          let ext = as_format.get_extension();
          let path = add_extension(output.join(filename), ext);
          generate_schema(&fmt, as_format, &Some(path))?;
        }
      } else {
        return make_error!("Output directory (--output) is required when using --for=all or when --for is omitted");
      }
    }
    NextcladeFileFormat::InputPathogenJson => jsonschema_write_file::<VirusProperties>(output, as_format)?,
    NextcladeFileFormat::OutputJson => jsonschema_write_file::<ResultsJson>(output, as_format)?,
    NextcladeFileFormat::OutputNdjson => jsonschema_write_file::<NextcladeOutputs>(output, as_format)?,
    NextcladeFileFormat::InternalIndexJson => jsonschema_write_file::<DatasetsIndexJson>(output, as_format)?,
    NextcladeFileFormat::InternalDatasetCollectionJson => jsonschema_write_file::<DatasetCollection>(output, as_format)?,
    NextcladeFileFormat::InternalDatasetJson => jsonschema_write_file::<Dataset>(output, as_format)?,
    NextcladeFileFormat::InternalMinimizerIndexJson => jsonschema_write_file::<MinimizerIndexJson>(output, as_format)?,
    NextcladeFileFormat::OutputDatasetListJson => jsonschema_write_file::<DatasetListJson>(output, as_format)?,
  }
  Ok(())
}
