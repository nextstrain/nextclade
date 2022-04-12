use crate::align::insertions_strip::{AaIns, Insertion};
use crate::io::aa::{from_aa_seq, Aa};
use crate::io::csv::CsvStructWriter;
use crate::io::nextclade_csv::{format_aa_insertions, format_nuc_insertions};
use crate::io::nuc::{from_nuc_seq, Nuc};
use crate::translate::translate_genes::Translation;
use eyre::Report;
use itertools::Itertools;
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
  writer: CsvStructWriter,
}

impl InsertionsCsvWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    Ok(Self {
      writer: CsvStructWriter::new(filepath.as_ref(), b',')?,
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
      insertions: format_nuc_insertions(&nuc_insertions, ";"),
      aa_insertions: format_aa_insertions(translations, ";"),
    })
  }
}
