use crate::cli::nextalign_loop::NextalignRecord;
use eyre::{Report, WrapErr};
use log::warn;
use nextclade::io::errors_csv::ErrorsCsvWriter;
use nextclade::io::fasta::{FastaPeptideWriter, FastaRecord, FastaWriter};
use nextclade::io::gene_map::GeneMap;
use nextclade::io::insertions_csv::InsertionsCsvWriter;
use nextclade::io::nuc::from_nuc_seq;
use nextclade::translate::translate_genes::Translation;
use nextclade::types::outputs::NextalignOutputs;
use nextclade::utils::error::report_to_string;
use nextclade::utils::option::OptionMapRefFallible;
use std::collections::HashMap;
use std::path::PathBuf;

/// Writes output files, potentially preserving the initial order of records (same as in the inputs)
pub struct NextalignOrderedWriter<'a> {
  fasta_writer: Option<FastaWriter>,
  fasta_peptide_writer: Option<FastaPeptideWriter>,
  insertions_csv_writer: Option<InsertionsCsvWriter>,
  errors_csv_writer: Option<ErrorsCsvWriter<'a>>,
  expected_index: usize,
  queue: HashMap<usize, NextalignRecord>,
  in_order: bool,
}

impl<'a> NextalignOrderedWriter<'a> {
  pub fn new(
    gene_map: &'a GeneMap,
    output_fasta: &Option<PathBuf>,
    output_translations: &Option<String>,
    output_insertions: &Option<PathBuf>,
    output_errors: &Option<PathBuf>,
    in_order: bool,
  ) -> Result<Self, Report> {
    let fasta_writer = output_fasta.map_ref_fallible(FastaWriter::from_path)?;

    let fasta_peptide_writer = output_translations
      .map_ref_fallible(|output_translations| FastaPeptideWriter::new(gene_map, output_translations))?;

    let insertions_csv_writer = output_insertions.map_ref_fallible(InsertionsCsvWriter::new)?;

    let errors_csv_writer =
      output_errors.map_ref_fallible(|output_errors| ErrorsCsvWriter::new(gene_map, output_errors))?;

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

  pub fn write_ref(&mut self, ref_record: &FastaRecord, ref_translation: &Translation) -> Result<(), Report> {
    let FastaRecord { seq_name, seq, .. } = &ref_record;

    if let Some(fasta_writer) = &mut self.fasta_writer {
      fasta_writer.write(seq_name, seq, false)?;
    }

    ref_translation.cdses().try_for_each(|cds_tr| {
      if let Some(fasta_peptide_writer) = &mut self.fasta_peptide_writer {
        fasta_peptide_writer.write(seq_name, cds_tr)?;
      }
      Result::<(), Report>::Ok(())
    })?;

    Ok(())
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
          translation,
          aa_insertions,
          warnings,
          missing_genes,
          is_reverse_complement,
          ..
        } = output;

        if let Some(fasta_writer) = &mut self.fasta_writer {
          fasta_writer.write(seq_name, &from_nuc_seq(&stripped.qry_seq), *is_reverse_complement)?;
        }

        if let Some(fasta_peptide_writer) = &mut self.fasta_peptide_writer {
          for translation in translation.cdses() {
            fasta_peptide_writer.write(seq_name, translation)?;
          }
        }

        if let Some(insertions_csv_writer) = &mut self.insertions_csv_writer {
          insertions_csv_writer.write(seq_name, &stripped.insertions, aa_insertions)?;
        }

        for warning in warnings {
          warn!("In sequence #{index} '{seq_name}': {}", warning.warning);
        }

        if let Some(errors_csv_writer) = &mut self.errors_csv_writer {
          errors_csv_writer.write_aa_errors(seq_name, warnings, missing_genes)?;
        }
      }
      Err(report) => {
        let cause = report_to_string(report);
        let message = format!(
          "In sequence #{index} '{seq_name}': {cause}. Note that this sequence will not be included in the results."
        );
        warn!("{message}");
        if let Some(insertions_csv_writer) = &mut self.insertions_csv_writer {
          insertions_csv_writer.write(seq_name, &[], &[])?;
        }
        if let Some(errors_csv_writer) = &mut self.errors_csv_writer {
          errors_csv_writer.write_nuc_error(seq_name, &message)?;
        }
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
