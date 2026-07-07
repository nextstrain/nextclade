//! Estimation of recombination HMM parameters from the reference tree.
//!
//! The two emission probabilities are statistics of the reference tree, following the issue #1768
//! heuristic: `mu_w` is the mean terminal branch length (typical divergence of a newly attached
//! sequence), and `mu_r` is the typical inter-clade divergence, estimated as the median pairwise
//! substitution distance between leaves of different clades. Both are computed as substitution counts
//! from the per-branch nucleotide mutation lists (which sidesteps the ambiguous Auspice divergence
//! units), normalized by the reference length into per-site probabilities. `gamma` is the closed-form
//! `1 / ref_len`.
//!
//! Each parameter is resolved independently: a value supplied in `pathogen.json` is validated and
//! used verbatim, otherwise the estimate above is used. An out-of-range override is a dataset-level
//! error; when a required estimate is undefined (for example fewer than two clades for `mu_r`) the
//! model is left unresolved and the caller skips detection with a stated reason.

use crate::analyze::recombination::{RecombinationConfig, RecombinationHmmParams, is_hmm_probability};
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
/// A `pathogen.json` override is validated and takes precedence over the estimate. An out-of-range
/// override, or an explicit `muR <= muW`, is a dataset-level error (`Err`). When a required parameter
/// has neither an override nor a definable estimate, or the estimated `muR` does not exceed `muW`,
/// the model is `Skipped` with a stated reason and the caller omits recombination detection.
pub fn resolve_recombination_params(
  config: Option<&RecombinationConfig>,
  graph: &AuspiceGraph,
  ref_len: usize,
) -> Result<RecombinationResolution, Report> {
  let gamma = resolve_param("gamma", config.and_then(|c| c.gamma), estimate_gamma(ref_len))?;
  let mu_w = resolve_param("muW", config.and_then(|c| c.mu_w), estimate_mu_w(graph, ref_len)?)?;
  let mu_r = resolve_param("muR", config.and_then(|c| c.mu_r), estimate_mu_r(graph, ref_len)?)?;

  let (Some(gamma), Some(mu_w), Some(mu_r)) = (gamma, mu_w, mu_r) else {
    // A required parameter has neither an override nor a definable tree estimate.
    let reason = if count_clades(graph) < 2 {
      RecombinationSkipReason::FewerThanTwoClades
    } else {
      RecombinationSkipReason::TreeEstimateUnavailable
    };
    return Ok(RecombinationResolution::Skipped(reason));
  };

  // The recombinant state must carry elevated mutation density, otherwise it is indistinguishable
  // from wildtype. When both rates come from `pathogen.json` this is a misconfiguration (hard error);
  // a merely degenerate tree estimate skips detection.
  if mu_r <= mu_w {
    let both_explicit = config.and_then(|c| c.mu_w).is_some() && config.and_then(|c| c.mu_r).is_some();
    if both_explicit {
      return make_error!("Recombination parameters in pathogen.json require muR > muW, but got muW={mu_w} and muR={mu_r}");
    }
    return Ok(RecombinationResolution::Skipped(RecombinationSkipReason::RecombinantRateNotElevated { mu_w, mu_r }));
  }

  // `new` is the single invariant gate (range, sticky `gamma < 0.5`, `mu_r > mu_w`); see
  // `RecombinationHmmParams::validate`. The `mu_r <= mu_w` branch above is policy, not validation: it
  // decides whether a non-elevated rate is a misconfiguration (error) or a degenerate estimate (skip).
  Ok(RecombinationResolution::Resolved(RecombinationHmmParams::new(
    gamma, mu_w, mu_r,
  )?))
}

/// Outcome of resolving recombination parameters for a dataset.
#[derive(Debug, Clone)]
pub enum RecombinationResolution {
  /// Detection runs with these parameters.
  Resolved(RecombinationHmmParams),
  /// Detection is skipped for the stated reason. Not an error: the dataset cannot support detection.
  Skipped(RecombinationSkipReason),
}

