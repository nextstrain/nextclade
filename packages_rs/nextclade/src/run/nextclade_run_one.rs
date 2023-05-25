use crate::align::insertions_strip::NucIns;
use crate::align::params::AlignPairwiseParams;
use crate::analyze::aa_changes::{find_aa_changes, FindAaChangesOutput};
use crate::analyze::aa_changes_group::group_adjacent_aa_subs_and_dels;
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_aa_motifs::find_aa_motifs;
use crate::analyze::find_aa_motifs_changes::{find_aa_motifs_changes, AaMotifsMap};
use crate::analyze::find_private_aa_mutations::find_private_aa_mutations;
use crate::analyze::find_private_nuc_mutations::find_private_nuc_mutations;
use crate::analyze::letter_composition::get_letter_composition;
use crate::analyze::letter_ranges::{find_aa_letter_ranges, find_letter_ranges, find_letter_ranges_by, NucRange};
use crate::analyze::link_nuc_and_aa_changes::{link_nuc_and_aa_changes, LinkedNucAndAaChanges};
use crate::analyze::nuc_changes::{find_nuc_changes, FindNucChangesOutput};
use crate::analyze::pcr_primer_changes::get_pcr_primer_changes;
use crate::analyze::pcr_primers::PcrPrimer;
use crate::analyze::phenotype::calculate_phenotype;
use crate::analyze::virus_properties::{PhenotypeData, VirusProperties};
use crate::io::aa::Aa;
use crate::io::gene_map::GeneMap;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::qc::qc_config::QcConfig;
use crate::qc::qc_run::qc_run;
use crate::run::nextalign_run_one::nextalign_run_one;
use crate::translate::aa_alignment_ranges::calculate_aa_alignment_ranges_in_place;
use crate::translate::frame_shifts_flatten::frame_shifts_flatten;
use crate::translate::translate_genes::Translation;
use crate::tree::tree::AuspiceTree;
use crate::tree::tree_find_nearest_node::tree_find_nearest_nodes;
use crate::types::outputs::{NextalignOutputs, NextcladeOutputs, PhenotypeValue};
use crate::utils::range::Range;
use eyre::Report;
use itertools::Itertools;
use std::collections::BTreeMap;

pub fn nextclade_run_one(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  aa_motifs_ref: &AaMotifsMap,
  gene_map: &GeneMap,
  primers: &[PcrPrimer],
  tree: &AuspiceTree,
  qc_config: &QcConfig,
  virus_properties: &VirusProperties,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
  include_nearest_node_info: bool,
) -> Result<(Vec<Nuc>, Translation, NextcladeOutputs), Report> {
  let NextalignOutputs {
    stripped,
    alignment,
    mut translation,
    aa_insertions,
    warnings,
    missing_genes,
    is_reverse_complement,
    coord_map,
  } = nextalign_run_one(
    index,
    seq_name,
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

  calculate_aa_alignment_ranges_in_place(&alignment_range, &coord_map, &mut translation, &gene_map)?;

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

  let frame_shifts = frame_shifts_flatten(&translation);
  let total_frame_shifts = frame_shifts.len();

  let FindAaChangesOutput {
    aa_substitutions,
    aa_deletions,
  } = find_aa_changes(
    &stripped.ref_seq,
    &stripped.qry_seq,
    ref_peptides,
    &translation,
    &alignment_range,
  )?;

  let total_aminoacid_substitutions = aa_substitutions.len();
  let total_aminoacid_deletions = aa_deletions.len();
  let total_aminoacid_insertions = aa_insertions.len();

  let unknown_aa_ranges = find_aa_letter_ranges(&translation, Aa::X);
  let total_unknown_aa = unknown_aa_ranges.iter().map(|r| r.length).sum();

  let nearest_node_candidates = tree_find_nearest_nodes(
    tree,
    &substitutions,
    &missing,
    &alignment_range,
    &virus_properties.placement_mask_ranges,
  );
  let node = nearest_node_candidates[0].node;
  let nearest_node_id = node.tmp.id;

  let nearest_nodes = include_nearest_node_info.then_some(
    nearest_node_candidates
    .iter()
    // Choose all nodes with distance equal to the distance of the nearest node
    .filter(|n| n.distance == nearest_node_candidates[0].distance)
    .map(|n| n.node.name.clone())
    .collect_vec(),
  );

  let clade = node.clade();

  let clade_node_attr_keys = tree.clade_node_attr_descs();
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

  let aa_changes_groups = group_adjacent_aa_subs_and_dels(&aa_substitutions, &aa_deletions);

  let total_aligned_nucs = alignment_end - alignment_start;
  let total_covered_nucs = total_aligned_nucs - total_missing - total_non_acgtns;
  let coverage = total_covered_nucs as f64 / ref_seq.len() as f64;

  let phenotype_values = virus_properties.phenotype_data.as_ref().map(|phenotype_data| {
    phenotype_data
      .iter()
      .filter_map(|phenotype_data| {
        let PhenotypeData {
          name,
          name_friendly,
          description,
          gene,
          data,
          ignore,
          ..
        } = phenotype_data;
        if ignore.clades.contains(&clade) {
          return None;
        }
        let phenotype = calculate_phenotype(phenotype_data, &aa_substitutions);
        Some(PhenotypeValue {
          name: name.clone(),
          gene: gene.clone(),
          value: phenotype,
        })
      })
      .collect_vec()
  });

  let aa_motifs = find_aa_motifs(&virus_properties.aa_motifs, &translation)?;
  let aa_motifs_changes = find_aa_motifs_changes(aa_motifs_ref, &aa_motifs, ref_peptides, &translation)?;

  let qc = qc_run(
    &private_nuc_mutations,
    &nucleotide_composition,
    total_missing,
    &translation,
    &frame_shifts,
    qc_config,
  );

  let aa_alignment_ranges: BTreeMap<String, Vec<Range>> = translation
    .cdses()
    .map(|tr| {
      let alignment_ranges = tr
        .alignment_ranges
        .iter()
        .filter_map(|alignment_range| (!alignment_range.is_empty()).then_some(alignment_range.clone()))
        .collect_vec();
      (tr.name.clone(), alignment_ranges)
    })
    .collect();

  Ok((
    stripped.qry_seq,
    translation,
    NextcladeOutputs {
      index,
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
      aa_changes_groups,
      alignment_start,
      alignment_end,
      alignment_score,
      aa_alignment_ranges,
      pcr_primer_changes,
      total_pcr_primer_changes,
      clade,
      private_nuc_mutations,
      private_aa_mutations,
      warnings,
      missing_genes,
      divergence,
      coverage,
      phenotype_values,
      aa_motifs,
      aa_motifs_changes,
      qc,
      custom_node_attributes: clade_node_attrs,
      nearest_node_id,
      nearest_nodes,
      is_reverse_complement,
    },
  ))
}
