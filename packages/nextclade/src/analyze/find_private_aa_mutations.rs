use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::analyze::aa_alignment::{AaAlignment, AaAlignmentAbstract, AaAlignmentView};
use crate::analyze::aa_changes_find_for_cds::aa_changes_group;
use crate::analyze::aa_changes_group::AaChangesGroup;
use crate::analyze::aa_del::{AaDel, AaDelRange};
use crate::analyze::aa_sub::AaSub;
use crate::analyze::group_adjacent_deletions::group_adjacent;
use crate::analyze::is_sequenced::is_aa_sequenced;
use crate::analyze::letter_ranges::CdsAaRange;
use crate::analyze::nuc_alignment::{NucAlignment, NucAlignmentAbstract, NucAlignmentWithOverlay};
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::AaRefPosition;
use crate::coord::range::AaRefRange;
use crate::gene::cds::Cds;
use crate::gene::gene_map::GeneMap;
use crate::translate::translate_genes::Translation;
use crate::tree::tree::AuspiceGraphNodePayload;
use crate::utils::collections::concat_to_vec;
use eyre::Report;
use itertools::Itertools;
use maplit::btreemap;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PrivateAaMutations {
  pub cds_name: String,
  pub private_substitutions: Vec<AaSub>,
  pub private_deletions: Vec<AaDel>,
  pub private_deletion_ranges: Vec<AaDelRange>,
  pub reversion_substitutions: Vec<AaSub>,
  pub total_private_substitutions: usize,
  pub total_private_deletions: usize,
  pub total_reversion_substitutions: usize,
  pub aa_changes_groups: Vec<AaChangesGroup>,
}

/// Finds private aminoacid mutations.
///
/// For a simpler version with explanation see the sister function for nucleotide mutations
pub fn find_private_aa_mutations(
  node: &AuspiceGraphNodePayload,
  aa_substitutions: &[AaSub],
  aa_deletions: &[AaDel],
  aa_unknowns: &[CdsAaRange],
  aa_unsequenced_ranges: &BTreeMap<String, Vec<AaRefRange>>,
  ref_translation: &Translation,
  qry_translation: &Translation,
  gene_map: &GeneMap,
  aln: &NucAlignment,
  substitutions: &[NucSub],
  deletions: &[NucDelRange],
) -> Result<BTreeMap<String, PrivateAaMutations>, Report> {
  gene_map
    .iter_cdses()
    .filter_map(|cds| {
      node
        .tmp
        .aa_mutations
        .get(&cds.name)
        .map(|node_mut_map| (cds, node, node_mut_map))
    })
    .map(|(cds, node, node_mut_map)| {
      let aln = NucAlignmentWithOverlay::new(aln, &node.tmp.mutations);

      let ref_peptide = ref_translation.get_cds(&cds.name)?;
      let qry_peptide = qry_translation.get_cds(&cds.name)?;

      let empty = btreemap! {};
      let node_aa_muts = node.tmp.aa_mutations.get(&cds.name).unwrap_or(&empty);
      let tr = AaAlignment::new(cds, ref_peptide, qry_peptide);
      let tr = AaAlignmentView::new(&tr, node_aa_muts);

      let empty = vec![];
      let aa_unsequenced_ranges = aa_unsequenced_ranges.get(&cds.name).unwrap_or(&empty);

      let aa_substitutions = aa_substitutions
        .iter()
        .filter(|sub| sub.cds_name == cds.name)
        .collect_vec();

      let aa_deletions = aa_deletions.iter().filter(|del| del.cds_name == cds.name).collect_vec();

      let aa_unknowns = aa_unknowns.iter().filter(|unk| unk.cds_name == cds.name).collect_vec();

      let private_aa_mutations = find_private_aa_mutations_for_one_gene(
        &tr,
        node_mut_map,
        &aa_substitutions,
        &aa_deletions,
        &aa_unknowns,
        aa_unsequenced_ranges,
        &aln,
        substitutions,
        deletions,
      );

      Ok((cds.name.clone(), private_aa_mutations))
    })
    .collect()
}

