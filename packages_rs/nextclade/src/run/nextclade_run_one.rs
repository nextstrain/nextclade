use crate::align::insertions_strip::{get_aa_insertions, NucIns};
use crate::align::params::AlignPairwiseParams;
use crate::analyze::aa_changes::{find_aa_changes, FindAaChangesOutput};
use crate::analyze::aa_changes_group::group_adjacent_aa_subs_and_dels;
use crate::analyze::divergence::calculate_divergence;
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
use crate::translate::frame_shifts_flatten::frame_shifts_flatten;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::tree::tree::AuspiceTree;
use crate::tree::tree_find_nearest_node::{tree_find_nearest_node, TreeFindNearestNodeOutput};
use crate::types::outputs::{NextalignOutputs, NextcladeOutputs, PhenotypeValue};
use eyre::Report;
use itertools::Itertools;

pub fn nextclade_run_one(
  index: usize,
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
    is_reverse_complement,
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
  let parent_div = node.node_attrs.div.unwrap_or(0.0);
  let divergence = calculate_divergence(
    parent_div,
    private_nuc_mutations.private_substitutions.len(),
    &tree.tmp.divergence_units,
    ref_seq.len(),
  );

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
      qc,
      custom_node_attributes: clade_node_attrs,
      nearest_node_id,
      is_reverse_complement,
    },
  ))
}
