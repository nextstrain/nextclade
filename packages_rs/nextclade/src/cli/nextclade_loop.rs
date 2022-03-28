#![allow(non_snake_case)]

use crate::align::align::AlignPairwiseParams;
use crate::align::backtrace::AlignmentOutput;
use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use crate::align::strip_insertions::{AaIns, Insertion, NucIns, StripInsertionsResult};
use crate::analyze::letter_composition::get_letter_composition;
use crate::analyze::letter_ranges::{find_letter_ranges, find_letter_ranges_by, LetterRange, NucRange};
use crate::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput, NucDel, NucSub};
use crate::analyze::pcr_primer_changes::{get_pcr_primer_changes, PcrPrimerChange};
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::virus_properties::VirusProperties;
use crate::cli::nextalign_loop::{nextalign_run_one, NextalignOutputs};
use crate::cli::nextclade_cli::NextcladeRunArgs;
use crate::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use crate::gene::gene_map::GeneMap;
use crate::io::fasta::{read_one_fasta, FastaReader, FastaRecord};
use crate::io::gff3::read_gff3_file;
use crate::io::letter::Letter;
use crate::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use crate::option_get_some;
use crate::qc::qc_config::QcConfig;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::tree::AuspiceTree;
use crossbeam::thread;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::info;
use map_in_place::MapVecInPlace;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeOutputs {
  pub substitutions: Vec<NucSub>,
  pub totalSubstitutions: usize,
  pub deletions: Vec<NucDel>,
  pub totalDeletions: usize,
  pub insertions: Vec<Insertion<Nuc>>,
  pub totalInsertions: usize,
  pub missing: Vec<NucRange>,
  pub totalMissing: usize,
  pub nonACGTNs: Vec<NucRange>,
  pub totalNonACGTNs: usize,
  pub nucleotideComposition: BTreeMap<Nuc, usize>,
  // pub frameShifts: Vec<FrameShift>,
  // pub totalFrameShifts: usize,
  // pub aaSubstitutions: Vec<AaSub>,
  // pub totalAminoacidSubstitutions: usize,
  // pub aaDeletions: Vec<AaDel>,
  // pub totalAminoacidDeletions: usize,
  // pub aaInsertions: Vec<AaIns>,
  // pub totalAminoacidInsertions: usize,
  // pub unknownAaRanges: Vec<GeneAaRange>,
  // pub totalUnknownAa: usize,
  // pub alignmentStart: usize,
  // pub alignmentEnd: usize,
  // pub alignmentScore: usize,
  pub pcrPrimerChanges: Vec<PcrPrimerChange>,
  pub totalPcrPrimerChanges: usize,
  // pub nearestNodeId: usize,
  // pub clade: String,
  // pub privateNucMutations: PrivateNucleotideMutations,
  // pub privateAaMutations: BTreeMap<String, PrivateAminoacidMutations>,
  // pub missingGenes: BTreeSet<String>,
  // pub divergence: f64,
  // pub qc: QcResult,
  // pub customNodeAttributes: BTreeMap<String, String>
}

pub struct NextcladeRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<(NextalignOutputs, NextcladeOutputs), Report>,
}

