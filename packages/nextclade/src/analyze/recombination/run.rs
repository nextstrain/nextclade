//! HMM-based recombination detection.
//!
//! A two-state hidden Markov model (wildtype, recombinant) decoded with Viterbi and optionally scored
//! with forward-backward. Each reference site emits one of three observations relative to the
//! sequence's inferred parent (its tree attachment point): not mutated (`Ref`), mutated (`Mut`), or no
//! usable information (`Missing`). `Missing` emits probability 1 in both states (marginalization over
//! missing data), so it adds no emission evidence while transitions still cross it and the decoded
//! state persists across missing runs. Contiguous runs of the recombinant state, trimmed so their
//! endpoints fall on covered positions, are reported as putative recombinant intervals. When
//! forward-backward is run, each interval receives a confidence score (mean posterior marginal
//! probability of the recombinant state).
//!
//! `run_recombination` is the per-sequence entry point; `estimate::resolve_recombination_params` is
//! the paired setup entry point, run once per dataset to resolve the parameters from `pathogen.json`
//! and the reference tree.

use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::recombination::config::RecombinationConfig;
use crate::analyze::recombination::decode::find_recombinant_regions;
use crate::analyze::recombination::forward_backward::{compute_interval_confidences, forward_backward_marginals};
use crate::analyze::recombination::observations::{build_observations, recombination_missing_ranges};
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

/// Detect putative recombinant regions for one sequence, or `None` when detection does not run or
/// finds nothing.
///
/// Gated on the private-substitution count: a sequence below `config`'s `minPrivateSubsToRun`
/// (default 1) cannot carry recombinant signal and is skipped.
pub fn run_recombination(
  params: &RecombinationHmmParams,
  config: Option<&RecombinationConfig>,
  input: &RecombinationRunInput,
) -> Option<RecombinationResult> {
  if input.private_substitutions.len() < RecombinationConfig::min_private_subs_to_run(config) {
    return None;
  }

  let missing_ranges =
    recombination_missing_ranges(input.missing, input.non_acgtns, input.deletions, input.masked_ranges);
  let mutated_positions: Vec<NucRefGlobalPosition> = input.private_substitutions.iter().map(|sub| sub.pos).collect();
  let observations = build_observations(
    input.ref_len,
    input.alignment_range,
    &missing_ranges,
    &mutated_positions,
  );

  let regions = find_recombinant_regions(&observations, params);
  let confidences = (!regions.is_empty()).then(|| {
    let marginals = forward_backward_marginals(&observations, params);
    compute_interval_confidences(&marginals, &regions)
  });

  RecombinationResult::from_ranges(regions, confidences.as_deref())
}
