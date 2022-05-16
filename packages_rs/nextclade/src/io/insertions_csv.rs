use crate::align::insertions_strip::Insertion;
use crate::io::csv::CsvStructFileWriter;
use crate::io::nextclade_csv::{format_aa_insertions_from_translations, format_nuc_insertions};
use crate::io::nuc::Nuc;
use crate::translate::translate_genes::Translation;
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
    translations: &[Translation],
  ) -> Result<(), Report> {
    self.writer.write(&InsertionCsvEntry {
      seq_name,
      insertions: format_nuc_insertions(nuc_insertions, ";"),
      aa_insertions: format_aa_insertions_from_translations(translations, ";"),
    })
  }
}
