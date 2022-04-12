use crate::cli::nextalign_loop::NextalignOutputs;
use crate::cli::nextclade_loop::{NextcladeOutputs, NextcladeRecord};
use crate::gene::gene_map::GeneMap;
use crate::io::errors_csv::ErrorsCsvWriter;
use crate::io::fasta::{FastaPeptideWriter, FastaRecord, FastaWriter};
use crate::io::insertions_csv::InsertionsCsvWriter;
use crate::io::ndjson::NdjsonWriter;
use crate::io::nextclade_csv::NextcladeResultsCsvWriter;
use crate::io::nuc::from_nuc_seq;
use crate::io::results_json::ResultsJsonWriter;
use crate::translate::translate_genes::TranslationMap;
use crate::tree::tree::CladeNodeAttrKeyDesc;
use crate::utils::error::report_to_string;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::warn;
use std::collections::HashMap;
use std::path::Path;

/// Writes output files, potentially preserving the initial order of records (same as in the inputs)
pub struct NextcladeOrderedWriter<'a> {
  fasta_writer: FastaWriter,
  fasta_peptide_writer: FastaPeptideWriter,
  output_json_writer: ResultsJsonWriter,
  output_ndjson_writer: NdjsonWriter,
  output_csv_writer: NextcladeResultsCsvWriter,
  output_tsv_writer: NextcladeResultsCsvWriter,
  insertions_csv_writer: InsertionsCsvWriter,
  errors_csv_writer: ErrorsCsvWriter<'a>,
  expected_index: usize,
  queue: HashMap<usize, NextcladeRecord>,
  in_order: bool,
}

impl<'a> NextcladeOrderedWriter<'a> {
  pub fn new(
    gene_map: &'a GeneMap,
    clade_node_attr_key_descs: &[CladeNodeAttrKeyDesc],
    output_fasta: &Path,
    output_json: &Path,
    output_ndjson: &Path,
    output_csv: &Path,
    output_tsv: &Path,
    output_insertions: &Path,
    output_errors: &Path,
    output_dir: &Path,
    output_basename: &str,
    in_order: bool,
  ) -> Result<Self, Report> {
    let fasta_writer = FastaWriter::from_path(&output_fasta)?;
    let fasta_peptide_writer = FastaPeptideWriter::new(gene_map, &output_dir, &output_basename)?;
    let output_json_writer = ResultsJsonWriter::new(&output_json, clade_node_attr_key_descs)?;
    let output_ndjson_writer = NdjsonWriter::new(&output_ndjson)?;

    let clade_node_attr_keys = clade_node_attr_key_descs
      .iter()
      .map(|desc| desc.name.clone())
      .collect_vec();
    let output_csv_writer = NextcladeResultsCsvWriter::new(&output_csv, b';', &clade_node_attr_keys)?;
    let output_tsv_writer = NextcladeResultsCsvWriter::new(&output_tsv, b'\t', &clade_node_attr_keys)?;

    let insertions_csv_writer = InsertionsCsvWriter::new(&output_insertions)?;
    let errors_csv_writer = ErrorsCsvWriter::new(gene_map, &output_errors)?;
    Ok(Self {
      fasta_writer,
      fasta_peptide_writer,
      output_json_writer,
      output_ndjson_writer,
      output_csv_writer,
      output_tsv_writer,
      insertions_csv_writer,
      errors_csv_writer,
      expected_index: 0,
      queue: HashMap::<usize, NextcladeRecord>::new(),
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
  fn write_impl(&mut self, record: NextcladeRecord) -> Result<(), Report> {
    let NextcladeRecord {
      index,
      seq_name,
      outputs_or_err,
    } = record;

    match outputs_or_err {
      Ok((qry_seq_stripped, translations, nextclade_outputs)) => {
        self.fasta_writer.write(&seq_name, &from_nuc_seq(&qry_seq_stripped))?;

        self.output_csv_writer.write(&translations, &nextclade_outputs)?;

        self.output_tsv_writer.write(&translations, &nextclade_outputs)?;

        self.output_ndjson_writer.write(&nextclade_outputs)?;

        for translation in &translations {
          self.fasta_peptide_writer.write(&seq_name, translation)?;
        }

        self
          .insertions_csv_writer
          .write(&seq_name, &nextclade_outputs.insertions, &translations)?;

        self.errors_csv_writer.write_aa_errors(
          &seq_name,
          &nextclade_outputs.warnings,
          &nextclade_outputs.missing_genes,
        )?;

        self.output_json_writer.write(nextclade_outputs);
      }
      Err(report) => {
        let cause = report_to_string(&report);
        let message = format!(
          "In sequence #{index} '{seq_name}': {cause}. Note that this sequence will not be included in the results."
        );
        warn!("{message}");
        self.errors_csv_writer.write_nuc_error(&seq_name, &message)?;
      }
    }

    Ok(())
  }

  /// In in-order mode, writes all queued records with indices subsequent to the next expected index.
  /// On out-of-order mode, does nothing - the queue is always empty.
  fn write_queued_records(&mut self) -> Result<(), Report> {
    while let Some(record) = self.queue.remove(&self.expected_index) {
      self.write_impl(record)?;
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
  pub fn write_record(&mut self, record: NextcladeRecord) -> Result<(), Report> {
    if !self.in_order {
      // Out-of-order mode: write immediately
      self.write_impl(record)?;
    } else {
      // In-order mode: check if the record has next expected index
      if record.index == self.expected_index {
        // If the record has next expected index, write it immediately
        self.write_impl(record)?;
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
    self.write_queued_records()?;
    self.output_json_writer.finish()
  }
}

impl<'a> Drop for NextcladeOrderedWriter<'a> {
  fn drop(&mut self) {
    self.finish().wrap_err("When finalizing output writer").unwrap();
  }
}
