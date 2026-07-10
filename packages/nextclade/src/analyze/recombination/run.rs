//! HMM-based recombination detection.
//!
//! Two-state HMM (wildtype/recombinant), Viterbi-decoded, optionally forward-backward scored.
//! Sites emit `Ref`, `Mut`, or `Missing` relative to the inferred parent. `Missing` emits
//! probability 1 in both states (marginalization), so transitions cross it but it adds no evidence.
//! Recombinant runs, trimmed to covered endpoints, are reported with optional confidence scores.
//!
//! Entry points: `run_recombination` (per-sequence), `estimate::resolve_recombination_params`
//! (per-dataset setup).

use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::recombination::config::RecombinationConfig;
use crate::analyze::recombination::decode::find_recombinant_regions;
use crate::analyze::recombination::forward_backward::{
  compute_forward_backward_marginals, compute_interval_confidences,
};
use crate::analyze::recombination::observations::{build_observations, collect_missing_ranges};
use crate::analyze::recombination::params::RecombinationHmmParams;
use crate::analyze::recombination::result::RecombinationResult;
use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::NucRefGlobalRange;

/// Per-sequence inputs to `run_recombination`, in reference coordinates.
pub struct RecombinationRunInput<'a> {
  /// Reference sequence length; the observation vector has one entry per reference position.
  pub ref_len: usize,
  /// The sequence's aligned span in reference coordinates; positions outside it are `Missing`.
  pub alignment_range: &'a NucRefGlobalRange,
  /// Private substitutions relative to the inferred parent; each is a `Mut` observation.
  pub private_substitutions: &'a [NucSub],
  /// Missing (`N`) ranges.
  pub missing: &'a [NucRange],
  /// Non-ACGTN ambiguous ranges.
  pub non_acgtns: &'a [NucRange],
  /// Deletion ranges relative to the reference.
  pub deletions: &'a [NucDelRange],
  /// Placement-masked ranges, non-comparable so a masked mismatch cannot manufacture a false call.
  pub masked_ranges: &'a [NucRefGlobalRange],
}

/// Detect recombinant regions for one sequence, or `None` when skipped or nothing found.
/// Gated on `minPrivateSubsToRun` (default 1).
pub fn run_recombination(
  params: &RecombinationHmmParams,
  config: Option<&RecombinationConfig>,
  input: &RecombinationRunInput,
) -> Option<RecombinationResult> {
  if input.private_substitutions.len() < RecombinationConfig::min_private_subs_to_run(config) {
    return None;
  }

  let missing_ranges = collect_missing_ranges(input.missing, input.non_acgtns, input.deletions, input.masked_ranges);
  let mutated_positions: Vec<NucRefGlobalPosition> = input.private_substitutions.iter().map(|sub| sub.pos).collect();
  let observations = build_observations(
    input.ref_len,
    input.alignment_range,
    &missing_ranges,
    &mutated_positions,
  );

  let regions = find_recombinant_regions(&observations, params);
  let regions_with_confidence: Vec<(NucRefGlobalRange, Option<f64>)> = if regions.is_empty() {
    Vec::new()
  } else {
    let marginals = compute_forward_backward_marginals(&observations, params);
    let confidences = compute_interval_confidences(&marginals, &regions);
    regions.into_iter().zip(confidences.into_iter().map(Some)).collect()
  };

  RecombinationResult::from_ranges(regions_with_confidence)
}