/// Why recombination detection was skipped for a dataset despite being enabled.
#[derive(Debug, Clone)]
pub enum RecombinationSkipReason {
  /// The reference tree has fewer than two clades, so inter-clade divergence (`muR`) is undefined.
  FewerThanTwoClades,
  /// A required parameter could not be estimated from the tree (degenerate topology or no leaves).
  TreeEstimateUnavailable,
  /// The estimated recombinant rate does not exceed the wildtype rate, so the states are indistinguishable.
  RecombinantRateNotElevated { mu_w: f64, mu_r: f64 },
}

impl RecombinationSkipReason {
  /// Human-readable explanation, for logs and the per-sequence `warnings` output.
  pub fn message(&self) -> String {
    match self {
      Self::FewerThanTwoClades => {
        "the reference tree has fewer than two clades, so the recombinant divergence rate (muR) cannot be estimated".to_owned()
      }
      Self::TreeEstimateUnavailable => {
        "a required parameter could not be estimated from the reference tree (degenerate topology)".to_owned()
      }
      Self::RecombinantRateNotElevated { mu_w, mu_r } => {
        format!("the estimated recombinant divergence rate does not exceed the wildtype rate (muW={mu_w}, muR={mu_r})")
      }
    }
  }
}

/// Resolve one parameter: a validated `pathogen.json` override takes precedence over the estimate.
/// An out-of-range explicit override is a dataset-level error; an absent override with an undefined
/// estimate yields `None`, so the caller skips detection.
fn resolve_param(name: &str, override_val: Option<OrderedFloat<f64>>, estimate: Option<f64>) -> Result<Option<f64>, Report> {
  match override_val {
    Some(value) => {
      let value = value.0;
      if !is_hmm_probability(value) {
        return make_error!(
          "Recombination parameter `{name}` in pathogen.json must be in the open interval (0, 1), but got {value}"
        );
      }
      Ok(Some(value))
    }
    None => Ok(estimate),
  }
}

/// Number of distinct clade labels present in the tree.
fn count_clades(graph: &AuspiceGraph) -> usize {
  graph.iter_nodes().filter_map(|node| node.payload().clade()).unique().count()
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

/// Recombinant emission fallback: median pairwise inter-clade leaf distance (substitutions) per site.
fn estimate_mu_r(graph: &AuspiceGraph, ref_len: usize) -> Result<Option<f64>, Report> {
  let mut clade_leaves: BTreeMap<String, Vec<GraphNodeKey>> = BTreeMap::new();
  for node in graph.iter_nodes() {
    if node.is_leaf()
      && let Some(clade) = node.payload().clade()
    {
      clade_leaves.entry(clade).or_default().push(node.key());
    }
  }

  if clade_leaves.len() < 2 {
    return Ok(None);
  }

  // Precompute root distances for all leaves to avoid repeated tree walks.
  let root_dists: BTreeMap<GraphNodeKey, usize> = clade_leaves
    .values()
    .flatten()
    .map(|&key| root_distance(graph, key).map(|d| (key, d)))
    .try_collect()?;

  // Exhaustive pairwise distances between leaves of different clades.
  let clade_groups: Vec<&Vec<GraphNodeKey>> = clade_leaves.values().collect();
  let mut distances: Vec<f64> = Vec::new();

  for (i, leaves_a) in clade_groups.iter().enumerate() {
    for leaves_b in &clade_groups[i + 1..] {
      for &a in *leaves_a {
        for &b in *leaves_b {
          let mrca = mrca_pair(graph, a, b)?;
          let mrca_rd = root_distance(graph, mrca)?;
          let d = root_dists[&a] + root_dists[&b] - 2 * mrca_rd;
          distances.push(d as f64);
        }
      }
    }
  }

  Ok(median(&distances).and_then(|d| as_probability(d / ref_len as f64)))
}

/// Number of nucleotide substitutions/mutations on the branch leading to this node.
fn nuc_mutation_count(payload: &AuspiceGraphNodePayload) -> usize {
  payload
    .branch_attrs
    .mutations
    .get(NUC_MUTATIONS_KEY)
    .map_or(0, Vec::len)
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
    f64::midpoint(sorted[mid - 1], sorted[mid])
  })
}

