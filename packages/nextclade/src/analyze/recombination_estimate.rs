//! Estimation of recombination HMM parameters from the reference tree.
//!
//! The two emission probabilities are statistics of the reference tree, following the meeting-notes
//! heuristic (issue #1768): `mu_w` is the mean terminal branch length and `mu_r` is the typical
//! divergence between different clades. Both are computed as substitution counts (from the per-branch
//! nucleotide mutation lists, which sidesteps the ambiguous Auspice divergence units) normalized by
//! the reference length into per-site probabilities. `gamma` is the closed-form `1 / ref_len`.
//!
//! Each parameter is resolved independently: a value supplied in `pathogen.json` is used verbatim,
//! otherwise the estimate below is used. When a required estimate is undefined (for example fewer
//! than two clades for `mu_r`), the whole model is left unresolved and the caller skips detection.

use crate::analyze::recombination::{RecombinationConfig, RecombinationHmmParams};
use crate::graph::node::GraphNodeKey;
use crate::make_error;
use crate::tree::tree::{AuspiceGraph, AuspiceGraphNodePayload};
use eyre::Report;
use indexmap::IndexSet;
use itertools::Itertools;
use ordered_float::OrderedFloat;
use std::collections::BTreeMap;

/// Key under which nucleotide (as opposed to per-gene) mutations are stored in branch attributes.
const NUC_MUTATIONS_KEY: &str = "nuc";

/// Resolve the three HMM parameters, combining `pathogen.json` overrides with tree-based fallbacks.
///
/// Returns `Ok(None)` when the model cannot be built (a required parameter has neither an override
/// nor a definable estimate, or the estimated `mu_r` does not exceed `mu_w`), in which case the
/// caller skips recombination detection for this dataset.
pub fn resolve_recombination_params(
  config: Option<&RecombinationConfig>,
  graph: &AuspiceGraph,
  ref_len: usize,
) -> Result<Option<RecombinationHmmParams>, Report> {
  let override_gamma = config.and_then(|c| c.gamma).map(|g| g.0);
  let override_mu_w = config.and_then(|c| c.mu_w).map(|m| m.0);
  let override_mu_r = config.and_then(|c| c.mu_r).map(|m| m.0);

  let (Some(gamma), Some(mu_w), Some(mu_r)) = (
    override_gamma.or_else(|| estimate_gamma(ref_len)),
    override_mu_w.or(estimate_mu_w(graph, ref_len)?),
    override_mu_r.or(estimate_mu_r(graph, ref_len)?),
  ) else {
    return Ok(None);
  };

  // A meaningful model requires elevated mutation density in the recombinant state.
  if mu_r <= mu_w {
    return Ok(None);
  }

  Ok(Some(RecombinationHmmParams { gamma, mu_w, mu_r }))
}

/// Transition rate fallback: one expected state switch per genome length.
fn estimate_gamma(ref_len: usize) -> Option<f64> {
  as_probability(1.0 / ref_len as f64)
}

/// Wildtype emission fallback: mean terminal branch length (substitutions) per site.
fn estimate_mu_w(graph: &AuspiceGraph, ref_len: usize) -> Result<Option<f64>, Report> {
  let branch_lengths: Vec<usize> = graph
    .iter_nodes()
    .filter(|node| node.is_leaf())
    .map(|node| nuc_mutation_count(node.payload()))
    .collect();

  if branch_lengths.is_empty() {
    return Ok(None);
  }

  let mean = branch_lengths.iter().sum::<usize>() as f64 / branch_lengths.len() as f64;
  Ok(as_probability(mean / ref_len as f64))
}

