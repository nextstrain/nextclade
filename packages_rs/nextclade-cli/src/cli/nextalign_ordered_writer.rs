use crate::cli::nextalign_loop::{NextalignOutputs, NextalignRecord};
use crate::gene::gene_map::GeneMap;
use crate::io::errors_csv::ErrorsCsvWriter;
use crate::io::fasta::{FastaPeptideWriter, FastaRecord, FastaWriter};
use crate::io::insertions_csv::InsertionsCsvWriter;
use crate::io::nuc::from_nuc_seq;
use crate::translate::translate_genes::TranslationMap;
use crate::utils::error::report_to_string;
use eyre::{Report, WrapErr};
use log::warn;
use std::collections::HashMap;
use std::path::Path;

/// Writes output files, potentially preserving the initial order of records (same as in the inputs)
pub struct NextalignOrderedWriter<'a> {
  fasta_writer: FastaWriter,
  fasta_peptide_writer: FastaPeptideWriter,
  insertions_csv_writer: InsertionsCsvWriter,
  errors_csv_writer: ErrorsCsvWriter<'a>,
  expected_index: usize,
  queue: HashMap<usize, NextalignRecord>,
  in_order: bool,
}

impl<'a> NextalignOrderedWriter<'a> {
  pub fn new(
    gene_map: &'a GeneMap,
    output_fasta: &Path,
    output_insertions: &Path,
    output_errors: &Path,
    output_dir: &Path,
    output_basename: &str,
    in_order: bool,
  ) -> Result<Self, Report> {
    let fasta_writer = FastaWriter::from_path(&output_fasta)?;
    let fasta_peptide_writer = FastaPeptideWriter::new(gene_map, &output_dir, &output_basename)?;
    let insertions_csv_writer = InsertionsCsvWriter::new(&output_insertions)?;
    let errors_csv_writer = ErrorsCsvWriter::new(gene_map, &output_errors)?;
    Ok(Self {
      fasta_writer,
      fasta_peptide_writer,
      insertions_csv_writer,
      errors_csv_writer,
      expected_index: 0,
      queue: HashMap::<usize, NextalignRecord>::new(),
      in_order,
    })
  }

  pub fn write_ref(&mut self, ref_record: &FastaRecord, ref_peptides: &TranslationMap) -> Result<(), Report> {
    let FastaRecord { seq_name, seq, .. } = &ref_record;

    self.fasta_writer.write(seq_name, seq)?;

    ref_peptides
      .iter()
      .try_for_each(|(_, peptide)| self.fasta_peptide_writer.write(seq_name, peptide))
  }

  /// Writes output record into output files
  fn write_impl(&mut self, record: &NextalignRecord) -> Result<(), Report> {
    let NextalignRecord {
      index,
      seq_name,
      outputs_or_err,
    } = record;

    match outputs_or_err {
      Ok(output) => {
        let NextalignOutputs {
          stripped,
          alignment,
          translations,
          warnings,
          missing_genes,
        } = output;

        self.fasta_writer.write(seq_name, &from_nuc_seq(&stripped.qry_seq))?;

        for translation in translations {
          self.fasta_peptide_writer.write(seq_name, translation)?;
        }

        self
          .insertions_csv_writer
          .write(seq_name, &stripped.insertions, translations)?;

        self
          .errors_csv_writer
          .write_aa_errors(seq_name, warnings, missing_genes)?;
      }
      Err(report) => {
        let cause = report_to_string(report);
        let message = format!(
          "In sequence #{index} '{seq_name}': {cause}. Note that this sequence will not be included in the results."
        );
        warn!("{message}");
        self.errors_csv_writer.write_nuc_error(seq_name, &message)?;
      }
    }

    Ok(())
  }

  /// In in-order mode, writes all queued records with indices subsequent to the next expected index.
  /// On out-of-order mode, does nothing - the queue is always empty.
  fn write_queued_records(&mut self) -> Result<(), Report> {
    while let Some(record) = self.queue.remove(&self.expected_index) {
      self.write_impl(&record)?;
      self.expected_index += 1;
    }
    Ok(())
  }

  /// Writes a record.
  ///
  /// In in-order mode, if one or more of the preceding records has not been written yet (according to the record index
  /// derived from order of records in the input files) then the current record is queued to be written at a later time.
  /// This ensures that the records in output files are in the same order as in the input files.
  ///
  /// In out-of-order mode, records are written as they come from worker threads. In this case the order in output files
  /// is not defined (due to differences in processing times between items, and thread scheduling between runs)
  pub fn write_record(&mut self, record: NextalignRecord) -> Result<(), Report> {
    if !self.in_order {
      // Out-of-order mode: write immediately
      self.write_impl(&record)?;
    } else {
      // In-order mode: check if the record has next expected index
      if record.index == self.expected_index {
        // If the record has next expected index, write it immediately
        self.write_impl(&record)?;
        self.expected_index += 1;
      } else {
        // If the record has an unexpected index, queue it to write later
        self.queue.insert(record.index, record);
      }

      // Periodically try to write the queued records
      self.write_queued_records()?;
    }
    Ok(())
  }

  /// Finalizes output by writing all queued records
  pub fn finish(&mut self) -> Result<(), Report> {
    self.write_queued_records()
  }
}

impl<'a> Drop for NextalignOrderedWriter<'a> {
  fn drop(&mut self) {
    self.finish().wrap_err("When finalizing output writer").unwrap();
  }
}