pub fn find_private_aa_mutations_for_one_gene(
  tr: &impl AaAlignmentAbstract,
  node_mut_map: &BTreeMap<AaRefPosition, Aa>,
  aa_substitutions: &[&AaSub],
  aa_deletions: &[&AaDel],
  aa_unknowns: &[&CdsAaRange],
  aa_unsequenced_ranges: &[AaRefRange],
  aln: &impl NucAlignmentAbstract,
  substitutions: &[NucSub],
  deletions: &[NucDelRange],
) -> PrivateAaMutations {
  let cds = tr.cds();

  // Remember which positions we cover while iterating sequence mutations,
  // to be able to skip them when we iterate over node mutations
  let mut seq_positions_mutated_or_deleted = BTreeSet::<AaRefPosition>::new();
  // Iterate over sequence substitutions
  let non_reversion_substitutions = process_seq_substitutions(
    cds,
    node_mut_map,
    aa_substitutions,
    &mut seq_positions_mutated_or_deleted,
  );

  // Iterate over sequence deletions
  let non_reversion_deletions =
    process_seq_deletions(cds, node_mut_map, aa_deletions, &mut seq_positions_mutated_or_deleted);

  // Iterate over node substitutions and deletions and find reversions
  let reversion_substitutions = find_reversions(
    tr,
    node_mut_map,
    aa_unknowns,
    aa_unsequenced_ranges,
    &seq_positions_mutated_or_deleted,
  );

  let mut private_substitutions = concat_to_vec(&reversion_substitutions, &non_reversion_substitutions);
  private_substitutions.sort();
  private_substitutions.dedup();

  let mut private_deletions = non_reversion_deletions;
  private_deletions.sort();
  private_deletions.dedup();

  let total_private_substitutions = private_substitutions.len();
  let total_private_deletions = private_deletions.len();
  let total_reversion_substitutions = reversion_substitutions.len();

  let grouped = aa_changes_group(&private_substitutions, aln, tr, substitutions, deletions);

  let private_deletion_ranges = group_adjacent(&private_deletions)
    .into_iter()
    .map(|r| AaDelRange::new(r.begin, r.end))
    .collect_vec();

  PrivateAaMutations {
    cds_name: cds.name.clone(),
    private_substitutions,
    private_deletions,
    private_deletion_ranges,
    reversion_substitutions,
    aa_changes_groups: grouped.aa_changes_groups,
    total_private_substitutions,
    total_private_deletions,
    total_reversion_substitutions,
  }
}

/// Iterates over sequence substitutions, compares sequence and node substitutions and finds the private ones.
fn process_seq_substitutions(
  cds: &Cds,
  node_mut_map: &BTreeMap<AaRefPosition, Aa>,
  substitutions: &[&AaSub],
  seq_positions_mutated_or_deleted: &mut BTreeSet<AaRefPosition>,
) -> Vec<AaSub> {
  let mut non_reversion_substitutions = Vec::<AaSub>::new();

  for seq_mut in substitutions {
    let pos = seq_mut.pos;
    seq_positions_mutated_or_deleted.insert(pos);

    if seq_mut.qry_aa.is_unknown() {
      // Cases 5/6: Unknown in sequence
      // Action: Skip nucleotide N and aminoacid X in sequence.
      //         We don't know whether they match the node character or not,
      //         so we decide to not take them into account.
      continue;
    }

    match node_mut_map.get(&pos) {
      None => {
        // Case 3: Mutation in sequence but not in node, i.e. a newly occurred mutation.
        // Action: Add the sequence mutation itself.
        non_reversion_substitutions.push(AaSub {
          cds_name: cds.name.clone(),
          ref_aa: seq_mut.ref_aa,
          pos,
          qry_aa: seq_mut.qry_aa,
        });
      }
      Some(node_qry) => {
        if &seq_mut.qry_aa != node_qry {
          // Case 2: Mutation in sequence and in node, but the query character is not the same.
          // Action: Add mutation from node query character to sequence query character.
          non_reversion_substitutions.push(AaSub {
            cds_name: cds.name.clone(),
            ref_aa: *node_qry,
            pos,
            qry_aa: seq_mut.qry_aa,
          });
        }
      }
    }

    // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
    // nothing to do.
  }

  non_reversion_substitutions.sort();
  non_reversion_substitutions.dedup();

  non_reversion_substitutions
}