/// Recombinant emission fallback: median inter-clade founder-to-founder distance (substitutions) per site.
fn estimate_mu_r(graph: &AuspiceGraph, ref_len: usize) -> Result<Option<f64>, Report> {
  let mut clade_members: BTreeMap<String, Vec<GraphNodeKey>> = BTreeMap::new();
  for node in graph.iter_nodes() {
    if let Some(clade) = node.payload().clade() {
      clade_members.entry(clade).or_default().push(node.key());
    }
  }

  // Inter-clade divergence is undefined with fewer than two clades.
  if clade_members.len() < 2 {
    return Ok(None);
  }

  let mut founders: Vec<GraphNodeKey> = Vec::with_capacity(clade_members.len());
  for members in clade_members.values() {
    if let Some(founder) = mrca_of_set(graph, members)? {
      founders.push(founder);
    }
  }
  if founders.len() < 2 {
    return Ok(None);
  }

  let distances: Vec<f64> = founders
    .iter()
    .tuple_combinations()
    .map(|(&a, &b)| founder_distance(graph, a, b).map(|d| d as f64))
    .try_collect()?;

  Ok(median(&distances).and_then(|d| as_probability(d / ref_len as f64)))
}

/// Number of nucleotide substitutions/mutations on the branch leading to this node.
fn nuc_mutation_count(payload: &AuspiceGraphNodePayload) -> usize {
  payload.branch_attrs.mutations.get(NUC_MUTATIONS_KEY).map_or(0, Vec::len)
}

/// Substitution distance between two clade founders: the mutation count along the path through their
/// most recent common ancestor.
fn founder_distance(graph: &AuspiceGraph, a: GraphNodeKey, b: GraphNodeKey) -> Result<usize, Report> {
  let ancestor = mrca_pair(graph, a, b)?;
  Ok(root_distance(graph, a)? + root_distance(graph, b)? - 2 * root_distance(graph, ancestor)?)
}

/// Cumulative substitution count from the root to a node (sum of branch mutation counts).
fn root_distance(graph: &AuspiceGraph, key: GraphNodeKey) -> Result<usize, Report> {
  let mut total = 0;
  let mut current = Some(key);
  while let Some(node_key) = current {
    total += nuc_mutation_count(graph.get_node(node_key)?.payload());
    current = graph.parent_key_of_by_key(node_key);
  }
  Ok(total)
}

/// Most recent common ancestor of a set of nodes. `None` only for an empty set.
fn mrca_of_set(graph: &AuspiceGraph, keys: &[GraphNodeKey]) -> Result<Option<GraphNodeKey>, Report> {
  let Some((&first, rest)) = keys.split_first() else {
    return Ok(None);
  };
  let mut ancestor = first;
  for &key in rest {
    ancestor = mrca_pair(graph, ancestor, key)?;
  }
  Ok(Some(ancestor))
}

/// Most recent common ancestor of two nodes.
fn mrca_pair(graph: &AuspiceGraph, a: GraphNodeKey, b: GraphNodeKey) -> Result<GraphNodeKey, Report> {
  let ancestors_a = ancestors_inclusive(graph, a);
  let mut current = b;
  loop {
    if ancestors_a.contains(&current) {
      return Ok(current);
    }
    match graph.parent_key_of_by_key(current) {
      Some(parent) => current = parent,
      None => return make_error!("Recombination parameter estimation: nodes {a:?} and {b:?} have no common ancestor"),
    }
  }
}

/// A node and all of its ancestors up to and including the root.
fn ancestors_inclusive(graph: &AuspiceGraph, key: GraphNodeKey) -> IndexSet<GraphNodeKey> {
  let mut ancestors = IndexSet::new();
  let mut current = Some(key);
  while let Some(node_key) = current {
    ancestors.insert(node_key);
    current = graph.parent_key_of_by_key(node_key);
  }
  ancestors
}

/// Median of a slice of values, or `None` when empty.
fn median(values: &[f64]) -> Option<f64> {
  if values.is_empty() {
    return None;
  }
  let sorted: Vec<f64> = values.iter().copied().sorted_by_key(|&x| OrderedFloat(x)).collect();
  let mid = sorted.len() / 2;
  Some(if sorted.len() % 2 == 1 {
    sorted[mid]
  } else {
    (sorted[mid - 1] + sorted[mid]) / 2.0
  })
}

