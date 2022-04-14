use crate::align::align::AlignPairwiseParams;
use crate::align::backtrace::AlignmentOutput;
use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, get_gap_open_close_scores_flat};
use crate::align::insertions_strip::{get_aa_insertions, AaIns, Insertion, NucIns, StripInsertionsResult};
use crate::analyze::aa_changes::{find_aa_changes, AaDel, AaSub, FindAaChangesOutput};
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_private_aa_mutations::{find_private_aa_mutations, PrivateAaMutations};
use crate::analyze::find_private_nuc_mutations::{find_private_nuc_mutations, PrivateNucMutations};
use crate::analyze::letter_composition::get_letter_composition;
use crate::analyze::letter_ranges::{
  find_aa_letter_ranges, find_letter_ranges, find_letter_ranges_by, GeneAaRange, LetterRange, NucRange,
};
use crate::analyze::link_nuc_and_aa_changes::{link_nuc_and_aa_changes, LinkedNucAndAaChanges};
use crate::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::nuc_sub_full::{NucDelFull, NucSubFull};
use crate::analyze::pcr_primer_changes::{get_pcr_primer_changes, PcrPrimerChange};
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::virus_properties::VirusProperties;
use crate::cli::nextalign_loop::{nextalign_run_one, NextalignOutputs};
use crate::cli::nextclade_cli::NextcladeRunArgs;
use crate::cli::nextclade_ordered_writer::NextcladeOrderedWriter;
use crate::gene::gene_map::GeneMap;
use crate::io::aa::Aa;
use crate::io::fasta::{read_one_fasta, FastaReader, FastaRecord};
use crate::io::gff3::read_gff3_file;
use crate::io::json::json_write;
use crate::io::letter::Letter;
use crate::io::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use crate::option_get_some;
use crate::qc::qc_config::QcConfig;
use crate::qc::qc_run::{qc_run, QcResult};
use crate::translate::frame_shifts_flatten::frame_shifts_flatten;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::translate::translate_genes_ref::translate_genes_ref;
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode, CladeNodeAttrKeyDesc};
use crate::tree::tree_attach_new_nodes::tree_attach_new_nodes_in_place;
use crate::tree::tree_find_nearest_node::{tree_find_nearest_node, TreeFindNearestNodeOutput};
use crate::tree::tree_preprocess::tree_preprocess_in_place;
use crate::utils::error::keep_ok;
use crate::utils::range::Range;
use crossbeam::thread;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::info;
use map_in_place::MapVecInPlace;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeOutputs {
  pub seq_name: String,
  pub substitutions: Vec<NucSubFull>,
  pub total_substitutions: usize,
  pub deletions: Vec<NucDelFull>,
  pub total_deletions: usize,
  pub insertions: Vec<Insertion<Nuc>>,
  pub total_insertions: usize,
  pub missing: Vec<NucRange>,
  pub total_missing: usize,
  #[serde(rename = "nonACGTNs")]
  pub non_acgtns: Vec<NucRange>,
  #[serde(rename = "totalNonACGTNs")]
  pub total_non_acgtns: usize,
  pub nucleotide_composition: BTreeMap<Nuc, usize>,
  pub frame_shifts: Vec<FrameShift>,
  pub total_frame_shifts: usize,
  pub aa_substitutions: Vec<AaSubFull>,
  pub total_aminoacid_substitutions: usize,
  pub aa_deletions: Vec<AaDelFull>,
  pub total_aminoacid_deletions: usize,
  pub aa_insertions: Vec<AaIns>,
  pub total_aminoacid_insertions: usize,
  pub unknown_aa_ranges: Vec<GeneAaRange>,
  pub total_unknown_aa: usize,
  pub alignment_start: usize,
  pub alignment_end: usize,
  pub alignment_score: i32,
  pub pcr_primer_changes: Vec<PcrPrimerChange>,
  pub total_pcr_primer_changes: usize,
  pub clade: String,
  pub private_nuc_mutations: PrivateNucMutations,
  pub private_aa_mutations: BTreeMap<String, PrivateAaMutations>,
  pub warnings: Vec<String>,
  pub missing_genes: Vec<String>,
  pub divergence: f64,
  pub qc: QcResult,
  pub custom_node_attributes: BTreeMap<String, String>,
  //
  #[serde(skip)]
  pub nearest_node_id: usize,
}

