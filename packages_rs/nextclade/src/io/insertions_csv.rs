use crate::align::insertions_strip::Insertion;
use crate::io::csv::{CsvStructFileWriter, CsvStructWriter};
use crate::io::nextclade_csv::{format_aa_insertions, format_aa_insertions_from_translations, format_nuc_insertions};
use crate::io::nuc::Nuc;
use crate::translate::translate_genes::CdsTranslation;
use crate::types::outputs::{
  combine_outputs_and_errors_sorted, NextcladeErrorOutputs, NextcladeOutputOrError, NextcladeOutputs,
};
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertionCsvEntry<'a> {
  pub seq_name: &'a str,
  pub insertions: String,
  pub aa_insertions: String,
}

/// Writes insertions.csv file
pub struct InsertionsCsvWriter {
  writer: CsvStructFileWriter,
}

impl InsertionsCsvWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    Ok(Self {
      writer: CsvStructFileWriter::new(filepath.as_ref(), b',')?,
    })
  }

  /// Writes one row into insertions.csv file
  pub fn write(
    &mut self,
    seq_name: &str,
    nuc_insertions: &[Insertion<Nuc>],
    translations: &[CdsTranslation],
  ) -> Result<(), Report> {
    self.writer.write(&InsertionCsvEntry {
      seq_name,
      insertions: format_nuc_insertions(nuc_insertions, ";"),
      aa_insertions: format_aa_insertions_from_translations(translations, ";"),
    })
  }
}

pub fn insertions_to_csv_string(
  outputs: &[NextcladeOutputs],
  errors: &[NextcladeErrorOutputs],
) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    let mut writer = CsvStructWriter::new(&mut buf, b',')?;

    let outputs_or_errors = combine_outputs_and_errors_sorted(outputs, errors);

    for (_, output_or_error) in outputs_or_errors {
      match output_or_error {
        NextcladeOutputOrError::Outputs(output) => {
          writer.write(&InsertionCsvEntry {
            seq_name: &output.seq_name,
            insertions: format_nuc_insertions(&output.insertions, ";"),
            aa_insertions: format_aa_insertions(&output.aa_insertions, ";"),
          })?;
        }
        NextcladeOutputOrError::Error(error) => {
          writer.write(&InsertionCsvEntry {
            seq_name: &error.seq_name,
            insertions: "".to_owned(),
            aa_insertions: "".to_owned(),
          })?;
        }
      }
    }
  }
  Ok(String::from_utf8(buf)?)
}
