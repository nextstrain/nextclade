//! Building the per-site observation vector: coverage/mutation mapping, missing-over-mutation
//! precedence, out-of-range absorption, and assembly of the non-comparable ranges (including the
//! placement mask).

#[cfg(test)]
mod tests {
  use crate::analyze::nuc_del::NucDelRange;
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{nuc_range, ranges};
  use crate::analyze::recombination::observations::{RecombinationObs, build_observations, collect_missing_ranges};
  use crate::coord::position::{NucRefGlobalPosition, PositionLike};
  use crate::coord::range::NucRefGlobalRange;
  use pretty_assertions::assert_eq;

  #[test]
  fn test_recombination_build_observations_maps_coverage_and_mutations() {
    use RecombinationObs::{Missing, Mut, Ref};
    let ref_len = 10;
    let alignment_range = NucRefGlobalRange::from_usize(1, 9); // positions 0 and 9 uncovered
    let missing_ranges = vec![NucRefGlobalRange::from_usize(3, 5)]; // positions 3, 4
    let mutated: Vec<NucRefGlobalPosition> = [2, 6]
      .into_iter()
      .map(|p| NucRefGlobalPosition::from(p as isize))
      .collect();

    let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

    let expected = vec![Missing, Ref, Mut, Missing, Missing, Ref, Mut, Ref, Ref, Missing];
    assert_eq!(expected, observed);
  }

  #[test]
  fn test_recombination_build_observations_missing_wins_over_mut_and_ignores_out_of_range() {
    use RecombinationObs::{Missing, Ref};
    let ref_len = 8;
    let alignment_range = NucRefGlobalRange::from_usize(0, 8);
    let missing_ranges = vec![NucRefGlobalRange::from_usize(2, 5)]; // positions 2, 3, 4 missing
    // A mutation inside a missing range (position 3) resolves to Missing: non-comparable positions
    // are final and must not contribute to the likelihood. A mutation outside the reference (position
    // 20) is ignored rather than panicking or extending the vector.
    let mutated: Vec<NucRefGlobalPosition> = [3, 20]
      .into_iter()
      .map(|p| NucRefGlobalPosition::from(p as isize))
      .collect();

    let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

    let expected = vec![Ref, Ref, Missing, Missing, Missing, Ref, Ref, Ref];
    assert_eq!(expected, observed);
  }

  // The assembled missing set must contain every input range, including the placement-masked ranges.
  // Dropping the `masked` term from `collect_missing_ranges` would fail this test, so the mask
  // chaining cannot silently regress.
  #[test]
  fn test_collect_missing_ranges_includes_masked() {
    let missing = vec![nuc_range(0, 2)];
    let non_acgtns = vec![nuc_range(10, 11)];
    let deletions = vec![NucDelRange::from_usize(20, 22)];
    let masked = ranges(&[(30, 33)]);

    let assembled = collect_missing_ranges(&missing, &non_acgtns, &deletions, &masked);

    // Order is missing, then non-ACGTN, then deletions, then masked.
    let expected = ranges(&[(0, 2), (10, 11), (20, 22), (30, 33)]);
    assert_eq!(expected, assembled);
    assert!(
      assembled.contains(&NucRefGlobalRange::from_usize(30, 33)),
      "assembled missing set must contain the placement-masked range"
    );
  }

  // Fed through the same chain as `nextclade_run_one`, a position that is both masked and mutated
  // resolves to `Missing`; an unmasked mutation resolves to `Mut`; positions outside the alignment are
  // `Missing`; and the vector length equals `ref_len`. If missing ranges stopped taking precedence over
  // mutations, the masked+mutated position would decode to `Mut` and fail this test.
  #[test]
  fn test_recombination_build_observations_masked_mutation_is_missing() {
    use RecombinationObs::{Missing, Mut, Ref};
    let ref_len = 10;
    let alignment_range = NucRefGlobalRange::from_usize(1, 9); // positions 0 and 9 outside the alignment
    let masked = ranges(&[(4, 5)]); // position 4 is placement-masked
    let missing_ranges = collect_missing_ranges(&[], &[], &[], &masked);
    // Position 4 is masked and mutated; position 6 is mutated but not masked.
    let mutated: Vec<NucRefGlobalPosition> = [4, 6]
      .into_iter()
      .map(|p| NucRefGlobalPosition::from(p as isize))
      .collect();

    let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

    let expected = vec![Missing, Ref, Ref, Ref, Missing, Ref, Mut, Ref, Ref, Missing];
    assert_eq!(expected, observed);
    assert_eq!(ref_len, observed.len());
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(1000))]

    // build_observations always emits exactly one observation per reference position (so the decoded
    // state vector stays in reference coordinates), and every position inside a missing range resolves
    // to Missing regardless of any mutation mapped there -- missing data must not enter the likelihood.
    // Out-of-range mutations and ranges are absorbed without panicking or growing the vector.
    #[test]
    fn test_prop_recombination_build_observations_length_and_missing_precedence(
      ref_len in 1_usize..300,
      align_a in 0_usize..300,
      align_b in 0_usize..300,
      missing in proptest::collection::vec((0_usize..350, 0_usize..350), 0..20),
      muts in proptest::collection::vec(0_usize..350, 0..40),
    ) {
      let (lo, hi) = (align_a.min(align_b), align_a.max(align_b));
      let alignment_range = NucRefGlobalRange::from_usize(lo, hi);
      let missing_ranges: Vec<NucRefGlobalRange> = missing
        .iter()
        .map(|&(x, y)| NucRefGlobalRange::from_usize(x.min(y), x.max(y)))
        .collect();
      let mutated: Vec<NucRefGlobalPosition> = muts.iter().map(|&p| NucRefGlobalPosition::from(p as isize)).collect();

      let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

      proptest::prop_assert_eq!(observed.len(), ref_len);
      for range in &missing_ranges {
        // Clamp the range to the reference so an out-of-range missing range checks only its in-bounds part.
        let end = range.end.as_usize().min(ref_len);
        let begin = range.begin.as_usize().min(end);
        for (offset, obs_at) in observed[begin..end].iter().enumerate() {
          proptest::prop_assert_eq!(*obs_at, RecombinationObs::Missing, "missing precedence violated at {}", begin + offset);
        }
      }
    }
  }
}
