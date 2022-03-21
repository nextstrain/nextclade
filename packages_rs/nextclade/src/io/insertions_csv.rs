use crate::align::strip_insertions::Insertion;
use crate::io::aa::{from_aa_seq, Aa};
use crate::io::csv_writer::CsvWriter;
use crate::io::nuc::{from_nuc_seq, Nuc};
use crate::translate::translate_genes::Translation;
use eyre::Report;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::path::Path;

/// Formats nucleotide insertions for usage in a CSV file
///
/// Example:
///   21604:CAAGGTTGT;21618:TA;21751:CAGTAT;21979:ATGTACACAG;22312:ATG;22519:ACTT
pub fn format_nuc_insertions_for_csv(nuc_insertions: &[Insertion<Nuc>]) -> String {
  nuc_insertions
    .iter()
    .map(|Insertion { pos, ins }| {
      let ins_str = from_nuc_seq(ins);
      let pos_one_based = pos + 1;
      format!("{pos_one_based}:{ins_str}")
    })
    .join(";")
}

/// Formats aminoacid insertions for usage in a CSV file
///
/// Example:
///   N:170:KMKDLSPRWY;S:14:QG;S:58:NSTLTQY
pub fn format_aa_insertions_for_csv(maybe_translations: &[Result<Translation, Report>]) -> String {
  maybe_translations
    .iter()
    .filter_map(|tr| match tr {
      Err(_) => None, // Skip genes with errors
      Ok(Translation {
        gene_name, insertions, ..
      }) => Some(
        insertions
          .iter()
          .map(|Insertion::<Aa> { ins, pos }| {
            let ins_str = from_aa_seq(ins);
            let pos_one_based = pos + 1;
            format!("{gene_name}:{pos_one_based}:{ins_str}")
          })
          .join(";"),
      ),
    })
    .filter(|s| !s.is_empty())
    .join(";")
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InsertionCsvEntry<'a> {
  pub seq_name: &'a str,
  pub insertions: String,
  pub aa_insertions: String,
}

/// Writes insertions.csv file
pub struct InsertionsCsvWriter {
  writer: CsvWriter,
}

impl InsertionsCsvWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    Ok(Self {
      writer: CsvWriter::new(filepath.as_ref())?,
    })
  }

  /// Writes one row into insertions.csv file
  pub fn write(
    &mut self,
    seq_name: &str,
    nuc_insertions: &[Insertion<Nuc>],
    maybe_translations: &[Result<Translation, Report>],
  ) -> Result<(), Report> {
    self.writer.write(&InsertionCsvEntry {
      seq_name,
      insertions: format_nuc_insertions_for_csv(nuc_insertions),
      aa_insertions: format_aa_insertions_for_csv(maybe_translations),
    })
  }
}
