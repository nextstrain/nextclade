//! Viterbi decoding and region extraction: `find_recombinant_regions`, interval trimming to covered
//! positions, the well-formedness helper, and decoder optimality against an independent brute-force
//! oracle.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{obs, path_log_prob, ranges, test_params};
  use crate::analyze::recombination::decode::{
    find_recombinant_regions, intervals_sorted_disjoint_nonempty, viterbi_decode,
  };
  use crate::analyze::recombination::observations::RecombinationObs;
  use crate::analyze::recombination::params::RecombinationHmmParams;
  use crate::coord::position::PositionLike;
  use crate::coord::range::NucRefGlobalRange;
  use crate::pretty_assert_abs_diff_eq;
  use pretty_assertions::assert_eq;
  use rand::rngs::StdRng;
  use rand::{Rng, SeedableRng};
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::empty(                       "",                                            &[])]
  #[case::all_ref(                     "RRRRRRRRRRRRRRRRRRRR",                        &[])]
  #[case::all_mut(                     "MMMMMMMMMM",                                  &[(0, 10)])]
  #[case::single_mut_flanked_stays_ref("RRRRRRRRRRMRRRRRRRRRR",                       &[])]
  #[case::dense_block(                 "RRRRRRRRRRMMMMMMMMMMMMMMMRRRRRRRRRR",         &[(10, 25)])]
  #[case::missing_run_no_interval(     "RRRRRRRRRRXXXXXRRRRRRRRRR",                   &[])]
  #[trace]
  fn test_recombination_find_regions(#[case] input: &str, #[case] expected: &[(usize, usize)]) {
    let regions = find_recombinant_regions(&obs(input), &test_params());
    assert_eq!(ranges(expected), regions);
  }

  #[rustfmt::skip]
  #[rstest]
  // Trailing Missing (uncovered flank or deletion) must not extend the reported interval past the
  // last covered position; leading Missing must not push the start earlier. Internal Missing bridges.
  #[case::trailing_missing_trimmed("RRRRRMMMMMMMMMMMMMMMXXXXX",      &[(5, 20)])]
  #[case::internal_missing_bridged("RRRRRMMMMMMMMMMMMMMMXXXXXMMMMMMMMMMMMMMMRRRRR", &[(5, 40)])]
  #[trace]
  fn test_recombination_intervals_trimmed_to_covered(#[case] input: &str, #[case] expected: &[(usize, usize)]) {
    let regions = find_recombinant_regions(&obs(input), &test_params());
    assert_eq!(ranges(expected), regions);
  }

  #[test]
  fn test_recombination_regions_are_within_bounds_sorted_and_disjoint() {
    // Two Mut blocks separated by a Ref run long enough to justify two state switches
    // (a mid-sequence Ref stretch costs 2 switches, ~5.88 nats, unlike a single end flank).
    let input = obs("RRRRRMMMMMMMMMMMMMMMRRRRRRRRRRRRMMMMMMMMMMMMMMMRRRRR");
    let regions = find_recombinant_regions(&input, &test_params());
    assert_eq!(2, regions.len());
    let mut prev_end = 0;
    for region in &regions {
      let begin = region.begin.as_usize();
      let end = region.end.as_usize();
      assert!(begin < end, "empty region {begin}..{end}");
      assert!(end <= input.len(), "region end {end} exceeds length {}", input.len());
      assert!(
        begin >= prev_end,
        "regions overlap or are unsorted at {begin} (prev end {prev_end})"
      );
      prev_end = end;
    }
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty(                &[],               10, true)]
  #[case::single(               &[(2, 5)],         10, true)]
  #[case::sorted_disjoint(      &[(2, 5), (7, 9)], 10, true)]
  #[case::touching_endpoints(   &[(2, 5), (5, 9)], 10, true)]  // half-open: prev.end == next.begin is disjoint
  #[case::empty_range(          &[(5, 5)],         10, false)] // begin == end
  #[case::out_of_bounds(        &[(2, 12)],        10, false)] // end > len
  #[case::unsorted(             &[(7, 9), (2, 5)], 10, false)]
  #[case::overlapping(          &[(2, 6), (5, 9)], 10, false)] // next.begin < prev.end
  fn test_recombination_intervals_sorted_disjoint_nonempty(
    #[case] pairs: &[(usize, usize)],
    #[case] len: usize,
    #[case] expected: bool,
  ) {
    assert_eq!(expected, intervals_sorted_disjoint_nonempty(&ranges(pairs), len));
  }

  #[test]
  fn test_recombination_metamorphic_all_ref_yields_no_regions() {
    // An all-Ref vector carries no recombinant signal, so no region is decoded, for any valid params.
    let params = RecombinationHmmParams::new(0.01, 0.01, 0.6).unwrap();
    let observations = vec![RecombinationObs::Ref; 500];
    assert_eq!(
      Vec::<NucRefGlobalRange>::new(),
      find_recombinant_regions(&observations, &params)
    );
  }

  #[rstest]
  #[case::all_ref("RRRRRRRR")]
  #[case::all_mut("MMMMMMMM")]
  #[case::single_mut("RRRMRRRR")]
  #[case::block("RRMMMMRR")]
  #[case::two_blocks("MMRRMMRR")]
  #[case::with_missing("RRMMXXMMRR")]
  #[case::alternating("RMRMRMRM")]
  fn test_recombination_viterbi_matches_bruteforce_oracle(#[case] input: &str) {
    // For short vectors, enumerate all 2^L hidden-state paths and confirm the Viterbi-decoded path
    // achieves the maximum path log-probability. This pins decoder optimality (recurrence, backtrace,
    // initialization) against an independent brute-force search, not against the decoder itself.
    let params = test_params();
    let observations = obs(input);
    let n = observations.len();
    assert!(n <= 12, "brute-force oracle is only tractable for short vectors");

    let decoded = viterbi_decode(&observations, &params);
    let decoded_score = path_log_prob(&observations, &decoded, &params);

    let best_score = (0..(1_u32 << n))
      .map(|mask| {
        let path: Vec<bool> = (0..n).map(|i| (mask >> i) & 1 == 1).collect();
        path_log_prob(&observations, &path, &params)
      })
      .fold(f64::NEG_INFINITY, f64::max);

    pretty_assert_abs_diff_eq!(best_score, decoded_score, epsilon = 1e-9);
  }

  // Two properties: structural invariants of the decoded regions hold for any observation vector and
  // any valid parameters, and a planted recombinant block is recovered. Parameters are built valid by
  // construction (gamma < 0.5, 0 < mu_w < mu_r < 1) and through `new().unwrap()` -- a failure there
  // means the model preconditions drifted.
  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(1000))]

    #[test]
    fn test_prop_recombination_regions_well_formed(
      observations in proptest::collection::vec(
        proptest::prop_oneof![
          proptest::prelude::Just(RecombinationObs::Ref),
          proptest::prelude::Just(RecombinationObs::Mut),
          proptest::prelude::Just(RecombinationObs::Missing),
        ],
        1..500_usize,
      ),
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      // gamma < 0.5; mu_w in (0, 0.5); mu_r = mu_w + offset in (mu_w, 1). All satisfy `new` by construction.
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let regions = find_recombinant_regions(&observations, &params);

      let mut prev_end = 0;
      for region in &regions {
        let (begin, end) = (region.begin.as_usize(), region.end.as_usize());
        proptest::prop_assert!(begin < end, "empty region {begin}..{end}");
        proptest::prop_assert!(end <= observations.len(), "region {begin}..{end} out of bounds");
        proptest::prop_assert!(begin >= prev_end, "regions unsorted or overlapping at {begin}");
        proptest::prop_assert_ne!(observations[begin], RecombinationObs::Missing, "begin endpoint is Missing");
        proptest::prop_assert_ne!(observations[end - 1], RecombinationObs::Missing, "end endpoint is Missing");
        prev_end = end;
      }
    }

    #[test]
    fn test_prop_recombination_recovers_planted_block(seed in proptest::prelude::any::<u64>()) {
      // Strong separation so recovery is near-certain: a 200-site recombinant block at mu_r = 0.6 in a
      // wildtype background at mu_w = 0.01. Emissions are sampled from a seeded RNG (the forward model);
      // the decoder under test is Viterbi, a different algorithm, so this is not circular.
      let params = RecombinationHmmParams::new(0.01, 0.01, 0.6).unwrap();
      let len = 600_usize;
      let block = 200_usize..400;
      let mut rng = StdRng::seed_from_u64(seed);
      let observations: Vec<RecombinationObs> = (0..len)
        .map(|i| {
          let rate = if block.contains(&i) { 0.6 } else { 0.01 };
          if rng.gen_bool(rate) {
            RecombinationObs::Mut
          } else {
            RecombinationObs::Ref
          }
        })
        .collect();

      let regions = find_recombinant_regions(&observations, &params);

      // At least one decoded region overlaps the planted block's core [250, 350). Overlap only, never
      // exact per-site equality: Viterbi recovery is probabilistic even under strong signal.
      let (core_begin, core_end) = (250_usize, 350);
      let overlaps = regions.iter().any(|r| {
        let (begin, end) = (r.begin.as_usize(), r.end.as_usize());
        begin < core_end && core_begin < end
      });
      proptest::prop_assert!(overlaps, "no decoded region overlaps the planted block; regions={:?}", regions);
    }
  }

  // Viterbi optimality as a property: over random short observation vectors AND random valid
  // parameters, the decoded path attains the maximum log-probability among all 2^L hidden paths. The
  // fixed-case oracle above pins a handful of vectors at one parameter set; randomizing both the
  // observations and the transition/emission costs exercises the tie policy and recurrence across the
  // whole parameter regime, not just the test-scale point. Brute force is an independent oracle (an
  // exhaustive search, not the Viterbi recurrence), so agreement is a real correctness signal.
  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(256))]

    #[test]
    fn test_prop_recombination_viterbi_matches_bruteforce(
      observations in proptest::collection::vec(
        proptest::prop_oneof![
          proptest::prelude::Just(RecombinationObs::Ref),
          proptest::prelude::Just(RecombinationObs::Mut),
          proptest::prelude::Just(RecombinationObs::Missing),
        ],
        1..=12_usize,
      ),
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let decoded = viterbi_decode(&observations, &params);
      let decoded_score = path_log_prob(&observations, &decoded, &params);

      let n = observations.len();
      let best_score = (0..(1_u32 << n))
        .map(|mask| {
          let path: Vec<bool> = (0..n).map(|i| (mask >> i) & 1 == 1).collect();
          path_log_prob(&observations, &path, &params)
        })
        .fold(f64::NEG_INFINITY, f64::max);

      proptest::prop_assert!(
        (best_score - decoded_score).abs() < 1e-9,
        "viterbi path not optimal: decoded={decoded_score} best={best_score}"
      );
    }
  }
}
