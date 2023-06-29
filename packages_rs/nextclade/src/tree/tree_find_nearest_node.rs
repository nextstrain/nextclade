use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_sub::NucSub;
use crate::io::nuc::Nuc;
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode, TreeNodeAttr};
use crate::utils::range::{NucRefGlobalRange, Range};
use itertools::Itertools;

/// Distance and placement prior for a ref tree node
pub struct TreePlacementInfo<'node> {
  pub node: &'node AuspiceTreeNode,
  pub distance: i64,
  pub prior: f64, // prior in non-log scale
}

/// For a given query sample, finds nearest node on the reference tree (according to the distance metric)
pub fn tree_find_nearest_nodes<'node>(
  tree: &'node AuspiceTree,
  qry_nuc_subs: &[NucSub],
  qry_missing: &[NucRange],
  aln_range: &NucRefGlobalRange,
  masked_ranges: &[NucRefGlobalRange],
) -> Vec<TreePlacementInfo<'node>> {
  // Iterate over tree nodes and calculate distance metric between the sample and each node
  let nodes_by_placement_score = tree
    .iter_depth_first_preorder()
    .map(|(_, node)| {
      let distance = tree_calculate_node_distance(node, qry_nuc_subs, qry_missing, aln_range, masked_ranges);
      let prior = get_prior(node);
      TreePlacementInfo { node, distance, prior }
    })
    .sorted_by(|a, b| a.distance.cmp(&b.distance).then(b.prior.total_cmp(&a.prior)))
    .collect_vec();

  if nodes_by_placement_score.is_empty() {
    // Unlikely case: if there's no nodes, return parent
    vec![TreePlacementInfo {
      node: &tree.tree,
      distance: 0,
      prior: 1.0,
    }]
  } else {
    nodes_by_placement_score
  }
}

/// Gets non-log scale prior from node attributes
fn get_prior(node: &AuspiceTreeNode) -> f64 {
  10.0_f64.powf(
    node
      .node_attrs
      .placement_prior
      .as_ref()
      // Hard coded -10.0 is small but not zero
      .map_or(-10.0, |attr| attr.value),
  )
}

