use crate::cli::nextclade_loop::NextcladeRecord;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::{info, warn};
use nextclade::analyze::virus_properties::PhenotypeAttrDesc;
use nextclade::io::errors_csv::ErrorsCsvWriter;
use nextclade::io::fasta::{FastaPeptideWriter, FastaRecord, FastaWriter};
use nextclade::io::gene_map::GeneMap;
use nextclade::io::insertions_csv::InsertionsCsvWriter;
use nextclade::io::ndjson::NdjsonFileWriter;
use nextclade::io::nextclade_csv::{CsvColumnConfig, NextcladeResultsCsvFileWriter};
use nextclade::io::nuc::from_nuc_seq;
use nextclade::io::results_json::ResultsJsonWriter;
use nextclade::translate::translate_genes::TranslationMap;
use nextclade::tree::tree::CladeNodeAttrKeyDesc;
use nextclade::types::outputs::NextcladeOutputs;
use nextclade::utils::error::report_to_string;
use nextclade::utils::option::OptionMapRefFallible;
use std::collections::HashMap;
use std::hash::Hasher;
use std::path::PathBuf;

/// Writes output files, potentially preserving the initial order of records (same as in the inputs)
pub struct NextcladeOrderedWriter<'a> {
  fasta_writer: Option<FastaWriter>,
  fasta_peptide_writer: Option<FastaPeptideWriter>,
  output_json_writer: Option<ResultsJsonWriter>,
  output_ndjson_writer: Option<NdjsonFileWriter>,
  output_csv_writer: Option<NextcladeResultsCsvFileWriter>,
  output_tsv_writer: Option<NextcladeResultsCsvFileWriter>,
  insertions_csv_writer: Option<InsertionsCsvWriter>,
  errors_csv_writer: Option<ErrorsCsvWriter<'a>>,
  expected_index: usize,
  queue: HashMap<usize, NextcladeRecord>,
  in_order: bool,
}

