use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_sub::NucSub;
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode, TreeNodeAttr};
use crate::utils::range::Range;
use itertools::Itertools;

#[derive(Clone, Debug)]
pub struct TreeFindNearestNodeOutput<'node> {
  pub node: &'node AuspiceTreeNode,
  pub distance: i64,
  pub confidence: f64,
}

/// For a given query sample, finds nearest node on the reference tree (according to the distance metric)
pub fn tree_find_nearest_nodes<'node>(
  tree: &'node AuspiceTree,
  qry_nuc_subs: &[NucSub],
  qry_missing: &[NucRange],
  aln_range: &Range,
) -> Vec<TreeFindNearestNodeOutput<'node>> {
  // Iterate over tree nodes and calculate distance metric between the sample and each node
  let nodes_by_distance = tree
    .iter_depth_first_preorder()
    .map(|(_, node)| {
      let distance = tree_calculate_node_distance(node, qry_nuc_subs, qry_missing, aln_range);
      TreeFindNearestNodeOutput {
        node,
        distance,
        confidence: 0.0,
      }
    })
    .sorted_by_key(|out| out.distance)
    .collect_vec();

  match nodes_by_distance.first() {
    // The first node in the list sorted by distance is one of the nearest nodes (nodes that all have minimum distance)
    Some(first_nearest_node) => {
      // Find all nearest nodes (nodes with the same distance as the first node)
      let min_distance = first_nearest_node.distance;
      let nearest_node_candidates = nodes_by_distance
        .into_iter()
        .filter(|node| node.distance == min_distance)
        .collect_vec();

      // Sort nearest nodes further
      tree_sort_nearest_nodes(&nearest_node_candidates)
    }

    // Unlikely case: if there's no nodes, return parent
    None => vec![TreeFindNearestNodeOutput {
      node: &tree.tree,
      distance: 0,
      confidence: 1.0,
    }],
  }
}

/// Reorder equivalently near nodes according to a metric, from the best to the worst.
/// The first node in the resulting list will be considered "the most nearest" among equally nearest nodes
/// and will be used for clade assignment.
fn tree_sort_nearest_nodes<'node>(
  nearest_node_candidates: &[TreeFindNearestNodeOutput<'node>],
) -> Vec<TreeFindNearestNodeOutput<'node>> {
  // TODO: actually reorder the list or create a new one, and calculate placement confidence for each node
  let confidence_sum = nearest_node_candidates
    .iter()
    .map(|node| {
      node
        .node
        .node_attrs
        .placement_prior
        .to_owned()
        .map_or(0_f64, |attr| libm::exp10(attr.value.parse::<f64>().unwrap_or(-10_f64)))
    })
    .sum::<f64>();
  nearest_node_candidates
    .iter()
    .map(|node| TreeFindNearestNodeOutput {
      node: node.node,
      distance: node.distance,
      confidence: node
        .node
        .node_attrs
        .placement_prior
        .to_owned()
        .map_or(0.0, |attr| libm::exp10(attr.value.parse::<f64>().unwrap_or(-10_f64)) / confidence_sum),
    })
    // Calculate sum of all confidences
    .sorted_by(|a, b| b.confidence.total_cmp(&a.confidence))
    .collect_vec()
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