/// Accept a value only if it is a valid emission/transition probability in the open interval `(0, 1)`.
fn as_probability(x: f64) -> Option<f64> {
  (x.is_finite() && x > 0.0 && x < 1.0).then_some(x)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::tree::tree::AuspiceTree;
  use pretty_assertions::assert_eq;

  const REF_LEN: usize = 100;

  // Two clades A and B. Leaves (terminal branches): A1 with 2 nuc muts, B1 with 1, B2 with 3, so
  // mean terminal branch length is 2 -> mu_w = 2/100 = 0.02. Clade founders: A1 (clade A) and the
  // internal node B (clade B); their path through the root spans 2 + 1 muts -> distance 3, the only
  // clade pair, so median inter-clade distance is 3 -> mu_r = 3/100 = 0.03. gamma = 1/100 = 0.01.
  fn two_clade_tree() -> AuspiceGraph {
    let json = r#"{
      "version": "v2",
      "meta": {},
      "tree": {
        "name": "root",
        "node_attrs": { "div": 0 },
        "children": [
          {
            "name": "A1",
            "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
            "branch_attrs": { "mutations": { "nuc": ["A10C", "A20G"] } }
          },
          {
            "name": "B",
            "node_attrs": { "div": 1, "clade_membership": { "value": "B" } },
            "branch_attrs": { "mutations": { "nuc": ["A30T"] } },
            "children": [
              {
                "name": "B1",
                "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
                "branch_attrs": { "mutations": { "nuc": ["A40C"] } }
              },
              {
                "name": "B2",
                "node_attrs": { "div": 4, "clade_membership": { "value": "B" } },
                "branch_attrs": { "mutations": { "nuc": ["A50C", "A60G", "A70T"] } }
              }
            ]
          }
        ]
      }
    }"#;
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  fn single_clade_tree() -> AuspiceGraph {
    let json = r#"{
      "version": "v2",
      "meta": {},
      "tree": {
        "name": "root",
        "node_attrs": { "div": 0 },
        "children": [
          {
            "name": "L1",
            "node_attrs": { "div": 1, "clade_membership": { "value": "A" } },
            "branch_attrs": { "mutations": { "nuc": ["A10C"] } }
          },
          {
            "name": "L2",
            "node_attrs": { "div": 1, "clade_membership": { "value": "A" } },
            "branch_attrs": { "mutations": { "nuc": ["A20G"] } }
          }
        ]
      }
    }"#;
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  #[test]
  fn test_recombination_estimate_all_params_from_tree() {
    let graph = two_clade_tree();
    let params = resolve_recombination_params(None, &graph, REF_LEN).unwrap().unwrap();
    assert_eq!(1.0 / 100.0, params.gamma);
    assert_eq!(2.0 / 100.0, params.mu_w);
    assert_eq!(3.0 / 100.0, params.mu_r);
  }

  #[test]
  fn test_recombination_estimate_config_override_is_used_verbatim() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: true,
      gamma: Some(OrderedFloat(0.5)),
      mu_w: None,
      mu_r: None,
    };
    let params = resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap().unwrap();
    assert_eq!(0.5, params.gamma);
    assert_eq!(2.0 / 100.0, params.mu_w);
    assert_eq!(3.0 / 100.0, params.mu_r);
  }

  #[test]
  fn test_recombination_estimate_single_clade_is_unresolved() {
    let graph = single_clade_tree();
    // mu_r is undefined with a single clade and there is no override, so the model is skipped.
    assert_eq!(None, resolve_recombination_params(None, &graph, REF_LEN).unwrap());
  }

  #[test]
  fn test_recombination_estimate_median_even_and_odd() {
    assert_eq!(None, median(&[]));
    assert_eq!(Some(3.0), median(&[3.0]));
    assert_eq!(Some(3.0), median(&[5.0, 1.0, 3.0]));
    assert_eq!(Some(2.5), median(&[1.0, 4.0, 2.0, 3.0]));
  }

  #[test]
  fn test_recombination_estimate_as_probability_bounds() {
    assert_eq!(None, as_probability(0.0));
    assert_eq!(None, as_probability(1.0));
    assert_eq!(None, as_probability(f64::NAN));
    assert_eq!(Some(0.5), as_probability(0.5));
  }
}