impl<'a> NextcladeOrderedWriter<'a> {
  pub fn new(
    gene_map: &'a GeneMap,
    clade_node_attr_key_descs: &[CladeNodeAttrKeyDesc],
    phenotype_attr_key_desc: &[PhenotypeAttrDesc],
    aa_motifs_keys: &[String],
    output_fasta: &Option<PathBuf>,
    output_json: &Option<PathBuf>,
    output_ndjson: &Option<PathBuf>,
    output_csv: &Option<PathBuf>,
    output_tsv: &Option<PathBuf>,
    output_insertions: &Option<PathBuf>,
    output_errors: &Option<PathBuf>,
    output_translations: &Option<String>,
    csv_column_config: &CsvColumnConfig,
    in_order: bool,
  ) -> Result<Self, Report> {
    let fasta_writer = output_fasta.map_ref_fallible(FastaWriter::from_path)?;

    let fasta_peptide_writer = output_translations
      .map_ref_fallible(|output_translations| FastaPeptideWriter::new(gene_map, output_translations))?;

    let insertions_csv_writer = output_insertions.map_ref_fallible(InsertionsCsvWriter::new)?;

    let errors_csv_writer =
      output_errors.map_ref_fallible(|output_errors| ErrorsCsvWriter::new(gene_map, output_errors))?;

    let output_json_writer = output_json.map_ref_fallible(|output_json| {
      ResultsJsonWriter::new(output_json, clade_node_attr_key_descs, phenotype_attr_key_desc)
    })?;

    let output_ndjson_writer = output_ndjson.map_ref_fallible(NdjsonFileWriter::new)?;

    let clade_node_attr_keys = clade_node_attr_key_descs
      .iter()
      .map(|desc| desc.name.clone())
      .collect_vec();

    let phenotype_attr_keys = phenotype_attr_key_desc
      .iter()
      .map(|desc| desc.name.clone())
      .collect_vec();

    let output_csv_writer = output_csv.map_ref_fallible(|output_csv| {
      NextcladeResultsCsvFileWriter::new(
        output_csv,
        b';',
        &clade_node_attr_keys,
        &phenotype_attr_keys,
        aa_motifs_keys,
        csv_column_config,
      )
    })?;

    let output_tsv_writer = output_tsv.map_ref_fallible(|output_tsv| {
      NextcladeResultsCsvFileWriter::new(
        output_tsv,
        b'\t',
        &clade_node_attr_keys,
        &phenotype_attr_keys,
        aa_motifs_keys,
        csv_column_config,
      )
    })?;

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

    if let Some(fasta_writer) = &mut self.fasta_writer {
      fasta_writer.write(seq_name, seq, false)?;
    }

    ref_peptides.iter().try_for_each(|(_, peptide)| {
      if let Some(fasta_peptide_writer) = &mut self.fasta_peptide_writer {
        fasta_peptide_writer.write(seq_name, peptide)?;
      }
      Result::<(), Report>::Ok(())
    })?;

    Ok(())
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
        let NextcladeOutputs {
          warnings,
          insertions,
          missing_genes,
          is_reverse_complement,
          ..
        } = &nextclade_outputs;

        if let Some(fasta_writer) = &mut self.fasta_writer {
          fasta_writer.write(&seq_name, &from_nuc_seq(&qry_seq_stripped), *is_reverse_complement)?;
        }

        if let Some(fasta_peptide_writer) = &mut self.fasta_peptide_writer {
          for translation in &translations {
            fasta_peptide_writer.write(&seq_name, translation)?;
          }
        }

        if let Some(insertions_csv_writer) = &mut self.insertions_csv_writer {
          insertions_csv_writer.write(&seq_name, insertions, &translations)?;
        }

        for warning in warnings {
          info!("In sequence #{index} '{seq_name}': {}", warning.warning);
        }

        if let Some(errors_csv_writer) = &mut self.errors_csv_writer {
          errors_csv_writer.write_aa_errors(&seq_name, warnings, missing_genes)?;
        }

        if let Some(output_csv_writer) = &mut self.output_csv_writer {
          output_csv_writer.write(&nextclade_outputs)?;
        }

        if let Some(output_tsv_writer) = &mut self.output_tsv_writer {
          output_tsv_writer.write(&nextclade_outputs)?;
        }

        if let Some(output_ndjson_writer) = &mut self.output_ndjson_writer {
          output_ndjson_writer.write(&nextclade_outputs)?;
        }

        if let Some(output_json_writer) = &mut self.output_json_writer {
          output_json_writer.write(nextclade_outputs);
        }
      }
      Err(report) => {
        let cause = report_to_string(&report);
        warn!(
          "In sequence #{index} '{seq_name}': {cause}. Note that this sequence will not be included in the results."
        );
        if let Some(insertions_csv_writer) = &mut self.insertions_csv_writer {
          insertions_csv_writer.write(&seq_name, &[], &[])?;
        }
        if let Some(errors_csv_writer) = &mut self.errors_csv_writer {
          errors_csv_writer.write_nuc_error(&seq_name, &cause)?;
        }
        if let Some(output_csv_writer) = &mut self.output_csv_writer {
          output_csv_writer.write_nuc_error(index, &seq_name, &cause)?;
        }
        if let Some(output_tsv_writer) = &mut self.output_tsv_writer {
          output_tsv_writer.write_nuc_error(index, &seq_name, &cause)?;
        }
        if let Some(output_ndjson_writer) = &mut self.output_ndjson_writer {
          output_ndjson_writer.write_nuc_error(index, &seq_name, &[cause.clone()])?;
        }
        if let Some(output_json_writer) = &mut self.output_json_writer {
          output_json_writer.write_nuc_error(index, &seq_name, &[cause]);
        }
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
    if let Some(output_json_writer) = &mut self.output_json_writer {
      output_json_writer.finish()?;
    }
    Ok(())
  }
}

impl<'a> Drop for NextcladeOrderedWriter<'a> {
  fn drop(&mut self) {
    self.finish().wrap_err("When finalizing output writer").unwrap();
  }
}
