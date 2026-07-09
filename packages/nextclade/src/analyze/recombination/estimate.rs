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
use crate::analyze::recombination::config::RecombinationConfig;
use crate::analyze::recombination::params::{RecombinationHmmParams, is_hmm_probability};
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
      return make_error!(
        "Recombination parameters in pathogen.json require muR > muW, but got muW={mu_w} and muR={mu_r}"
      );
    }
    return Ok(RecombinationResolution::Skipped(
      RecombinationSkipReason::RecombinantRateNotElevated { mu_w, mu_r },
    ));
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
        "the reference tree has fewer than two clades, so the recombinant divergence rate (muR) cannot be estimated"
          .to_owned()
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
pub(crate) fn median(values: &[f64]) -> Option<f64> {
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
pub(crate) fn as_probability(x: f64) -> Option<f64> {
  is_hmm_probability(x).then_some(x)
}