/// Calculates distance metric between a given query sample and a tree node
fn tree_calculate_node_distance(
  node: &AuspiceTreeNode,
  qry_nuc_subs: &[NucSub],
  qry_missing: &[NucRange],
  aln_range: &NucRefGlobalRange,
  masked_ranges: &[NucRefGlobalRange],
) -> i64 {
  let mut shared_differences = 0_i64;
  let mut shared_sites = 0_i64;

  // Mask effectively turns query mutations into missing
  // Rest of logic is the same once qry_nuc_subs and qry_missing are mutated
  // Remove from qry_nuc_subs all mutations that are masked
  let masked_qry_nuc_subs = qry_nuc_subs
    .iter()
    .filter(|sub| !masked_ranges.iter().any(|range| range.contains(sub.pos)))
    .collect_vec();

  // Add all masked ranges to qry_missing
  let masked_qry_missing = masked_ranges
    .iter()
    .map(|range| NucRange {
      range: range.clone(),
      letter: Nuc::N,
    })
    .chain(qry_missing.iter().cloned())
    .collect_vec();

  for qmut in &masked_qry_nuc_subs {
    let node_mut = node.tmp.substitutions.get(&qmut.pos);
    if let Some(node_mut) = node_mut {
      // position is also mutated in node
      if qmut.qry_nuc == *node_mut {
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
    if !is_nuc_sequenced(*pos, &masked_qry_missing, aln_range) {
      undetermined_sites += 1;
    }
  }

  let total_node_muts = node.tmp.substitutions.len() as i64;
  let total_seq_muts = masked_qry_nuc_subs.len() as i64;

  // calculate distance from set overlaps.
  total_node_muts + total_seq_muts - 2 * shared_differences - shared_sites - undetermined_sites
}

#[cfg(test)]
mod tests {
  use std::collections::BTreeMap;

  use crate::io::nuc::Nuc;
  use crate::tree::tree::{TreeBranchAttrs, TreeNodeAttrs, TreeNodeTempData};

  use super::*;
  use crate::utils::position::NucRefGlobalPosition;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};

  /// Default node for testing
  #[fixture]
  fn default_node() -> AuspiceTreeNode {
    AuspiceTreeNode {
      name: "Test".to_owned(),

      branch_attrs: TreeBranchAttrs {
        mutations: BTreeMap::new(),
        other: serde_json::Value::default(),
      },

      node_attrs: TreeNodeAttrs {
        div: None,
        clade_membership: TreeNodeAttr {
          value: "Test_Clade".to_owned(),
          other: serde_json::Value::default(),
        },
        node_type: None,
        region: None,
        country: None,
        division: None,
        placement_prior: None,
        alignment: None,
        missing: None,
        gaps: None,
        non_acgtns: None,
        has_pcr_primer_changes: None,
        pcr_primer_changes: None,
        qc_status: None,
        missing_genes: None,
        other: serde_json::Value::default(),
      },

      children: vec![],

      tmp: TreeNodeTempData::default(),

      other: serde_json::Value::default(),
    }
  }

  fn simple_qry_nuc_subs() -> Vec<NucSub> {
    vec![
      NucSub {
        ref_nuc: Nuc::A,
        pos: 3.into(),
        qry_nuc: Nuc::C,
      },
      NucSub {
        ref_nuc: Nuc::A,
        pos: 7.into(),
        qry_nuc: Nuc::C,
      },
      NucSub {
        ref_nuc: Nuc::A,
        pos: 12.into(),
        qry_nuc: Nuc::C,
      },
    ]
  }

  fn simple_qry_missing() -> Vec<NucRange> {
    vec![
      NucRange {
        range: Range::from_usize(8, 10),
        letter: Nuc::N,
      },
      NucRange {
        range: Range::from_usize(20, 30),
        letter: Nuc::N,
      },
    ]
  }

  fn simple_node_nuc_subs() -> BTreeMap<NucRefGlobalPosition, Nuc> {
    vec![
      (3.into(), Nuc::T),
      (12.into(), Nuc::C),
      (15.into(), Nuc::T),
      (23.into(), Nuc::G),
      (35.into(), Nuc::G),
    ]
    .into_iter()
    .collect()
  }

  fn node_with_simple_nuc_subs() -> AuspiceTreeNode {
    let mut node = default_node();
    node.tmp.substitutions = simple_node_nuc_subs();
    node
  }

  #[rstest]
  fn no_mutation_zero_distance() -> Result<(), Report> {
    let node = default_node();
    let qry_nuc_subs: Vec<NucSub> = vec![];
    let qry_missing: Vec<NucRange> = vec![];
    let aln_range = NucRefGlobalRange::from_usize(0, 100);
    let masked_ranges = vec![];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 0);

    Ok(())
  }

  #[rstest]
  fn query_mutations_only() -> Result<(), Report> {
    let node = default_node();
    let qry_nuc_subs = simple_qry_nuc_subs();
    let qry_missing: Vec<NucRange> = vec![];
    let aln_range = NucRefGlobalRange::from_usize(0, 100);
    let masked_ranges = vec![];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 3);

    Ok(())
  }

  #[rstest]
  fn node_mutations_only() -> Result<(), Report> {
    let node = node_with_simple_nuc_subs();
    let qry_nuc_subs: Vec<NucSub> = vec![];
    let qry_missing: Vec<NucRange> = vec![];
    let aln_range = NucRefGlobalRange::from_usize(0, 100);
    let masked_ranges = vec![];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 5);

    Ok(())
  }

  #[rstest]
  fn shared_mutations() -> Result<(), Report> {
    let node = node_with_simple_nuc_subs();
    let qry_nuc_subs = simple_qry_nuc_subs();
    let qry_missing: Vec<NucRange> = vec![];
    let aln_range = NucRefGlobalRange::from_usize(0, 100);
    let masked_ranges = vec![];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 5);

    Ok(())
  }

  #[rstest]
  fn shared_mutations_with_missing() -> Result<(), Report> {
    let node = node_with_simple_nuc_subs();
    let qry_nuc_subs = simple_qry_nuc_subs();
    let qry_missing = simple_qry_missing();
    let aln_range = NucRefGlobalRange::from_usize(0, 100);
    let masked_ranges = vec![];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 4);

    Ok(())
  }

  #[rstest]
  fn shared_mutations_clipped_range() -> Result<(), Report> {
    let node = node_with_simple_nuc_subs();
    let qry_nuc_subs = simple_qry_nuc_subs();
    let qry_missing: Vec<NucRange> = vec![];
    let aln_range = NucRefGlobalRange::from_usize(0, 20);
    let masked_ranges = vec![];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 3);

    Ok(())
  }

  #[rstest]
  fn shared_mutations_all_masked() -> Result<(), Report> {
    let node = node_with_simple_nuc_subs();
    let qry_nuc_subs = simple_qry_nuc_subs();
    let qry_missing: Vec<NucRange> = vec![];
    let aln_range = NucRefGlobalRange::from_usize(0, 100);
    let masked_ranges = vec![NucRefGlobalRange::from_usize(0, 100)];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 0);

    Ok(())
  }

  #[rstest]
  /// Equivalent to shared_mutations but with a mask -> distance 3 instead of 5
  fn shared_mutations_some_masked() -> Result<(), Report> {
    let node = node_with_simple_nuc_subs();
    let qry_nuc_subs = simple_qry_nuc_subs();
    let qry_missing: Vec<NucRange> = vec![];
    let aln_range = NucRefGlobalRange::from_usize(0, 100);
    let masked_ranges = vec![
      NucRefGlobalRange::from_usize(0, 5),
      NucRefGlobalRange::from_usize(30, 50),
    ];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 3);

    Ok(())
  }

  #[rstest]
  fn shared_mutations_all_combinations() -> Result<(), Report> {
    let node = node_with_simple_nuc_subs();
    let qry_nuc_subs = simple_qry_nuc_subs();
    let qry_missing = simple_qry_missing();
    let aln_range = NucRefGlobalRange::from_usize(0, 30);
    let masked_ranges = vec![NucRefGlobalRange::from_usize(12, 13)];

    let result = tree_calculate_node_distance(&node, &qry_nuc_subs, &qry_missing, &aln_range, &masked_ranges);

    assert_eq!(result, 3);

    Ok(())
  }
}
