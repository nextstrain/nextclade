use crate::align::align::{align_nuc, AlignPairwiseParams};
use crate::align::backtrace::AlignmentOutput;
use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use crate::align::strip_insertions::{strip_insertions, StripInsertionsResult};
use crate::cli::nextalign_cli::NextalignRunArgs;
use crate::gene::gene_map::GeneMap;
use crate::io::errors_csv::ErrorsCsvWriter;
use crate::io::fasta::{read_one_fasta, write_translations, FastaPeptideWriter, FastaReader, FastaRecord, FastaWriter};
use crate::io::gff3::read_gff3_file;
use crate::io::insertions_csv::InsertionsCsvWriter;
use crate::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use crate::option_get_some;
use crate::translate::peptide::PeptideMap;
use crate::translate::translate_genes::{translate_genes, Translation};
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::utils::error::report_to_string;
use color_eyre::Section;
use crossbeam::thread;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::{info, warn};
use std::collections::HashMap;

pub struct NextalignOutputs {
  pub stripped: StripInsertionsResult<Nuc>,
  pub alignment: AlignmentOutput<Nuc>,
  pub translations: Vec<Result<Translation, Report>>,
}

pub struct NextalignRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<NextalignOutputs, Report>,
}

pub fn run_one(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &PeptideMap,
  gene_map: &GeneMap,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<NextalignOutputs, Report> {
  match align_nuc(qry_seq, ref_seq, gap_open_close_nuc, params) {
    Err(report) => Err(report),

    Ok(alignment) => {
      let translations = translate_genes(
        &alignment.qry_seq,
        &alignment.ref_seq,
        ref_peptides,
        gene_map,
        gap_open_close_aa,
        params,
      );

      let stripped = strip_insertions(&alignment.qry_seq, &alignment.ref_seq);

      Ok(NextalignOutputs {
        stripped,
        alignment,
        translations,
      })
    }
  }
}

pub fn output_one(
  record: &NextalignRecord,
  gene_map: &GeneMap,
  fasta_writer: &mut FastaWriter,
  fasta_peptide_writer: &mut FastaPeptideWriter,
  insertions_csv_writer: &mut InsertionsCsvWriter,
  errors_csv_writer: &mut ErrorsCsvWriter,
) -> Result<(), Report> {
  let NextalignRecord {
    index,
    seq_name,
    outputs_or_err,
  } = record;

  match outputs_or_err {
    Ok(output) => {
      let NextalignOutputs {
        stripped, translations, ..
      } = output;
      // warn!("writing {index}");
      fasta_writer.write(seq_name, &from_nuc_seq(&stripped.qry_seq))?;
      write_translations(seq_name, translations, fasta_peptide_writer)?;
      insertions_csv_writer.write(seq_name, &stripped.insertions, translations)?;
      errors_csv_writer.write_aa_errors(seq_name, translations, gene_map)?;
    }
    Err(report) => {
      let cause = report_to_string(report);
      let message = format!(
        "In sequence #{index} '{seq_name}': {cause}. Note that this sequence will not be included in the results."
      );
      warn!("{message}");
      errors_csv_writer.write_nuc_error(seq_name, &message)?;
    }
  };

  Ok(())
}

pub fn nextalign_run(args: NextalignRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{args:#?}");

  let NextalignRunArgs {
    input_fasta,
    input_ref,
    genes,
    genemap,
    output_dir,
    output_basename,
    // include_reference,
    output_fasta,
    output_insertions,
    output_errors,
    jobs,
    in_order,
    ..
  } = args;

  let params = &AlignPairwiseParams::default();
  info!("Params:\n{params:#?}");

  let output_fasta = option_get_some!(output_fasta)?;
  let output_basename = option_get_some!(output_basename)?;
  let output_dir = option_get_some!(output_dir)?;
  let output_insertions = option_get_some!(output_insertions)?;
  let output_errors = option_get_some!(output_errors)?;

  let ref_seq = &to_nuc_seq(&read_one_fasta(input_ref)?)?;

  let gene_map = &match (genemap, genes) {
    // Read gene map and retain only requested genes
    (Some(genemap), Some(genes)) => read_gff3_file(&genemap)?
      .into_iter()
      .filter(|(gene_name, ..)| genes.contains(gene_name))
      .collect(),
    _ => GeneMap::new(),
  };

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, gene_map, params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, params);

  let ref_peptides = &translate_genes_ref(ref_seq, gene_map, params)?;

  thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextalignRecord>(CHANNEL_SIZE);

    s.spawn(|_| {
      let mut reader = FastaReader::from_path(&input_fasta).unwrap();
      loop {
        let mut record = FastaRecord::default();
        reader.read(&mut record).unwrap();
        if record.is_empty() {
          break;
        }
        fasta_sender
          .send(record)
          .wrap_err("When sending a FastaRecord")
          .unwrap();
      }
      drop(fasta_sender);
    });

    for _ in 0..jobs {
      let fasta_receiver = fasta_receiver.clone();
      let result_sender = result_sender.clone();
      let gap_open_close_nuc = &gap_open_close_nuc;
      let gap_open_close_aa = &gap_open_close_aa;

      s.spawn(move |_| {
        let result_sender = result_sender.clone();

        for FastaRecord { seq_name, seq, index } in &fasta_receiver {
          info!("Processing sequence '{seq_name}'");
          let qry_seq = to_nuc_seq(&seq)
            .wrap_err_with(|| format!("When processing sequence #{index} '{seq_name}'"))
            .unwrap();

          let result_or_err = run_one(
            &qry_seq,
            ref_seq,
            ref_peptides,
            gene_map,
            gap_open_close_nuc,
            gap_open_close_aa,
            params,
          );

          let record = NextalignRecord {
            index,
            seq_name,
            outputs_or_err: result_or_err,
          };

          result_sender
            .send(record)
            .wrap_err("When sending NextalignRecord")
            .unwrap();
        }

        drop(result_sender);
      });
    }

    s.spawn(move |_| {
      let mut fasta_writer = FastaWriter::from_path(&output_fasta).unwrap();
      let mut fasta_peptide_writer = FastaPeptideWriter::new(gene_map, &output_dir, &output_basename).unwrap();
      let mut insertions_csv_writer = InsertionsCsvWriter::new(&output_insertions).unwrap();
      let mut errors_csv_writer = ErrorsCsvWriter::new(&output_errors).unwrap();

      let mut expected_index = 0;
      let queue = &mut HashMap::<usize, NextalignRecord>::new();
      for record in result_receiver {
        let NextalignRecord { index, seq_name, .. } = &record;

        if !in_order {
          output_one(
            &record,
            gene_map,
            &mut fasta_writer,
            &mut fasta_peptide_writer,
            &mut insertions_csv_writer,
            &mut errors_csv_writer,
          )
          .wrap_err_with(|| format!("When writing results for sequence #{index} '{seq_name}'"))
          .unwrap();
        }

        if in_order {
          if index == &expected_index {
            output_one(
              &record,
              gene_map,
              &mut fasta_writer,
              &mut fasta_peptide_writer,
              &mut insertions_csv_writer,
              &mut errors_csv_writer,
            )
            .wrap_err_with(|| format!("When writing results for sequence #{index} '{seq_name}'"))
            .unwrap();

            expected_index += 1;
          } else {
            queue.insert(*index, record);
          }

          let record = queue.get(&expected_index);
          if let Some(record) = record {
            let NextalignRecord { index, seq_name, .. } = &record;

            if index == &expected_index {
              output_one(
                record,
                gene_map,
                &mut fasta_writer,
                &mut fasta_peptide_writer,
                &mut insertions_csv_writer,
                &mut errors_csv_writer,
              )
              .wrap_err_with(|| format!("When writing results for queued sequence #{index} '{seq_name}'"))
              .unwrap();

              expected_index += 1;
            }
          }
        }
      }

      for record in queue.values().sorted_by_key(|record| record.index) {
        let NextalignRecord { index, seq_name, .. } = &record;

        if index == &expected_index {
          output_one(
            record,
            gene_map,
            &mut fasta_writer,
            &mut fasta_peptide_writer,
            &mut insertions_csv_writer,
            &mut errors_csv_writer,
          )
          .wrap_err_with(|| format!("When writing results for queued sequence #{index} '{seq_name}'"))
          .unwrap();

          expected_index += 1;
        }
      }
    });
  })
  .unwrap();

  Ok(())
}