/// Accept a value only if it is a valid emission/transition probability in the open interval `(0, 1)`.
fn as_probability(x: f64) -> Option<f64> {
  is_hmm_probability(x).then_some(x)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::tree::tree::AuspiceTree;
  use pretty_assertions::assert_eq;

  const REF_LEN: usize = 100;

  // Two clades A and B. Leaves: A1 (2 nuc muts), B1 (1 mut on B + 1 own = rd 2), B2 (1 + 3 = rd 4).
  // Mean terminal branch length = (2+1+3)/3 = 2 -> mu_w = 2/100 = 0.02.
  // Inter-clade leaf pairs: A1<->B1 = 2+2-0 = 4, A1<->B2 = 2+4-0 = 6.
  // median{4, 6} = 5 -> mu_r = 5/100 = 0.05. gamma = 1/100 = 0.01.
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

  // Three clades A, B, C. An unlabeled internal node I (1 mut) parents leaves A1 (clade A, 2 muts)
  // and B1 (clade B, 4 muts); leaf C1 (clade C, 6 muts) hangs off the root. All clades are
  // single-leaf, so the leaf-based estimate equals the old founder-based one. A1 and B1 share the
  // non-root MRCA I.
  fn three_clade_tree() -> AuspiceGraph {
    let json = r#"{
      "version": "v2",
      "meta": {},
      "tree": {
        "name": "root",
        "node_attrs": { "div": 0 },
        "children": [
          {
            "name": "I",
            "node_attrs": { "div": 1 },
            "branch_attrs": { "mutations": { "nuc": ["A5C"] } },
            "children": [
              {
                "name": "A1",
                "node_attrs": { "div": 3, "clade_membership": { "value": "A" } },
                "branch_attrs": { "mutations": { "nuc": ["A10C", "A20G"] } }
              },
              {
                "name": "B1",
                "node_attrs": { "div": 5, "clade_membership": { "value": "B" } },
                "branch_attrs": { "mutations": { "nuc": ["A30T", "A40C", "A50G", "A60T"] } }
              }
            ]
          },
          {
            "name": "C1",
            "node_attrs": { "div": 6, "clade_membership": { "value": "C" } },
            "branch_attrs": { "mutations": { "nuc": ["A70C", "A80G", "A90T", "A100C", "A110G", "A120T"] } }
          }
        ]
      }
    }"#;
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  // Nested clades: "child" is nested inside "parent" with a short founder separation (1 mut) but
  // large terminal branches on "child" leaves. The old founder-based estimate would give mu_r=0.05
  // (barely above mu_w=0.04), while the leaf-based estimate gives mu_r=0.09.
  //
  //   root (0 muts)
  //   |-- P (1 mut, clade "parent")
  //   |   |-- P1 (1 mut, clade "parent") -- leaf, rd=2
  //   |   |-- C (1 mut, clade "child")
  //   |   |   |-- C1 (8 muts, clade "child") -- leaf, rd=10
  //   |   |   +-- C2 (6 muts, clade "child") -- leaf, rd=8
  //   |   +-- P2 (1 mut, clade "parent") -- leaf, rd=2
  //   +-- O1 (4 muts, clade "other") -- leaf, rd=4
  fn nested_clade_tree() -> AuspiceGraph {
    let json = r#"{
      "version": "v2",
      "meta": {},
      "tree": {
        "name": "root",
        "node_attrs": { "div": 0 },
        "children": [
          {
            "name": "P",
            "node_attrs": { "div": 1, "clade_membership": { "value": "parent" } },
            "branch_attrs": { "mutations": { "nuc": ["A1C"] } },
            "children": [
              {
                "name": "P1",
                "node_attrs": { "div": 2, "clade_membership": { "value": "parent" } },
                "branch_attrs": { "mutations": { "nuc": ["A2C"] } }
              },
              {
                "name": "C",
                "node_attrs": { "div": 2, "clade_membership": { "value": "child" } },
                "branch_attrs": { "mutations": { "nuc": ["A3C"] } },
                "children": [
                  {
                    "name": "C1",
                    "node_attrs": { "div": 10, "clade_membership": { "value": "child" } },
                    "branch_attrs": { "mutations": { "nuc": ["A10C","A11C","A12C","A13C","A14C","A15C","A16C","A17C"] } }
                  },
                  {
                    "name": "C2",
                    "node_attrs": { "div": 8, "clade_membership": { "value": "child" } },
                    "branch_attrs": { "mutations": { "nuc": ["A20C","A21C","A22C","A23C","A24C","A25C"] } }
                  }
                ]
              },
              {
                "name": "P2",
                "node_attrs": { "div": 2, "clade_membership": { "value": "parent" } },
                "branch_attrs": { "mutations": { "nuc": ["A30C"] } }
              }
            ]
          },
          {
            "name": "O1",
            "node_attrs": { "div": 4, "clade_membership": { "value": "other" } },
            "branch_attrs": { "mutations": { "nuc": ["A40C","A41C","A42C","A43C"] } }
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

  // Exact equality is correct here: the estimator performs the same deterministic integer arithmetic
  // (small counts divided by ref_len), so results are bit-identical to the expected literals.
  /// Unwrap a resolution to its parameters, panicking with context otherwise.
  fn resolved(resolution: RecombinationResolution) -> RecombinationHmmParams {
    match resolution {
      RecombinationResolution::Resolved(params) => params,
      other => panic!("expected resolved parameters, got {other:?}"),
    }
  }

  #[allow(clippy::float_cmp)]
  #[test]
  fn test_recombination_estimate_all_params_from_tree() {
    let graph = two_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    assert_eq!(1.0 / 100.0, params.gamma);
    assert_eq!(2.0 / 100.0, params.mu_w);
    assert_eq!(5.0 / 100.0, params.mu_r);
  }

  #[allow(clippy::float_cmp)]
  #[test]
  fn test_recombination_estimate_config_override_is_used_verbatim() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: true,
      gamma: Some(OrderedFloat(0.1)),
      mu_w: None,
      mu_r: None,
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    assert_eq!(0.1, params.gamma);
    assert_eq!(2.0 / 100.0, params.mu_w);
    assert_eq!(5.0 / 100.0, params.mu_r);
  }

  #[allow(clippy::float_cmp)]
  #[test]
  fn test_recombination_estimate_partial_mu_overrides_used() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: true,
      gamma: None,
      mu_w: Some(OrderedFloat(0.01)),
      mu_r: Some(OrderedFloat(0.2)),
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    assert_eq!(1.0 / 100.0, params.gamma); // still estimated
    assert_eq!(0.01, params.mu_w);
    assert_eq!(0.2, params.mu_r);
  }

  #[test]
  fn test_recombination_estimate_single_clade_is_unresolved() {
    let graph = single_clade_tree();
    // mu_r is undefined with a single clade and there is no override, so the model is skipped.
    let resolution = resolve_recombination_params(None, &graph, REF_LEN).unwrap();
    assert!(
      matches!(resolution, RecombinationResolution::Skipped(RecombinationSkipReason::FewerThanTwoClades)),
      "got {resolution:?}"
    );
  }

  #[test]
  fn test_recombination_estimate_skips_when_recombinant_rate_not_elevated() {
    let graph = two_clade_tree(); // estimated mu_w = 0.02
    // Only muR is overridden (0.01 <= muW), so this is a degenerate estimate, not a misconfiguration: skip.
    let config = RecombinationConfig {
      enabled: true,
      gamma: None,
      mu_w: None,
      mu_r: Some(OrderedFloat(0.01)),
    };
    let resolution = resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap();
    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::RecombinantRateNotElevated { .. })
      ),
      "got {resolution:?}"
    );
  }

  #[test]
  fn test_recombination_estimate_errors_on_explicit_non_elevated_rate() {
    let graph = two_clade_tree();
    // Both rates explicit with muR <= muW: a misconfiguration, reported as a dataset-level error.
    let config = RecombinationConfig {
      enabled: true,
      gamma: None,
      mu_w: Some(OrderedFloat(0.05)),
      mu_r: Some(OrderedFloat(0.01)),
    };
    let err = resolve_recombination_params(Some(&config), &graph, REF_LEN)
      .unwrap_err()
      .to_string();
    assert!(err.contains("muR > muW"), "error `{err}` should require muR > muW");
  }

  #[test]
  fn test_recombination_estimate_errors_on_high_gamma_override() {
    let graph = two_clade_tree();
    // gamma = 0.7 is within (0, 1) but not a sticky HMM; the resolution surfaces the model error.
    let config = RecombinationConfig {
      enabled: true,
      gamma: Some(OrderedFloat(0.7)),
      mu_w: None,
      mu_r: None,
    };
    let err = resolve_recombination_params(Some(&config), &graph, REF_LEN)
      .unwrap_err()
      .to_string();
    assert!(err.contains("gamma < 0.5"), "error `{err}` should require gamma < 0.5");
  }

  #[test]
  fn test_recombination_estimate_errors_on_out_of_range_override() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: true,
      gamma: Some(OrderedFloat(1.5)),
      mu_w: None,
      mu_r: None,
    };
    let err = resolve_recombination_params(Some(&config), &graph, REF_LEN)
      .unwrap_err()
      .to_string();
    assert!(err.contains("gamma"), "error `{err}` should name gamma");
    assert!(err.contains("open interval (0, 1)"), "error `{err}` should state the (0, 1) contract");
  }

  #[allow(clippy::float_cmp)]
  #[test]
  fn test_recombination_estimate_three_clades_uses_nonroot_mrca() {
    // Three single-leaf clades where A1 and B1 share a non-root MRCA `I`, exercising the
    // `- 2 * root_distance(mrca)` term. Root distances: A1=3, B1=5, C1=6. Leaf-pair distances:
    //   A1<->B1 through I(rd 1): 3+5-2 = 6;  A1<->C1 through root: 9;  B1<->C1 through root: 11.
    // median{6, 9, 11} = 9 -> mu_r = 0.09. Terminal branches 2, 4, 6 -> mean 4 -> mu_w = 0.04.
    let graph = three_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    assert_eq!(4.0 / 100.0, params.mu_w);
    assert_eq!(9.0 / 100.0, params.mu_r);
  }

  #[allow(clippy::float_cmp)]
  #[test]
  fn test_recombination_estimate_nested_clades_uses_leaf_distance() {
    // Nested clades with short founder separation but large terminal branches. The leaf-based
    // estimate captures the actual inter-clade divergence that the HMM will encounter.
    // Leaf pairs across clades:
    //   parent<->child: {10, 8, 10, 8}  parent<->other: {6, 6}  child<->other: {14, 12}
    // sorted: {6, 6, 8, 8, 10, 10, 12, 14} -> median = (8+10)/2 = 9 -> mu_r = 0.09
    // Terminal branches: 1, 8, 6, 1, 4 -> mean = 4 -> mu_w = 0.04
    let graph = nested_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    assert_eq!(4.0 / 100.0, params.mu_w);
    assert_eq!(9.0 / 100.0, params.mu_r);
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
