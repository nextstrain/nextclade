use crate::gene::gene_map::GeneMap;
use crate::io::csv::CsvWriter;
use crate::translate::translate_genes::Translation;
use crate::utils::error::report_to_string;
use eyre::Report;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Formats list of warnings during gene translation
///
/// Example:
///   When processing gene "N": The gene consists entirely from gaps.;When processing gene "ORF1a": Unable to align:
///   too many insertions, deletions, duplications, or ambiguous seed matches.
pub fn format_aa_warnings(maybe_translations: &[Result<Translation, Report>]) -> String {
  maybe_translations
    .iter()
    .filter_map(|tr| match tr {
      Err(report) => Some(report_to_string(report)),
      Ok(_) => None,
    })
    .join(";")
}

/// Formats list of genes that are failed to be processed
///
/// Example:
///   N;ORF1a
pub fn format_aa_failed_genes(maybe_translations: &[Result<Translation, Report>], gene_map: &GeneMap) -> String {
  let genes_present = maybe_translations
    .iter()
    .filter_map(|tr| match tr {
      Err(_) => None, // Skip genes with errors
      Ok(Translation { gene_name, .. }) => Some(gene_name),
    })
    .collect_vec();

  gene_map
    .iter()
    .filter_map(|(gene_name, _)| (!genes_present.contains(&gene_name)).then(|| gene_name))
    .join(";")
}

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
  writer: CsvWriter,
}

impl<'a> ErrorsCsvWriter<'a> {
  pub fn new(gene_map: &'a GeneMap, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    Ok(Self {
      gene_map,
      writer: CsvWriter::new(filepath.as_ref())?,
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
    maybe_translations: &[Result<Translation, Report>],
  ) -> Result<(), Report> {
    let warnings = &format_aa_warnings(maybe_translations);
    let failed_genes = &format_aa_failed_genes(maybe_translations, self.gene_map);
    self.writer.write(&ErrorCsvEntry {
      seq_name,
      errors: "",
      warnings,
      failed_genes,
    })
  }
}