/// Iterates over sequence deletions, compares sequence and node deletion and finds the private ones.
///
/// This is a generic declaration, but the implementation for nucleotide and aminoacid deletions is different and the
/// two specializations are provided below. This is due to deletions having different data structure for nucleotides
/// and for amino acids (range vs point).
fn process_seq_deletions(
  cds: &Cds,
  node_mut_map: &BTreeMap<AaRefPosition, Aa>,
  deletions: &[&AaDel],
  seq_positions_mutated_or_deleted: &mut BTreeSet<AaRefPosition>,
) -> Vec<AaDel> {
  let mut non_reversion_deletions = Vec::<AaDel>::new();

  for del in deletions {
    let pos = del.pos;
    seq_positions_mutated_or_deleted.insert(pos);

    match node_mut_map.get(&pos) {
      None => {
        // Case 3: Mutation in sequence but not in node, i.e. a newly occurred mutation.
        // Action: Add the sequence mutation itself.
        non_reversion_deletions.push(AaDel {
          cds_name: cds.name.clone(),
          ref_aa: del.ref_aa,
          pos,
        });
      }
      Some(node_qry) => {
        if !node_qry.is_gap() {
          // Case 2: Mutation in sequence and in node, but the query character is not the same.
          // Action: Add mutation from node query character to sequence query character.
          non_reversion_deletions.push(AaDel {
            cds_name: cds.name.clone(),
            ref_aa: *node_qry,
            pos,
          });
        }
      }
    }

    // Otherwise case 1: mutation in sequence and in node, same query character, i.e. the mutation is not private:
    // nothing to do.
  }

  non_reversion_deletions.sort();
  non_reversion_deletions.dedup();

  non_reversion_deletions
}

/// Iterates over node mutations, compares node and sequence mutations and finds reversion mutations.
fn find_reversions(
  tr: &impl AaAlignmentAbstract,
  node_mut_map: &BTreeMap<AaRefPosition, Aa>,
  aa_unknowns: &[&CdsAaRange],
  aa_unsequenced_ranges: &[AaRefRange],
  seq_positions_mutated_or_deleted: &BTreeSet<AaRefPosition>,
) -> Vec<AaSub> {
  let mut reversion_substitutions = Vec::<AaSub>::new();

  for (pos, node_qry) in node_mut_map {
    let pos = *pos;
    let seq_has_no_mut_or_del_here = !seq_positions_mutated_or_deleted.contains(&pos);
    let pos_is_sequenced = is_aa_sequenced(pos, aa_unknowns, aa_unsequenced_ranges);
    if seq_has_no_mut_or_del_here && pos_is_sequenced {
      // Case 4: Mutation in node, but not in sequence. This is a so-called reversion or un-deletion.
      // State in sequence reverts the character to ref seq. (the case when un-deleted state is mutated in
      // handled in process_seq_substitutions)
      // Action: Add mutation from node query character to character in reference sequence.
      reversion_substitutions.push(AaSub {
        cds_name: tr.cds().name.clone(),
        ref_aa: *node_qry,
        pos,
        qry_aa: tr.ref_at(pos),
      });
    }
  }

  reversion_substitutions.sort();
  reversion_substitutions.dedup();

  reversion_substitutions
}
