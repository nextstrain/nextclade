use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_sub::NucSub;
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode};
use crate::utils::range::Range;
use itertools::Itertools;
use num_traits::clamp_min;
use ordered_float::OrderedFloat;

pub struct TreeFindNearestNodeOutput<'node> {
  pub node: &'node AuspiceTreeNode,
  pub distance: OrderedFloat<f64>,
}

/// For a given query sample, finds nearest node on the reference tree (according to the distance metric)
pub fn tree_find_nearest_node<'node>(
  tree: &'node AuspiceTree,
  qry_nuc_subs: &[NucSub],
  qry_missing: &[NucRange],
  aln_range: &Range,
) -> TreeFindNearestNodeOutput<'node> {
  // Iterate over tree nodes and calculate distance metric between the sample and each node
  tree
    .iter_depth_first_preorder()
    .map(|(_, node)| {
      let distance = tree_calculate_node_distance(node, qry_nuc_subs, qry_missing, aln_range);
      TreeFindNearestNodeOutput { node, distance }
    })

    // Find nearest node (having minimum distance)
    .min_by_key(|out| out.distance)

    // If none can be found, return default (e.g. if tree is empty, which is unlikely)
    .unwrap_or(TreeFindNearestNodeOutput {
      node: &tree.tree,
      distance: ordered_float::OrderedFloat(0.0),
    })
}

/// Calculates distance metric between a given query sample and a tree node
pub fn tree_calculate_node_distance(
  node: &AuspiceTreeNode,
  qry_nuc_subs: &[NucSub],
  qry_missing: &[NucRange],
  aln_range: &Range,
) -> OrderedFloat<f64> {
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

  let placement_bias = match &node.node_attrs.placement_bias {
    Some(i) => i.value.parse::<f64>().unwrap_or(0.0),
    None => 0.0,
  };

  let bias = clamp_min(placement_bias, 1000_f64 * f64::EPSILON);

  // calculate distance from set overlaps.
  let raw_distance = total_node_muts + total_seq_muts - 2 * shared_differences - shared_sites - undetermined_sites;

  OrderedFloat(raw_distance as f64 + 1.0 - bias)
}
