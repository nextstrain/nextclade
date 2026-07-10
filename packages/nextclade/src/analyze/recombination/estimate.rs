//! Estimation of recombination HMM parameters from the reference tree.
//!
//! `mu_w` = mean terminal branch length (substitution count / ref_len). `mu_r` = median pairwise
//! inter-clade leaf distance / ref_len. `gamma` = `1 / ref_len`. Substitution counts come from
//! per-branch `nuc` mutation lists, sidestepping ambiguous Auspice divergence units.
//!
//! Each parameter is resolved independently: `pathogen.json` override (validated, verbatim) >
//! tree estimate. Out-of-range override = dataset error. Undefined estimate = skip with reason.

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
use statrs::statistics::{Data, OrderStatistics, Statistics};
use std::collections::BTreeMap;

/// Key under which nucleotide (as opposed to per-gene) mutations are stored in branch attributes.
const NUC_MUTATIONS_KEY: &str = "nuc";

/// Resolve the three HMM parameters: `pathogen.json` overrides > tree-based fallbacks.
///
/// Out-of-range override or explicit `muR <= muW` = dataset error. Missing override + undefined
/// estimate = `Skipped` with reason.
pub fn resolve_recombination_params(
  config: Option<&RecombinationConfig>,
  graph: &AuspiceGraph,
  ref_len: usize,
) -> Result<RecombinationResolution, Report> {
  // Each parameter: validated override when present, tree estimate otherwise.
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

  // Recombinant state must have elevated mutation density. Both rates from pathogen.json with
  // muR <= muW = misconfiguration (error); degenerate tree estimate = skip.
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

  // `new` is the single invariant gate. The `mu_r <= mu_w` branch above is policy (error vs skip),
  // not validation.
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

/// Why detection cannot run. Default-on = silent skip; explicit `enabled: true` = error.
#[derive(Debug, Clone)]
pub enum RecombinationSkipReason {
  /// No reference tree is available; detection needs one for parent-relative mutations.
  NoReferenceTree,
  /// Fewer than two clades -- inter-clade divergence (`muR`) is undefined.
  FewerThanTwoClades,
  /// No per-branch `nuc` mutations -- divergence rates undefined (e.g. tree with only divergence
  /// values).
  NoBranchMutations,
  /// Required parameter not estimable (degenerate topology or no leaves).
  TreeEstimateUnavailable,
  /// Estimated muR does not exceed muW -- states are indistinguishable.
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
    if count_nuc_mutations(node.payload())? > 0 {
      return Ok(true);
    }
  }
  Ok(false)
}

/// Distinct clade labels among leaves only. A clade labeling only internal nodes cannot contribute
/// to `mu_r` (inter-clade leaf distance), so it is not counted.
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
  accept_as_probability(1.0 / ref_len as f64)
}

/// Wildtype emission fallback: mean terminal branch length (substitutions) per site.
pub(super) fn estimate_mu_w(graph: &AuspiceGraph, ref_len: usize) -> Result<Option<f64>, Report> {
  let mean = graph
    .iter_nodes()
    .filter(|node| node.is_leaf())
    .map(|node| count_nuc_mutations(node.payload()))
    .process_results(|branch_lengths| branch_lengths.map(|length| length as f64).mean())?;

  Ok(accept_as_probability(mean / ref_len as f64))
}

/// Recombinant emission fallback: median pairwise inter-clade leaf distance (substitutions) per site.
fn estimate_mu_r(graph: &AuspiceGraph, ref_len: usize) -> Result<Option<f64>, Report> {
  let distances = compute_inter_clade_leaf_distances(graph)?;
  if distances.is_empty() {
    return Ok(None); // No cross-clade leaf pairs: the recombinant rate is undefined.
  }
  let median = Data::new(distances.into_iter().map(|distance| distance as f64).collect_vec()).median();
  Ok(accept_as_probability(median / ref_len as f64))
}

/// Pairwise substitution distances between all leaves belonging to different clades.
pub(super) fn compute_inter_clade_leaf_distances(graph: &AuspiceGraph) -> Result<Vec<usize>, Report> {
  let mut clade_leaves: BTreeMap<String, Vec<GraphNodeKey>> = BTreeMap::new();
  for node in graph.iter_nodes() {
    if node.is_leaf()
      && let Some(clade) = node.payload().clade()
    {
      clade_leaves.entry(clade).or_default().push(node.key());
    }
  }

  if clade_leaves.len() < 2 {
    return Ok(vec![]);
  }

  // Precompute root distances for all nodes so inter-clade distance needs no second tree walk.
  let root_dists: BTreeMap<GraphNodeKey, usize> = graph
    .iter_nodes()
    .map(|node| compute_root_distance(graph, node.key()).map(|d| (node.key(), d)))
    .try_collect()?;

  // Exhaustive pairwise distances between leaves of different clades.
  let clade_leaves = clade_leaves
    .into_values()
    .map(|leaves| {
      leaves
        .into_iter()
        .map(|key| LeafPath::new(graph, key, root_dists[&key]))
        .collect_vec()
    })
    .collect_vec();

  clade_leaves
    .iter()
    .tuple_combinations()
    .flat_map(|(leaves_a, leaves_b)| leaves_a.iter().cartesian_product(leaves_b))
    .map(|(a, b)| a.distance_to(b, &root_dists))
    .try_collect()
}

/// Nucleotide substitutions on this branch, excluding deletions (gap query = missing data, not
/// mutation, matching `build_observations`). Insertions count (query base present). Malformed
/// tokens surface as errors. Deletions appear on external trees (augur/TreeTime) as `"A15-"`.
fn count_nuc_mutations(payload: &AuspiceGraphNodePayload) -> Result<usize, Report> {
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
fn compute_root_distance(graph: &AuspiceGraph, key: GraphNodeKey) -> Result<usize, Report> {
  graph
    .iter_ancestor_keys_inclusive(key)
    .map(|node_key| count_nuc_mutations(graph.get_node(node_key)?.payload()))
    .sum()
}

/// Accept a value only if it is a valid emission/transition probability in the open interval `(0, 1)`.
pub(crate) fn accept_as_probability(x: f64) -> Option<f64> {
  is_hmm_probability(x).then_some(x)
}

struct LeafPath {
  key: GraphNodeKey,
  root_distance: usize,
  ancestors: IndexSet<GraphNodeKey>,
}

impl LeafPath {
  fn new(graph: &AuspiceGraph, key: GraphNodeKey, root_distance: usize) -> Self {
    Self {
      key,
      root_distance,
      ancestors: graph.iter_ancestor_keys_inclusive(key).collect(),
    }
  }

  fn distance_to(&self, other: &Self, root_distances: &BTreeMap<GraphNodeKey, usize>) -> Result<usize, Report> {
    let Some(mrca) = other.ancestors.iter().find(|key| self.ancestors.contains(*key)) else {
      return make_error!(
        "Recombination parameter estimation: node {:?} has no common ancestor with the compared leaf",
        other.key
      );
    };
    Ok(self.root_distance + other.root_distance - 2 * root_distances[mrca])
  }
}