pub struct NextcladeRecord {
  pub index: usize,
  pub seq_name: String,
  pub outputs_or_err: Result<(Vec<Nuc>, Vec<Translation>, NextcladeOutputs), Report>,
}

pub fn nextclade_run_one(
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  gene_map: &GeneMap,
  primers: &[PcrPrimer],
  tree: &AuspiceTree,
  qc_config: &QcConfig,
  virus_properties: &VirusProperties,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<(Vec<Nuc>, Vec<Translation>, NextcladeOutputs), Report> {
  let NextalignOutputs {
    stripped,
    alignment,
    translations,
    warnings,
    missing_genes,
  } = nextalign_run_one(
    qry_seq,
    ref_seq,
    ref_peptides,
    gene_map,
    gap_open_close_nuc,
    gap_open_close_aa,
    params,
  )?;

  let FindNucChangesOutput {
    substitutions,
    deletions,
    alignment_range,
  } = find_nuc_changes(&stripped.qry_seq, &stripped.ref_seq);

  let alignment_start = alignment_range.begin;
  let alignment_end = alignment_range.end;
  let alignment_score = alignment.alignment_score;

  let total_substitutions = substitutions.len();
  let total_deletions = deletions.iter().map(|del| del.length).sum();

  let insertions = stripped.insertions.clone();
  let total_insertions = insertions.iter().map(NucIns::len).sum();

  let missing = find_letter_ranges(&stripped.qry_seq, Nuc::N);
  let total_missing = missing.iter().map(NucRange::len).sum();

  let non_acgtns = find_letter_ranges_by(&stripped.qry_seq, |nuc: Nuc| !(nuc.is_acgtn() || nuc.is_gap()));
  let total_non_acgtns = non_acgtns.iter().map(NucRange::len).sum();

  let nucleotide_composition = get_letter_composition(&stripped.qry_seq);

  let pcr_primer_changes = get_pcr_primer_changes(&substitutions, primers);
  let total_pcr_primer_changes = pcr_primer_changes.iter().map(|pc| pc.substitutions.len()).sum();

  let frame_shifts = frame_shifts_flatten(&translations);
  let total_frame_shifts = frame_shifts.len();

  let FindAaChangesOutput {
    aa_substitutions,
    aa_deletions,
  } = find_aa_changes(
    &stripped.ref_seq,
    &stripped.qry_seq,
    ref_peptides,
    &translations,
    &alignment_range,
    gene_map,
  )?;

  let total_aminoacid_substitutions = aa_substitutions.len();
  let total_aminoacid_deletions = aa_deletions.len();

  let aa_insertions = get_aa_insertions(&translations);
  let total_aminoacid_insertions = aa_insertions.len();

  let unknown_aa_ranges = find_aa_letter_ranges(&translations, Aa::X);
  let total_unknown_aa = unknown_aa_ranges.iter().map(|r| r.length).sum();

  let TreeFindNearestNodeOutput { node, distance } =
    tree_find_nearest_node(tree, &substitutions, &missing, &alignment_range);
  let nearest_node_id = node.tmp.id;
  let clade = node.clade();

  let clade_node_attr_keys = tree.clade_node_attr_keys();
  let clade_node_attrs = node.get_clade_node_attrs(clade_node_attr_keys);

  let private_nuc_mutations = find_private_nuc_mutations(
    node,
    &substitutions,
    &deletions,
    &missing,
    &alignment_range,
    ref_seq,
    virus_properties,
  );

  let private_aa_mutations = find_private_aa_mutations(
    node,
    &aa_substitutions,
    &aa_deletions,
    &unknown_aa_ranges,
    ref_peptides,
    gene_map,
  );

  let divergence = calculate_divergence(node, &private_nuc_mutations, &tree.tmp.divergence_units, ref_seq.len());

  let LinkedNucAndAaChanges {
    substitutions,
    deletions,
    aa_substitutions,
    aa_deletions,
  } = link_nuc_and_aa_changes(&substitutions, &deletions, &aa_substitutions, &aa_deletions);

  let qc = qc_run(
    &private_nuc_mutations,
    &nucleotide_composition,
    total_missing,
    &translations,
    &frame_shifts,
    qc_config,
  );

  Ok((
    stripped.qry_seq,
    translations,
    NextcladeOutputs {
      seq_name: seq_name.to_owned(),
      substitutions,
      total_substitutions,
      deletions,
      total_deletions,
      insertions,
      total_insertions,
      missing,
      total_missing,
      non_acgtns,
      total_non_acgtns,
      nucleotide_composition,
      frame_shifts,
      total_frame_shifts,
      aa_substitutions,
      total_aminoacid_substitutions,
      aa_deletions,
      total_aminoacid_deletions,
      aa_insertions,
      total_aminoacid_insertions,
      unknown_aa_ranges,
      total_unknown_aa,
      alignment_start,
      alignment_end,
      alignment_score,
      pcr_primer_changes,
      total_pcr_primer_changes,
      clade,
      private_nuc_mutations,
      private_aa_mutations,
      warnings,
      missing_genes,
      divergence,
      qc,
      custom_node_attributes: clade_node_attrs,
      nearest_node_id,
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
  let output_json = option_get_some!(output_json)?;
  let output_ndjson = option_get_some!(output_ndjson)?;
  let output_csv = option_get_some!(output_csv)?;
  let output_tsv = option_get_some!(output_tsv)?;

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

  let tree = &mut AuspiceTree::from_path(&input_tree)?;

  let qc_config = &QcConfig::from_path(&input_qc_config)?;

  let virus_properties = &VirusProperties::from_path(&input_virus_properties)?;

  let ref_seq_str = from_nuc_seq(ref_seq);
  let primers = &PcrPrimer::from_path(&input_pcr_primers, &ref_seq_str)?;

  let should_keep_outputs = output_tree.is_some();
  let mut outputs = Vec::<NextcladeOutputs>::new();

  thread::scope(|s| {
    const CHANNEL_SIZE: usize = 128;
    let (fasta_sender, fasta_receiver) = crossbeam_channel::bounded::<FastaRecord>(CHANNEL_SIZE);
    let (result_sender, result_receiver) = crossbeam_channel::bounded::<NextcladeRecord>(CHANNEL_SIZE);

    tree_preprocess_in_place(tree, ref_seq, ref_peptides).unwrap();
    let clade_node_attrs = (&tree.meta.extensions.nextclade.clade_node_attrs).clone();

    let outputs = &mut outputs;

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
      let tree = &tree;

      s.spawn(move |_| {
        let result_sender = result_sender.clone();

        for FastaRecord { seq_name, seq, index } in &fasta_receiver {
          info!("Processing sequence '{seq_name}'");
          let qry_seq = to_nuc_seq(&seq)
            .wrap_err_with(|| format!("When processing sequence #{index} '{seq_name}'"))
            .unwrap();

          let outputs_or_err = nextclade_run_one(
            &seq_name,
            &qry_seq,
            ref_seq,
            ref_peptides,
            gene_map,
            primers,
            tree,
            qc_config,
            virus_properties,
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

    let writer = s.spawn(move |_| {
      let mut output_writer = NextcladeOrderedWriter::new(
        gene_map,
        &clade_node_attrs,
        &output_fasta,
        &output_json,
        &output_ndjson,
        &output_csv,
        &output_tsv,
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
        if should_keep_outputs {
          if let Ok((_, _, nextclade_outputs)) = &record.outputs_or_err {
            outputs.push(nextclade_outputs.clone());
          }
        }

        output_writer
          .write_record(record)
          .wrap_err("When writing output record")
          .unwrap();
      }
    });
  })
  .unwrap();

  if let Some(output_tree) = output_tree {
    tree_attach_new_nodes_in_place(tree, &outputs);
    json_write(output_tree, tree)?;
  }

  Ok(())
}
