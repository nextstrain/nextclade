//! Per-site observation vector in reference coordinates.
//!
//! Each site emits `Ref` (not mutated), `Mut` (mutated), or `Missing` (N, deletion, ambiguity,
//! placement-masked, or outside alignment) relative to the inferred parent. `Missing` is final --
//! it overrides mutations at the same position.

use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDelRange;
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::coord::range::NucRefGlobalRange;

/// Assemble non-comparable ranges for `build_observations`: N runs, non-ACGTN, deletions, and
/// placement-masked sites. Masked positions would otherwise score as `Mut` at homoplasic sites.
pub(crate) fn collect_missing_ranges(
  missing: &[NucRange],
  non_acgtns: &[NucRange],
  deletions: &[NucDelRange],
  masked: &[NucRefGlobalRange],
) -> Vec<NucRefGlobalRange> {
  missing
    .iter()
    .map(|r| r.range().clone())
    .chain(non_acgtns.iter().map(|r| r.range().clone()))
    .chain(deletions.iter().map(|d| d.range().clone()))
    .chain(masked.iter().cloned())
    .collect()
}

/// Build the per-site observation vector in reference coordinates.
///
/// `Mut` at private substitutions (including reversions), `Missing` at uncovered or non-comparable
/// positions, `Ref` otherwise. `Missing` is final and overrides mutations.
pub(crate) fn build_observations(
  ref_len: usize,
  alignment_range: &NucRefGlobalRange,
  missing_ranges: &[NucRefGlobalRange],
  mutated_positions: &[NucRefGlobalPosition],
) -> Vec<RecombinationObs> {
  let mut obs = vec![RecombinationObs::Missing; ref_len];

  // 1. Covered positions start as Ref.
  for pos in alignment_range.iter() {
    if let Some(slot) = obs.get_mut(pos.as_usize()) {
      *slot = RecombinationObs::Ref;
    }
  }

  // 2. Substitutions relative to the parent. Applied before missing so that
  //    non-comparable positions (step 3) take precedence.
  for pos in mutated_positions {
    if let Some(slot) = obs.get_mut(pos.as_usize()) {
      *slot = RecombinationObs::Mut;
    }
  }

  // 3. Non-comparable positions are Missing (final). N, deletion, ambiguous,
  //    placement-masked, or outside alignment. This stage is last so it
  //    overrides any mutation at a non-comparable position (missing data must
  //    not contribute to the likelihood).
  for range in missing_ranges {
    for pos in range.iter() {
      if let Some(slot) = obs.get_mut(pos.as_usize()) {
        *slot = RecombinationObs::Missing;
      }
    }
  }

  debug_assert_eq!(
    ref_len,
    obs.len(),
    "observation vector must have one entry per reference position"
  );
  obs
}

/// Per-site observation for the recombination HMM, in reference coordinates.
#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum RecombinationObs {
  /// Covered position that matches the parent (not mutated).
  Ref,
  /// Covered position that differs from the parent (mutated).
  Mut,
  /// No usable information: N, deletion, ambiguous character, or outside the alignment.
  Missing,
}
