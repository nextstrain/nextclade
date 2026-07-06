//! Estimation of recombination HMM parameters from the reference tree.
//!
//! The two emission probabilities are statistics of the reference tree, following a tree-based
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

use crate::alphabet::nuc::Nuc;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::recombination::{RecombinationConfig, RecombinationHmmParams, is_hmm_probability};
use crate::graph::node::GraphNodeKey;
use crate::make_error;
use crate::tree::tree::{AuspiceGraph, AuspiceGraphNodePayload};
use eyre::{Report, WrapErr};
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
  // Each parameter is the validated `pathogen.json` override when present, otherwise the tree
  // estimate. The estimate is computed only in the `None` arm, so an explicit override neither pays
  // for the estimator nor is aborted by an estimator error on a difficult tree.
  let gamma = match config.and_then(|c| c.gamma) {
    Some(value) => Some(validate_override("gamma", value)?),
    None => estimate_gamma(ref_len),
  };
  let mu_w = match config.and_then(|c| c.mu_w) {
    Some(value) => Some(validate_override("muW", value)?),
    None => estimate_mu_w(graph, ref_len)?,
  };
  let mu_r = match config.and_then(|c| c.mu_r) {
    Some(value) => Some(validate_override("muR", value)?),
    None => estimate_mu_r(graph, ref_len)?,
  };

  let (Some(gamma), Some(mu_w), Some(mu_r)) = (gamma, mu_w, mu_r) else {
    // A required parameter has neither an override nor a definable tree estimate.
    let reason = if count_clades(graph) < 2 {
      RecombinationSkipReason::FewerThanTwoClades
    } else if !has_any_branch_mutations(graph)? {
      RecombinationSkipReason::NoBranchMutations
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

/// Why recombination detection cannot run for a dataset. When detection is enabled by default this is
/// a silent skip; when it is explicitly requested (`enabled: true`) the caller turns it into an error.
#[derive(Debug, Clone)]
pub enum RecombinationSkipReason {
  /// No reference tree is available; detection needs one for parent-relative mutations.
  NoReferenceTree,
  /// The reference tree has fewer than two clades, so inter-clade divergence (`muR`) is undefined.
  FewerThanTwoClades,
  /// The reference tree carries no per-branch nucleotide mutations, so the divergence rates that
  /// calibrate the model cannot be estimated (for example a tree exported with only divergence values
  /// and no `nuc` mutation lists).
  NoBranchMutations,
  /// A required parameter could not be estimated from the tree (degenerate topology or no leaves).
  TreeEstimateUnavailable,
  /// The estimated recombinant rate does not exceed the wildtype rate, so the states are indistinguishable.
  RecombinantRateNotElevated { mu_w: f64, mu_r: f64 },
}

impl RecombinationSkipReason {
  /// Human-readable explanation, for logs, error messages, and the per-sequence `warnings` output.
  pub fn message(&self) -> String {
    match self {
      Self::NoReferenceTree => "no reference tree is available, and recombination detection requires one to derive \
         parent-relative mutations"
        .to_owned(),
      Self::FewerThanTwoClades => {
        "the reference tree has fewer than two clades, so the recombinant divergence rate (muR) cannot be estimated".to_owned()
      }
      Self::NoBranchMutations => {
        "the reference tree carries no per-branch nucleotide mutations, so the wildtype and recombinant \
         divergence rates cannot be estimated"
          .to_owned()
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

/// Validate a `pathogen.json` parameter override. An out-of-range value is a dataset-level error.
fn validate_override(name: &str, value: OrderedFloat<f64>) -> Result<f64, Report> {
  let value = value.0;
  if !is_hmm_probability(value) {
    return make_error!(
      "Recombination parameter `{name}` in pathogen.json must be in the open interval (0, 1), but got {value}"
    );
  }
  Ok(value)
}

/// Whether any branch in the tree carries at least one nucleotide substitution. When false, the
/// divergence-based rate estimates are undefined (all counts are zero).
fn has_any_branch_mutations(graph: &AuspiceGraph) -> Result<bool, Report> {
  for node in graph.iter_nodes() {
    if nuc_mutation_count(node.payload())? > 0 {
      return Ok(true);
    }
  }
  Ok(false)
}

/// Number of distinct clade labels present among the tree's leaves.
///
/// Counts leaf clades only, matching `estimate_mu_r`'s requirement: `mu_r` is the median pairwise
/// distance between leaves of different clades, so a clade that labels only internal nodes cannot
/// contribute. Counting all nodes here would report "degenerate topology" when the real reason a
/// dataset cannot support detection is that its leaves carry fewer than two clades.
fn count_clades(graph: &AuspiceGraph) -> usize {
  graph
    .iter_nodes()
    .filter(|node| node.is_leaf())
    .filter_map(|node| node.payload().clade())
    .unique()
    .count()
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
    .try_collect()?;

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

  // Precompute root distances for ALL nodes, not only leaves, so the inter-clade distance below needs
  // no second tree walk for the MRCA: each pair costs one map lookup per endpoint plus the single MRCA
  // search. Complexity: O(P) inter-clade leaf pairs times O(depth) per pair for that search; the
  // quadratic pair count is the dominant cost.
  let root_dists: BTreeMap<GraphNodeKey, usize> = graph
    .iter_nodes()
    .map(|node| root_distance(graph, node.key()).map(|d| (node.key(), d)))
    .try_collect()?;

  // Exhaustive pairwise distances between leaves of different clades.
  let clade_groups: Vec<&Vec<GraphNodeKey>> = clade_leaves.values().collect();
  let mut distances: Vec<f64> = Vec::new();

  for (i, leaves_a) in clade_groups.iter().enumerate() {
    for leaves_b in &clade_groups[i + 1..] {
      for &a in *leaves_a {
        // `a` is fixed across the inner loop, so compute its ancestor set once and reuse it for every
        // `b` rather than rebuilding (and reallocating) it per pair.
        let ancestors_a = ancestors_inclusive(graph, a);
        let rd_a = root_dists[&a];
        for &b in *leaves_b {
          let mrca = mrca_with_ancestors(graph, &ancestors_a, b)?;
          let d = rd_a + root_dists[&b] - 2 * root_dists[&mrca];
          distances.push(d as f64);
        }
      }
    }
  }

  Ok(median(&distances).and_then(|d| as_probability(d / ref_len as f64)))
}

/// Number of nucleotide substitutions on the branch leading to this node, excluding deletions.
///
/// The model treats gap characters as missing data, not mutations (mirroring `build_observations`,
/// which routes deletions to `Missing`), so the same ruler calibrates `mu_w`/`mu_r`. Each `nuc`
/// mutation token is parsed as a `<ref><pos><query>` substitution: a token with a gap query base is a
/// deletion and is not counted, while substitutions and insertions (query base present) are. A token
/// that does not parse is a malformed tree annotation and surfaces as an error rather than being
/// silently miscounted. Nextclade-built trees carry substitutions only; deletions appear on externally
/// produced trees (augur/TreeTime) as `"A15-"`.
fn nuc_mutation_count(payload: &AuspiceGraphNodePayload) -> Result<usize, Report> {
  let Some(muts) = payload.branch_attrs.mutations.get(NUC_MUTATIONS_KEY) else {
    return Ok(0);
  };
  let mut count = 0;
  for m in muts {
    let sub: NucSub = m
      .parse()
      .wrap_err_with(|| format!("When counting recombination branch mutations from tree annotation '{m}'"))?;
    if sub.qry_nuc != Nuc::Gap {
      count += 1;
    }
  }
  Ok(count)
}

/// Cumulative substitution count from the root to a node (sum of branch mutation counts).
fn root_distance(graph: &AuspiceGraph, key: GraphNodeKey) -> Result<usize, Report> {
  let mut total = 0;
  let mut current = Some(key);
  while let Some(node_key) = current {
    total += nuc_mutation_count(graph.get_node(node_key)?.payload())?;
    current = graph.parent_key_of_by_key(node_key);
  }
  Ok(total)
}

/// Most recent common ancestor of node `b` and the node whose inclusive ancestor set is `ancestors_a`.
/// Walks `b` toward the root until it reaches a node in `ancestors_a`. The caller precomputes
/// `ancestors_a` once per `a` so it is not rebuilt for every `b`.
fn mrca_with_ancestors(
  graph: &AuspiceGraph,
  ancestors_a: &IndexSet<GraphNodeKey>,
  b: GraphNodeKey,
) -> Result<GraphNodeKey, Report> {
  let mut current = b;
  loop {
    if ancestors_a.contains(&current) {
      return Ok(current);
    }
    match graph.parent_key_of_by_key(current) {
      Some(parent) => current = parent,
      None => {
        return make_error!(
          "Recombination parameter estimation: node {b:?} has no common ancestor with the compared leaf"
        );
      }
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
  use crate::{assert_error, pretty_assert_ulps_eq};
  use crate::tree::tree::AuspiceTree;
  use crate::{assert_error, pretty_assert_ulps_eq};
  use indoc::indoc;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  const REF_LEN: usize = 100;

  // Two clades A and B. Leaves: A1 (2 nuc muts), B1 (1 mut on B + 1 own = rd 2), B2 (1 + 3 = rd 4).
  // Mean terminal branch length = (2+1+3)/3 = 2 -> mu_w = 2/100 = 0.02.
  // Inter-clade leaf pairs: A1<->B1 = 2+2-0 = 4, A1<->B2 = 2+4-0 = 6.
  // median{4, 6} = 5 -> mu_r = 5/100 = 0.05. gamma = 1/100 = 0.01.
  fn two_clade_tree() -> AuspiceGraph {
    let json = indoc! {r#"{
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
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  // Three clades A, B, C. An unlabeled internal node I (1 mut) parents leaves A1 (clade A, 2 muts)
  // and B1 (clade B, 4 muts); leaf C1 (clade C, 6 muts) hangs off the root. A1 and B1 share the
  // non-root MRCA I, exercising the `- 2 * root_distance(mrca)` term with a non-root common ancestor.
  fn three_clade_tree() -> AuspiceGraph {
    let json = indoc! {r#"{
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
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  // Nested clades: "child" is nested inside "parent", their most recent common ancestors one mutation
  // apart, but the "child" leaves carry large terminal branches. This exercises that mu_r is the
  // inter-clade leaf distance (mu_r=0.09 here), driven by the leaves rather than by how close the
  // clade ancestors sit on the tree.
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
    let json = indoc! {r#"{
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
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  fn single_clade_tree() -> AuspiceGraph {
    let json = indoc! {r#"{
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
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  /// Unwrap a resolution to its parameters, panicking with context otherwise.
  fn resolved(resolution: RecombinationResolution) -> RecombinationHmmParams {
    match resolution {
      RecombinationResolution::Resolved(params) => params,
      other => panic!("expected resolved parameters, got {other:?}"),
    }
  }

  // The estimator does deterministic integer arithmetic (small counts divided by ref_len), so results
  // are bit-identical to the expected literals; a `max_ulps = 2` bound compares them exactly while
  // staying robust if a future estimator step introduces a non-exact operation.
  #[test]
  fn test_recombination_estimate_all_params_from_tree() {
    let graph = two_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(1.0 / 100.0, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(2.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(5.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_config_override_is_used_verbatim() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(0.1)),
      mu_w: None,
      mu_r: None,
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(0.1, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(2.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(5.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_partial_mu_overrides_used() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: None,
      mu_w: Some(OrderedFloat(0.01)),
      mu_r: Some(OrderedFloat(0.2)),
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(1.0 / 100.0, params.gamma(), max_ulps = 2); // still estimated
    pretty_assert_ulps_eq!(0.01, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.2, params.mu_r(), max_ulps = 2);
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
      enabled: Some(true),
      min_private_subs_to_run: None,
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
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: None,
      mu_w: Some(OrderedFloat(0.05)),
      mu_r: Some(OrderedFloat(0.01)),
    };
    assert_error!(
      resolve_recombination_params(Some(&config), &graph, REF_LEN),
      "Recombination parameters in pathogen.json require muR > muW, but got muW=0.05 and muR=0.01"
    );
  }

  #[test]
  fn test_recombination_estimate_errors_on_high_gamma_override() {
    let graph = two_clade_tree();
    // gamma = 0.7 is within (0, 1) but not a sticky HMM; the resolution surfaces the model error.
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(0.7)),
      mu_w: None,
      mu_r: None,
    };
    assert_error!(
      resolve_recombination_params(Some(&config), &graph, REF_LEN),
      "Recombination HMM requires gamma < 0.5 (state switching must be rarer than staying), but got gamma=0.7"
    );
  }

  #[test]
  fn test_recombination_estimate_errors_on_out_of_range_override() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(1.5)),
      mu_w: None,
      mu_r: None,
    };
    assert_error!(
      resolve_recombination_params(Some(&config), &graph, REF_LEN),
      "Recombination parameter `gamma` in pathogen.json must be in the open interval (0, 1), but got 1.5"
    );
  }

  #[test]
  fn test_recombination_estimate_three_clades_uses_nonroot_mrca() {
    // Three single-leaf clades where A1 and B1 share a non-root MRCA `I`, exercising the
    // `- 2 * root_distance(mrca)` term. Root distances: A1=3, B1=5, C1=6. Leaf-pair distances:
    //   A1<->B1 through I(rd 1): 3+5-2 = 6;  A1<->C1 through root: 9;  B1<->C1 through root: 11.
    // median{6, 9, 11} = 9 -> mu_r = 0.09. Terminal branches 2, 4, 6 -> mean 4 -> mu_w = 0.04.
    let graph = three_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(4.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(9.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_nested_clades_uses_leaf_distance() {
    // Nested clades whose clade ancestors sit one mutation apart but whose leaves carry large terminal
    // branches. mu_r reflects the actual inter-clade leaf divergence the HMM will encounter, not the
    // small ancestor separation.
    // Leaf pairs across clades:
    //   parent<->child: {10, 8, 10, 8}  parent<->other: {6, 6}  child<->other: {14, 12}
    // sorted: {6, 6, 8, 8, 10, 10, 12, 14} -> median = (8+10)/2 = 9 -> mu_r = 0.09
    // Terminal branches: 1, 8, 6, 1, 4 -> mean = 4 -> mu_w = 0.04
    let graph = nested_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(4.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(9.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty(  &[],                    None)]
  #[case::single( &[3.0],                 Some(3.0))]
  #[case::odd(    &[5.0, 1.0, 3.0],       Some(3.0))]      // sorted {1,3,5}, middle 3
  #[case::even(   &[1.0, 4.0, 2.0, 3.0],  Some(2.5))]      // sorted {1,2,3,4}, midpoint(2,3)
  #[trace]
  fn test_recombination_estimate_median(#[case] values: &[f64], #[case] expected: Option<f64>) {
    assert_eq!(expected, median(values));
  }

  #[rustfmt::skip]
  #[rstest]
  // as_probability accepts only the open interval (0, 1); the closed endpoints and non-finite values
  // are rejected (they would produce log(0) = -inf in the decoder).
  #[case::zero( 0.0,      None)]
  #[case::one(  1.0,      None)]
  #[case::nan(  f64::NAN, None)]
  #[case::half( 0.5,      Some(0.5))]
  #[trace]
  fn test_recombination_estimate_as_probability(#[case] value: f64, #[case] expected: Option<f64>) {
    assert_eq!(expected, as_probability(value));
  }

  // Augur/TreeTime-style reference tree whose `nuc` branch mutations include a deletion (`A15-`),
  // which Nextclade-built trees never emit. C3: deletions are excluded from the mutation count.
  // Two clades A, B. Terminal branches by substitution count (deletions ignored): A1=2, B=1, B1=1.
  // With the deletion on B1 excluded, its terminal branch is 1 (the substitution A40C only), so mean
  // terminal length = (2+1)/2 = 1.5 -> mu_w = 0.015. Were the deletion counted, B1 would be 2 and the
  // mean would differ.
  fn external_tree_with_deletion() -> AuspiceGraph {
    let json = indoc! {r#"{
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
            "name": "B1",
            "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
            "branch_attrs": { "mutations": { "nuc": ["A40C", "A15-"] } }
          }
        ]
      }
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  #[test]
  fn test_recombination_estimate_excludes_deletions_from_branch_length() {
    // Terminal branches counting substitutions only: A1=2, B1=1 (the `A15-` deletion excluded).
    // mean = (2+1)/2 = 1.5 -> mu_w = 1.5/100 = 0.015. If the deletion were counted, B1=2 and mu_w=0.02.
    let graph = external_tree_with_deletion();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(1.5 / 100.0, params.mu_w(), max_ulps = 2);
  }

  // A tree where a clade label appears only on an internal node, not on any leaf. Leaves carry a
  // single clade ("A"), so leaf-clade count is 1 and mu_r is undefined. C7: the skip reason must be
  // FewerThanTwoClades (derived from leaf clades), not TreeEstimateUnavailable.
  fn internal_only_second_clade_tree() -> AuspiceGraph {
    let json = indoc! {r#"{
      "version": "v2",
      "meta": {},
      "tree": {
        "name": "root",
        "node_attrs": { "div": 0 },
        "children": [
          {
            "name": "I",
            "node_attrs": { "div": 1, "clade_membership": { "value": "B" } },
            "branch_attrs": { "mutations": { "nuc": ["A5C"] } },
            "children": [
              {
                "name": "A1",
                "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
                "branch_attrs": { "mutations": { "nuc": ["A10C"] } }
              },
              {
                "name": "A2",
                "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
                "branch_attrs": { "mutations": { "nuc": ["A20G"] } }
              }
            ]
          }
        ]
      }
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  #[test]
  fn test_recombination_estimate_internal_only_clade_is_fewer_than_two_clades() {
    // Internal node I is labeled clade "B" but no leaf is; the two leaves are both clade "A".
    // The skip reason is derived from leaf clades, so it must be FewerThanTwoClades.
    let graph = internal_only_second_clade_tree();
    let resolution = resolve_recombination_params(None, &graph, REF_LEN).unwrap();
    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::FewerThanTwoClades)
      ),
      "got {resolution:?}"
    );
  }

  // Two clades but no per-branch nucleotide mutations (a tree exported with only divergence values).
  // Every branch mutation count is zero, so the divergence rates are undefined.
  fn two_clade_no_mutations_tree() -> AuspiceGraph {
    let json = indoc! {r#"{
      "version": "v2",
      "meta": {},
      "tree": {
        "name": "root",
        "node_attrs": { "div": 0 },
        "children": [
          { "name": "A1", "node_attrs": { "div": 1, "clade_membership": { "value": "A" } } },
          { "name": "B1", "node_attrs": { "div": 1, "clade_membership": { "value": "B" } } }
        ]
      }
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  #[test]
  fn test_recombination_estimate_no_branch_mutations_skip_reason() {
    // Two clades, but no `nuc` branch mutations: rates are undefined, so the reason distinguishes the
    // missing-annotation cause from a generic degenerate topology.
    let graph = two_clade_no_mutations_tree();
    let resolution = resolve_recombination_params(None, &graph, REF_LEN).unwrap();
    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::NoBranchMutations)
      ),
      "got {resolution:?}"
    );
  }

  #[allow(clippy::float_cmp)]
  #[test]
  fn test_recombination_estimate_all_overrides_bypass_unresolvable_tree() {
    // A single-clade tree cannot estimate muR, so with no overrides it would skip. Overriding all
    // three parameters must resolve regardless: the estimator is not consulted when a value is given.
    let graph = single_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(0.01)),
      mu_w: Some(OrderedFloat(0.02)),
      mu_r: Some(OrderedFloat(0.2)),
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(0.01, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.02, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.2, params.mu_r(), max_ulps = 2);
  }

  // Two clades; leaf B1 carries a substitution and an insertion ("-10A"). Insertions have a query base
  // present (not a gap), so they are counted alongside substitutions: A1=2, B1=2 -> mean 2 -> mu_w=0.02.
  fn tree_with_insertion() -> AuspiceGraph {
    let json = indoc! {r#"{
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
            "name": "B1",
            "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
            "branch_attrs": { "mutations": { "nuc": ["A40C", "-10A"] } }
          }
        ]
      }
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  #[allow(clippy::float_cmp)]
  #[test]
  fn test_recombination_estimate_counts_insertions_as_mutations() {
    // The insertion "-10A" is counted (query base present), so B1's branch length is 2, not 1.
    let graph = tree_with_insertion();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(2.0 / 100.0, params.mu_w(), max_ulps = 2);
  }

  // A leaf whose `nuc` branch mutation does not parse as `<ref><pos><query>`.
  fn tree_with_malformed_mutation() -> AuspiceGraph {
    let json = indoc! {r#"{
      "version": "v2",
      "meta": {},
      "tree": {
        "name": "root",
        "node_attrs": { "div": 0 },
        "children": [
          {
            "name": "A1",
            "node_attrs": { "div": 2, "clade_membership": { "value": "A" } },
            "branch_attrs": { "mutations": { "nuc": ["not-a-mutation"] } }
          },
          {
            "name": "B1",
            "node_attrs": { "div": 2, "clade_membership": { "value": "B" } },
            "branch_attrs": { "mutations": { "nuc": ["A40C"] } }
          }
        ]
      }
    }"#};
    AuspiceGraph::from_auspice_tree(AuspiceTree::from_str(json).unwrap()).unwrap()
  }

  #[test]
  fn test_recombination_estimate_errors_on_malformed_branch_mutation() {
    // A malformed tree annotation surfaces as an error instead of being silently miscounted.
    let graph = tree_with_malformed_mutation();
    assert_error!(
      resolve_recombination_params(None, &graph, REF_LEN),
      "When counting recombination branch mutations from tree annotation 'not-a-mutation': \
       Unable to parse nucleotide mutation: 'not-a-mutation'"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::no_reference_tree(RecombinationSkipReason::NoReferenceTree,
    "no reference tree is available, and recombination detection requires one to derive parent-relative mutations")]
  #[case::fewer_than_two(RecombinationSkipReason::FewerThanTwoClades,
    "the reference tree has fewer than two clades, so the recombinant divergence rate (muR) cannot be estimated")]
  #[case::no_mutations(RecombinationSkipReason::NoBranchMutations,
    "the reference tree carries no per-branch nucleotide mutations, so the wildtype and recombinant divergence rates cannot be estimated")]
  #[case::tree_unavailable(RecombinationSkipReason::TreeEstimateUnavailable,
    "a required parameter could not be estimated from the reference tree (degenerate topology)")]
  #[case::not_elevated(RecombinationSkipReason::RecombinantRateNotElevated { mu_w: 0.05, mu_r: 0.01 },
    "the estimated recombinant divergence rate does not exceed the wildtype rate (muW=0.05, muR=0.01)")]
  #[trace]
  fn test_recombination_skip_reason_message(#[case] reason: RecombinationSkipReason, #[case] expected: &str) {
    assert_eq!(expected, reason.message());
  }
}
