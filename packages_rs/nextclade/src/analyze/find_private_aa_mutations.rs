use crate::analyze::aa_changes::{AaDel, AaSub};
use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::is_sequenced::is_aa_sequenced;
use crate::analyze::letter_ranges::GeneAaRange;
use crate::io::aa::Aa;
use crate::io::gene_map::GeneMap;
use crate::io::letter::Letter;
use crate::translate::translate_genes::Translation;
use crate::tree::tree::AuspiceTreeNode;
use crate::utils::collections::concat_to_vec;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, BTreeSet};

#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PrivateAaMutations {
  pub private_substitutions: Vec<AaSubMinimal>,
  pub private_deletions: Vec<AaDelMinimal>,
  pub reversion_substitutions: Vec<AaSubMinimal>,
  pub total_private_substitutions: usize,
  pub total_private_deletions: usize,
  pub total_reversion_substitutions: usize,
}

/// Finds private aminoacid mutations.
///
/// For a simpler version with explanation see the sister function for nucleotide mutations
pub fn find_private_aa_mutations(
  node: &AuspiceTreeNode,
  aa_substitutions: &[AaSub],
  aa_deletions: &[AaDel],
  aa_unknowns: &[GeneAaRange],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
) -> BTreeMap<String, PrivateAaMutations> {
  gene_map
    .iter_genes()
    .filter_map(|gene| match node.tmp.aa_mutations.get(&gene.name) {
      //node.tmp contains mutations accumulated from root
      None => None,
      Some(node_mut_map) => {
        let ref_peptide = ref_peptides.get_cds(&gene.name).unwrap();

        let aa_substitutions = aa_substitutions
          .iter()
          .filter(|sub| sub.gene == gene.name)
          .collect_vec();
        let aa_deletions = aa_deletions.iter().filter(|del| del.gene == gene.name).collect_vec();
        let aa_unknowns = aa_unknowns
          .iter()
          .filter(|unk| unk.gene_name == gene.name)
          .collect_vec();

        let private_aa_mutations = find_private_aa_mutations_for_one_gene(
          node_mut_map,
          &aa_substitutions,
          &aa_deletions,
          &aa_unknowns,
          &ref_peptide.seq,
        );

        Some((gene.name.clone(), private_aa_mutations))
      }
    })
    .collect()
}

pub fn find_private_aa_mutations_for_one_gene(
  node_mut_map: &BTreeMap<usize, Aa>,
  aa_substitutions: &[&AaSub],
  aa_deletions: &[&AaDel],
  aa_unknowns: &[&GeneAaRange],
  ref_peptide: &[Aa],
) -> PrivateAaMutations {
  // Remember which positions we cover while iterating sequence mutations,
  // to be able to skip them when we iterate over node mutations
  let mut seq_positions_mutated_or_deleted = BTreeSet::<usize>::new();

  // Iterate over sequence substitutions
  let non_reversion_substitutions =
    process_seq_substitutions(node_mut_map, aa_substitutions, &mut seq_positions_mutated_or_deleted);

  // Iterate over sequence deletions
  let non_reversion_deletions = process_seq_deletions(
    node_mut_map,
    aa_deletions,
    ref_peptide,
    &mut seq_positions_mutated_or_deleted,
  );

  // Iterate over node substitutions and deletions and find reversions
  let reversion_substitutions = find_reversions(
    node_mut_map,
    aa_unknowns,
    ref_peptide,
    &mut seq_positions_mutated_or_deleted,
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

  PrivateAaMutations {
    private_substitutions,
    private_deletions,
    reversion_substitutions,
    total_private_substitutions,
    total_private_deletions,
    total_reversion_substitutions,
  }
}

/// Iterates over sequence substitutions, compares sequence and node substitutions and finds the private ones.
fn process_seq_substitutions(
  node_mut_map: &BTreeMap<usize, Aa>,
  substitutions: &[&AaSub],
  seq_positions_mutated_or_deleted: &mut BTreeSet<usize>,
) -> Vec<AaSubMinimal> {
  let mut non_reversion_substitutions = Vec::<AaSubMinimal>::new();

  for seq_mut in substitutions {
    let pos = seq_mut.pos;
    seq_positions_mutated_or_deleted.insert(pos);

    if seq_mut.qry.is_unknown() {
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
        non_reversion_substitutions.push(AaSubMinimal {
          reff: seq_mut.reff,
          pos,
          qry: seq_mut.qry,
        });
      }
      Some(node_qry) => {
        if &seq_mut.qry != node_qry {
          // Case 2: Mutation in sequence and in node, but the query character is not the same.
          // Action: Add mutation from node query character to sequence query character.
          non_reversion_substitutions.push(AaSubMinimal {
            reff: *node_qry,
            pos,
            qry: seq_mut.qry,
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
  node_mut_map: &BTreeMap<usize, Aa>,
  deletions: &[&AaDel],
  ref_seq: &[Aa],
  seq_positions_mutated_or_deleted: &mut BTreeSet<usize>,
) -> Vec<AaDelMinimal> {
  let mut non_reversion_deletions = Vec::<AaDelMinimal>::new();

  for del in deletions {
    let pos = del.pos;
    seq_positions_mutated_or_deleted.insert(pos);

    match node_mut_map.get(&pos) {
      None => {
        // Case 3: Mutation in sequence but not in node, i.e. a newly occurred mutation.
        // Action: Add the sequence mutation itself.
        non_reversion_deletions.push(AaDelMinimal { reff: del.reff, pos });
      }
      Some(node_qry) => {
        if !node_qry.is_gap() {
          // Case 2: Mutation in sequence and in node, but the query character is not the same.
          // Action: Add mutation from node query character to sequence query character.
          non_reversion_deletions.push(AaDelMinimal { reff: *node_qry, pos });
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
  node_mut_map: &BTreeMap<usize, Aa>,
  aa_unknowns: &[&GeneAaRange],
  ref_peptide: &[Aa],
  seq_positions_mutated_or_deleted: &mut BTreeSet<usize>,
) -> Vec<AaSubMinimal> {
  let mut reversion_substitutions = Vec::<AaSubMinimal>::new();

  for (pos, node_qry) in node_mut_map {
    let pos = *pos;
    let seq_has_no_mut_or_del_here = !seq_positions_mutated_or_deleted.contains(&pos);
    let pos_is_sequenced = is_aa_sequenced(pos, aa_unknowns);
    let is_not_node_deletion = !node_qry.is_gap();
    if seq_has_no_mut_or_del_here && pos_is_sequenced && is_not_node_deletion {
      // Case 4: Mutation in node, but not in sequence. This is a so-called reversion. Mutation in sequence reverts
      // the character to ref seq.
      // Action: Add mutation from node query character to character in reference sequence.
      reversion_substitutions.push(AaSubMinimal {
        reff: *node_qry,
        pos,
        qry: ref_peptide[pos],
      });
    }
  }

  reversion_substitutions.sort();
  reversion_substitutions.dedup();

  reversion_substitutions
}