pub fn nextclade_run_one(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  gene_map: &GeneMap,
  primers: &[PcrPrimer],
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<(NextalignOutputs, NextcladeOutputs), Report> {
  let nextalign_outputs = nextalign_run_one(
    qry_seq,
    ref_seq,
    ref_peptides,
    gene_map,
    gap_open_close_nuc,
    gap_open_close_aa,
    params,
  )?;

  let NextalignOutputs {
    stripped,
    alignment,
    translations,
  } = nextalign_outputs;

  let FindNucChangesOutput {
    substitutions,
    deletions,
    alignment_start,
    alignment_end,
  } = find_nuc_changes(&alignment.qry_seq, &alignment.ref_seq);

  let totalSubstitutions = substitutions.len();
  let totalDeletions = deletions.iter().map(|del| del.length).sum();

  let insertions = stripped.insertions.clone();
  let totalInsertions = insertions.iter().map(NucIns::len).sum();

  let missing = find_letter_ranges(&alignment.qry_seq, Nuc::N);
  let totalMissing = missing.iter().map(NucRange::len).sum();

  let nonACGTNs = find_letter_ranges_by(&alignment.qry_seq, |nuc: Nuc| !(nuc.is_acgtn() || nuc.is_gap()));
  let totalNonACGTNs = nonACGTNs.iter().map(NucRange::len).sum();

  let nucleotideComposition = get_letter_composition(&alignment.qry_seq);

  let pcrPrimerChanges = get_pcr_primer_changes(&substitutions, primers);
  let totalPcrPrimerChanges = pcrPrimerChanges.iter().map(|pc| pc.substitutions.len()).sum();

  Ok((
    NextalignOutputs {
      stripped,
      alignment,
      translations,
    },
    NextcladeOutputs {
      substitutions,
      totalSubstitutions,
      deletions,
      totalDeletions,
      insertions,
      totalInsertions,
      missing,
      totalMissing,
      nonACGTNs,
      totalNonACGTNs,
      nucleotideComposition,
      pcrPrimerChanges,
      totalPcrPrimerChanges,
    },
  ))
}

pub fn nextclade_run(args: NextcladeRunArgs) -> Result<(), Report> {
  info!("Command-line arguments:\n{args:#?}");

  let NextcladeRunArgs {
    input_fasta,
    input_ref,
    input_tree,
    input_qc_config,
    input_virus_properties,
    input_pcr_primers,
    input_gene_map,
    genes,
    output_dir,
    output_basename,
    include_reference,
    output_fasta,
    output_ndjson,
    output_json,
    output_csv,
    output_tsv,
    output_tree,
    output_insertions,
    output_errors,
    jobs,
    in_order,
    ..
  } = args;

  let params = &AlignPairwiseParams::default();
  info!("Params:\n{params:#?}");

  let input_ref = option_get_some!(input_ref)?;
  let input_tree = option_get_some!(input_tree)?;
  let input_qc_config = option_get_some!(input_qc_config)?;
  let input_virus_properties = option_get_some!(input_virus_properties)?;
  let input_pcr_primers = option_get_some!(input_pcr_primers)?;

  let output_fasta = option_get_some!(output_fasta)?;
  let output_basename = option_get_some!(output_basename)?;
  let output_dir = option_get_some!(output_dir)?;
  let output_insertions = option_get_some!(output_insertions)?;
  let output_errors = option_get_some!(output_errors)?;
  let output_ndjson = option_get_some!(output_ndjson)?;
  let output_json = option_get_some!(output_json)?;
  let output_csv = option_get_some!(output_csv)?;
  let output_tsv = option_get_some!(output_tsv)?;
  let output_tree = option_get_some!(output_tree)?;

  let ref_record = &read_one_fasta(input_ref)?;
  let ref_seq = &to_nuc_seq(&ref_record.seq)?;

  let gene_map = &if let Some(input_gene_map) = input_gene_map {
    let mut gene_map = read_gff3_file(&input_gene_map)?;
    if let Some(genes) = genes {
      gene_map = gene_map
        .into_iter()
        .filter(|(gene_name, ..)| genes.contains(gene_name))
        .collect();
    }
    gene_map
  } else {
    GeneMap::new()
  };

  let gap_open_close_nuc = &get_gap_open_close_scores_codon_aware(ref_seq, gene_map, params);
  let gap_open_close_aa = &get_gap_open_close_scores_flat(ref_seq, params);

  let ref_peptides = &translate_genes_ref(ref_seq, gene_map, params)?;

  let tree = AuspiceTree::from_path(&input_tree)?;

  let qc_config = QcConfig::from_path(&input_qc_config)?;

  let virus_properties = VirusProperties::from_path(&input_virus_properties)?;

  let ref_seq_str = from_nuc_seq(ref_seq);
  let primers = &PcrPrimer::from_path(&input_pcr_primers, &ref_seq_str)?;

  thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextcladeRecord>(CHANNEL_SIZE);

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

          let outputs_or_err = nextclade_run_one(
            &qry_seq,
            ref_seq,
            ref_peptides,
            gene_map,
            primers,
            gap_open_close_nuc,
            gap_open_close_aa,
            params,
          );

          let record = NextcladeRecord {
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
            .wrap_err("When sending NextcladeRecord")
            .unwrap();
        }

        drop(result_sender);
      });
    }

    s.spawn(move |_| {
      let mut output_writer = NextcladeOrderedWriter::new(
        gene_map,
        &tree.meta.extensions.nextclade.clade_node_attrs,
        &output_fasta,
        &output_ndjson,
        &output_json,
        &output_csv,
        &output_tsv,
        &output_tree,
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
