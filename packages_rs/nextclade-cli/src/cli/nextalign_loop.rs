use crate::align::align::{align_nuc};
use crate::align::backtrace::AlignmentOutput;
use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use crate::align::insertions_strip::{insertions_strip, StripInsertionsResult};
use crate::cli::nextalign_cli::{AlignPairwiseParams, NextalignRunArgs};
use crate::cli::nextalign_ordered_writer::NextalignOrderedWriter;
use crate::gene::gene_map::GeneMap;
use crate::io::fasta::{read_one_fasta, FastaReader, FastaRecord};
use crate::io::gff3::read_gff3_file;
use crate::io::nuc::{to_nuc_seq, Nuc};
use crate::option_get_some;
use crate::translate::translate_genes::{translate_genes, Translation, TranslationMap};
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::utils::error::report_to_string;
use crossbeam::thread;
use eyre::{Report, WrapErr};
use itertools::{Either, Itertools};
use log::info;
use std::collections::HashSet;

pub struct NextalignOutputs {
  pub stripped: StripInsertionsResult<Nuc>,
  pub alignment: AlignmentOutput<Nuc>,
  pub translations: Vec<Translation>,
  pub warnings: Vec<String>,
  pub missing_genes: Vec<String>,
}

pub struct NextalignRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<NextalignOutputs, Report>,
}

pub fn nextalign_run_one(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
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

      let stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);

      let (translations, warnings): (Vec<Translation>, Vec<String>) =
        translations.into_iter().partition_map(|res| match res {
          Ok(tr) => Either::Left(tr),
          Err(err) => Either::Right(report_to_string(&err)),
        });

      let present_genes: HashSet<String> = translations.iter().map(|tr| &tr.gene_name).cloned().collect();

      let missing_genes = gene_map
        .iter()
        .filter_map(|(gene_name, _)| (!present_genes.contains(gene_name)).then(|| gene_name))
        .cloned()
        .collect_vec();

      Ok(NextalignOutputs {
        stripped,
        alignment,
        translations,
        warnings,
        missing_genes,
      })
    }
  }
}

pub fn nextalign_run(args: NextalignRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{args:#?}");

  let NextalignRunArgs {
    input_fasta,
    input_ref,
    genes,
    input_gene_map,
    output_dir,
    output_basename,
    include_reference,
    output_fasta,
    output_insertions,
    output_errors,
    jobs,
    in_order,
    alignment_params,
  } = args;

  let output_fasta = option_get_some!(output_fasta)?;
  let output_basename = option_get_some!(output_basename)?;
  let output_dir = option_get_some!(output_dir)?;
  let output_insertions = option_get_some!(output_insertions)?;
  let output_errors = option_get_some!(output_errors)?;

  let ref_record = &read_one_fasta(input_ref)?;
  let ref_seq = &to_nuc_seq(&ref_record.seq)?;

  let gene_map = &match (input_gene_map, genes) {
    // Read gene map and retain only requested genes
    (Some(input_gene_map), Some(genes)) => read_gff3_file(&input_gene_map)?
      .into_iter()
      .filter(|(gene_name, ..)| genes.contains(gene_name))
      .collect(),
    _ => GeneMap::new(),
  };

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, gene_map, &alignment_params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, &alignment_params);

  let ref_peptides = &translate_genes_ref(ref_seq, gene_map, &alignment_params)?;

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
      let alignment_params = &alignment_params;

      s.spawn(move |_| {
        let result_sender = result_sender.clone();

        for FastaRecord { seq_name, seq, index } in &fasta_receiver {
          info!("Processing sequence '{seq_name}'");
          let qry_seq = to_nuc_seq(&seq)
            .wrap_err_with(|| format!("When processing sequence #{index} '{seq_name}'"))
            .unwrap();

          let outputs_or_err = nextalign_run_one(
            &qry_seq,
            ref_seq,
            ref_peptides,
            gene_map,
            gap_open_close_nuc,
            gap_open_close_aa,
            alignment_params,
          );

          let record = NextalignRecord {
            index,
            seq_name,
            outputs_or_err,
          };

          // Important: **all** records should be sent into this channel, without skipping.
          // In in-order mode, writer that receives from this channel expects a contiguous stream of indices. Gaps in
          // the indices will cause writer to stall waiting for the missing index and the buffering queue to grow. Any
          // filtering of records should be done in the writer, instead of here.
          result_sender
            .send(record)
            .wrap_err("When sending NextalignRecord")
            .unwrap();
        }

        drop(result_sender);
      });
    }

    s.spawn(move |_| {
      let mut output_writer = NextalignOrderedWriter::new(
        gene_map,
        &output_fasta,
        &output_insertions,
        &output_errors,
        &output_dir,
        &output_basename,
        in_order,
      )
      .wrap_err("When creating output writer")
      .unwrap();

      if include_reference {
        output_writer
          .write_ref(ref_record, ref_peptides)
          .wrap_err("When writing output record for ref sequence")
          .unwrap();
      }

      for record in result_receiver {
        output_writer
          .write_record(record)
          .wrap_err("When writing output record")
          .unwrap();
      }
    });
  })
  .unwrap();

  Ok(())
}
