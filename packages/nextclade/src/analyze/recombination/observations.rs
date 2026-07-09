//! The per-site observation vector in reference coordinates.
//!
//! Each reference site emits one of three observations relative to the sequence's inferred parent (its
//! tree attachment point): not mutated (`Ref`), mutated (`Mut`), or no usable information (`Missing`).
//! `Missing` covers positions that carry no comparable base (N, deletion, ambiguity, placement-masked
//! site, or outside the alignment) and is final: it overrides a mutation mapped to the same position,
//! because missing data must not contribute to the likelihood.

use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDelRange;
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::coord::range::NucRefGlobalRange;

/// Assemble the non-comparable reference ranges handed to [`build_observations`] as `missing`.
///
/// These are all the positions that carry no usable evidence relative to the parent: missing (`N`)
/// runs, non-ACGTN ambiguous runs, deletions, and placement-masked sites. The placement mask is
/// included because a masked position that differs from the parent would otherwise be scored as `Mut`
/// and could manufacture a false recombinant call at a homoplasic site. Extracted from the
/// per-sequence pipeline so this chaining is guarded by a direct test rather than an inline closure.
pub(crate) fn recombination_missing_ranges(
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
/// A position is `Mut` at a private substitution (mutations relative to the parent, which include
/// reversions), `Missing` where it is uncovered (outside the alignment) or carries no comparable
/// base (N, ambiguous character, deletion, or placement-masked site), and `Ref` otherwise.
/// `Missing` is final: a non-comparable position stays `Missing` even if a mutation also maps to it,
/// because missing data must not contribute to the likelihood.
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

  // Postcondition: one observation per reference position, so the decoded state vector aligns with
  // reference coordinates and out-of-range mutations/ranges never grow the vector.
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
