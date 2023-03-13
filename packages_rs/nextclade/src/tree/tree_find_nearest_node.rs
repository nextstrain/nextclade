use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_sub::NucSub;
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode, TreeNodeAttr};
use crate::utils::range::Range;
use itertools::Itertools;

pub struct TreeFindNearestNodeOutput<'node> {
  pub node: &'node AuspiceTreeNode,
  pub distance: i64,
}

/// For a given query sample, finds nearest node on the reference tree (according to the distance metric)
pub fn tree_find_nearest_nodes<'node>(
  tree: &'node AuspiceTree,
  qry_nuc_subs: &[NucSub],
  qry_missing: &[NucRange],
  aln_range: &Range,
) -> Vec<TreeFindNearestNodeOutput<'node>> {
  // Iterate over tree nodes and calculate distance metric between the sample and each node
  let nodes_by_placement_score = tree
    .iter_depth_first_preorder()
    .map(|(_, node)| {
      let distance = tree_calculate_node_distance(node, qry_nuc_subs, qry_missing, aln_range);
      TreeFindNearestNodeOutput { node, distance }
    })
    .sorted_by(|a, b| a.distance.cmp(&b.distance))
    .collect_vec();

  if nodes_by_placement_score.is_empty() {
    // Unlikely case: if there's no nodes, return parent
    vec![TreeFindNearestNodeOutput {
      node: &tree.tree,
      distance: 0,
    }]
  } else {
    nodes_by_placement_score
  }
}

/// Calculates distance metric between a given query sample and a tree node
pub fn tree_calculate_node_distance(
  node: &AuspiceTreeNode,
  qry_nuc_subs: &[NucSub],
  qry_missing: &[NucRange],
  aln_range: &Range,
) -> i64 {
  let mut shared_differences = 0_i64;
  let mut shared_sites = 0_i64;

  for qmut in qry_nuc_subs {
    let der = node.tmp.substitutions.get(&qmut.pos);
    if let Some(der) = der {
      // position is also mutated in node
      if qmut.qry == *der {
        shared_differences += 1; // the exact mutation is shared between node and seq
      } else {
        shared_sites += 1; // the same position is mutated, but the states are different
      }
    }
  }

  // determine the number of sites that are mutated in the node but missing in seq.
  // for these we can't tell whether the node agrees with seq
  let mut undetermined_sites = 0_i64;
  for pos in node.tmp.substitutions.keys() {
    if !is_nuc_sequenced(*pos, qry_missing, aln_range) {
      undetermined_sites += 1;
    }
  }

  let total_node_muts = node.tmp.substitutions.len() as i64;
  let total_seq_muts = qry_nuc_subs.len() as i64;

  // calculate distance from set overlaps.
  total_node_muts + total_seq_muts - 2 * shared_differences - shared_sites - undetermined_sites
}
