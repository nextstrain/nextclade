use crate::gene::gene_map::GeneMap;
use crate::io::csv::CsvStructFileWriter;
use crate::io::nextclade_csv::{format_aa_warnings, format_failed_genes};
use crate::translate::translate_genes::Translation;
use crate::types::outputs::PeptideWarning;
use crate::utils::error::report_to_string;
use eyre::Report;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorCsvEntry<'a, 'b> {
  pub seq_name: &'a str,
  pub errors: &'a str,
  pub warnings: &'b str,
  pub failed_genes: &'b str,
}

/// Writes errors.csv file
pub struct ErrorsCsvWriter<'a> {
  gene_map: &'a GeneMap,
  writer: CsvStructFileWriter,
}

impl<'a> ErrorsCsvWriter<'a> {
  pub fn new(gene_map: &'a GeneMap, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    Ok(Self {
      gene_map,
      writer: CsvStructFileWriter::new(filepath.as_ref(), b',')?,
    })
  }

  /// Writes one row into errors.csv file for the case of nuc alignment error
  pub fn write_nuc_error(&mut self, seq_name: &str, message: &str) -> Result<(), Report> {
    self.writer.write(&ErrorCsvEntry {
      seq_name,
      errors: message,
      warnings: "",
      failed_genes: "",
    })
  }

  /// Writes one row into errors.csv file for the case of aa alignment errors
  pub fn write_aa_errors(
    &mut self,
    seq_name: &str,
    warnings: &[PeptideWarning],
    failed_genes: &[String],
  ) -> Result<(), Report> {
    let warnings = &warnings.iter().map(|PeptideWarning { warning, .. }| warning).join(";");
    let failed_genes = &format_failed_genes(failed_genes, ";");
    self.writer.write(&ErrorCsvEntry {
      seq_name,
      errors: "",
      warnings,
      failed_genes,
    })
  }
}
