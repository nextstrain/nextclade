//! Forward-backward scoring and confidence: `compute_log_sum_exp_2`, marginals vs brute-force
//! oracle, and interval confidences.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{
    bruteforce_marginals, obs, ranges, test_params,
  };
  use crate::analyze::recombination::decode::find_recombinant_regions;
  use crate::analyze::recombination::forward_backward::{
    compute_forward_backward_marginals, compute_forward_backward_posteriors, compute_interval_confidences,
    compute_log_sum_exp_2,
  };
  use crate::analyze::recombination::observations::RecombinationObs;
  use crate::analyze::recombination::params::{RECOMBINANT, RecombinationHmmParams, WILDTYPE};
  use crate::coord::position::PositionLike;
  use crate::coord::range::NucRefGlobalRange;
  use crate::pretty_assert_abs_diff_eq;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::equal(      0.0,   0.0,                2.0_f64.ln()                   )] // ln(exp(0)+exp(0)) = ln(2)
  #[case::large_diff( 100.0, 0.0,                100.0                          )] // dominated by max
  #[case::one_neg_inf(5.0,   f64::NEG_INFINITY,  5.0                            )]
  #[case::symmetric(  3.0,   5.0,                5.0 + (-2.0_f64).exp().ln_1p() )]
  #[trace]
  fn test_recombination_compute_log_sum_exp_2(#[case] a: f64, #[case] b: f64, #[case] expected: f64) {
    pretty_assert_abs_diff_eq!(expected, compute_log_sum_exp_2(a, b), epsilon = 1e-12);
  }

  #[test]
  fn test_recombination_compute_log_sum_exp_2_both_neg_inf() {
    let result = compute_log_sum_exp_2(f64::NEG_INFINITY, f64::NEG_INFINITY);
    assert!(
      result.is_infinite() && result.is_sign_negative(),
      "expected -inf, got {result}"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::small_pos(  1.0,   2.0)]
  #[case::zeros(      0.0,   0.0)]
  #[case::small_neg( -1.0,  -2.0)]
  #[case::equal_ten( 10.0,  10.0)]
  #[case::large_neg(-50.0, -51.0)]
  #[trace]
  fn test_recombination_compute_log_sum_exp_2_matches_naive(#[case] a: f64, #[case] b: f64) {
    // Naive oracle: direct log(exp(a) + exp(b)). Valid where neither operand overflows/underflows,
    // cross-checking the stable `max + ln_1p` form.
    let naive = (a.exp() + b.exp()).ln();
    pretty_assert_abs_diff_eq!(naive, compute_log_sum_exp_2(a, b), epsilon = 1e-10);
  }

  #[test]
  fn test_recombination_forward_backward_empty() {
    assert!(compute_forward_backward_marginals(&[], &test_params()).is_empty());
  }

  // Loose qualitative bands (0.1, 0.9, etc.): assert signal direction (Ref low, Mut high, Missing
  // bridged stays elevated). Exact correctness pinned by the brute-force marginal tests below.
  #[test]
  fn test_recombination_forward_backward_all_ref_near_zero() {
    let marginals = compute_forward_backward_marginals(&obs("RRRRRRRRRRRRRRRRRRRR"), &test_params());
    let max = marginals.iter().copied().fold(f64::NEG_INFINITY, f64::max);
    assert!(max < 0.1, "all-Ref max P(recombinant) should be low, got {max}");
  }

  #[test]
  fn test_recombination_forward_backward_all_mut_near_one() {
    let marginals = compute_forward_backward_marginals(&obs("MMMMMMMMMMMMMMMMMMMM"), &test_params());
    let min = marginals.iter().copied().fold(f64::INFINITY, f64::min);
    assert!(min > 0.9, "all-Mut min P(recombinant) should be high, got {min}");
  }

  #[test]
  fn test_recombination_forward_backward_dense_block() {
    let marginals = compute_forward_backward_marginals(&obs("RRRRRRRRRRMMMMMMMMMMMMMMMRRRRRRRRRR"), &test_params());
    // Interior of Mut block [12..23] should have high marginals.
    let interior_min = marginals[12..23].iter().copied().fold(f64::INFINITY, f64::min);
    assert!(
      interior_min > 0.8,
      "interior Mut min should be high, got {interior_min}"
    );
    // Ref flanks [0..5] and [29..34] should have low marginals.
    let left_flank_max = marginals[0..5].iter().copied().fold(f64::NEG_INFINITY, f64::max);
    assert!(
      left_flank_max < 0.2,
      "left Ref flank max should be low, got {left_flank_max}"
    );
    let right_flank_max = marginals[29..34].iter().copied().fold(f64::NEG_INFINITY, f64::max);
    assert!(
      right_flank_max < 0.2,
      "right Ref flank max should be low, got {right_flank_max}"
    );
  }

  #[test]
  fn test_recombination_forward_backward_missing_run_persists() {
    // Mut block with Missing run in the middle -- marginals should stay elevated across the hole.
    let marginals =
      compute_forward_backward_marginals(&obs("RRRRRMMMMMMMMMMMMMMMXXXXXMMMMMMMMMMMMMMMRRRRR"), &test_params());
    // Middle of the Missing run (positions 22-23) should still show elevated marginals.
    let mid_min = marginals[22..24].iter().copied().fold(f64::INFINITY, f64::min);
    assert!(
      mid_min > 0.5,
      "Missing-bridged min marginal should stay elevated, got {mid_min}"
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
  fn test_recombination_forward_backward_matches_bruteforce_marginals(#[case] input: &str) {
    // Pins alpha/beta recurrence against brute-force marginalization over all 2^L paths -- a
    // different algorithm, not a re-derivation of the same math.
    let params = test_params();
    let observations = obs(input);
    assert!(
      observations.len() <= 12,
      "brute-force marginals are only tractable for short vectors"
    );

    let posteriors = compute_forward_backward_posteriors(&observations, &params);
    let expected = bruteforce_marginals(&observations, &params);
    assert_eq!(expected.len(), posteriors.len());

    // Compare each state column as a whole slice (`approx` implements `AbsDiffEq` for `[f64]`); the
    // failure diff shows the whole vectors, localizing the differing site. `[f64; 2]` has no such impl,
    // so the two columns are projected to flat `Vec<f64>` first.
    let exp_w: Vec<f64> = expected.iter().map(|p| p[WILDTYPE]).collect();
    let act_w: Vec<f64> = posteriors.iter().map(|p| p[WILDTYPE]).collect();
    let exp_r: Vec<f64> = expected.iter().map(|p| p[RECOMBINANT]).collect();
    let act_r: Vec<f64> = posteriors.iter().map(|p| p[RECOMBINANT]).collect();
    pretty_assert_abs_diff_eq!(exp_w[..], act_w[..], epsilon = 1e-9);
    pretty_assert_abs_diff_eq!(exp_r[..], act_r[..], epsilon = 1e-9);
  }

  #[test]
  fn test_recombination_compute_interval_confidences_single() {
    let marginals = vec![0.1, 0.2, 0.9, 0.95, 0.92, 0.3, 0.1];
    let intervals = ranges(&[(2, 5)]);
    let confidences = compute_interval_confidences(&marginals, &intervals);
    // Mean of [0.9, 0.95, 0.92] = 2.77 / 3 = 0.9233...
    assert_eq!(1, confidences.len());
    pretty_assert_abs_diff_eq!(0.923_333_333, confidences[0], epsilon = 1e-8);
  }

  #[test]
  fn test_recombination_compute_interval_confidences_multiple() {
    let marginals = vec![0.9, 0.8, 0.1, 0.1, 0.7, 0.85];
    let intervals = ranges(&[(0, 2), (4, 6)]);
    let confidences = compute_interval_confidences(&marginals, &intervals);
    assert_eq!(2, confidences.len());
    pretty_assert_abs_diff_eq!(0.85, confidences[0], epsilon = 1e-10); // mean(0.9, 0.8)
    pretty_assert_abs_diff_eq!(0.775, confidences[1], epsilon = 1e-10); // mean(0.7, 0.85)
  }

  #[test]
  fn test_recombination_integration_confidence_populated_when_regions_exist() {
    let observations = obs("RRRRRRRRRRMMMMMMMMMMMMMMMRRRRRRRRRR");
    let params = test_params();
    let regions = find_recombinant_regions(&observations, &params);
    assert!(!regions.is_empty(), "should find at least one region");
    let marginals = compute_forward_backward_marginals(&observations, &params);
    let confidences = compute_interval_confidences(&marginals, &regions);
    assert_eq!(regions.len(), confidences.len());
    let min_confidence = confidences.iter().copied().fold(f64::INFINITY, f64::min);
    assert!(
      min_confidence > 0.5,
      "min confidence for a strong Mut block should be high, got {min_confidence}"
    );
  }

  // Property: forward-backward marginals are always in [0, 1] for any valid params and observations.
  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(500))]

    #[test]
    fn test_prop_recombination_compute_forward_backward_marginals_bounded(
      observations in proptest::collection::vec(
        proptest::prop_oneof![
          proptest::prelude::Just(RecombinationObs::Ref),
          proptest::prelude::Just(RecombinationObs::Mut),
          proptest::prelude::Just(RecombinationObs::Missing),
        ],
        1..200_usize,
      ),
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let marginals = compute_forward_backward_marginals(&observations, &params);
      proptest::prop_assert_eq!(observations.len(), marginals.len());
      for (l, &m) in marginals.iter().enumerate() {
        proptest::prop_assert!((0.0..=1.0).contains(&m), "marginal at {l} out of [0,1]: {m}");
      }
    }
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(512))]

    // Pins the stable kernel to naive log(exp(a) + exp(b)) on a non-overflowing range.
    #[test]
    fn test_prop_recombination_compute_log_sum_exp_2_matches_naive(a in -30.0_f64..30.0, b in -30.0_f64..30.0) {
      let naive = (a.exp() + b.exp()).ln();
      let lse = compute_log_sum_exp_2(a, b);
      proptest::prop_assert!((naive - lse).abs() < 1e-9, "naive={naive} lse={lse}");
    }

    // Symmetric (bit-identical under swap) and never below the larger operand.
    #[test]
    fn test_prop_recombination_compute_log_sum_exp_2_commutative_and_lower_bounded(a in -1e6_f64..1e6, b in -1e6_f64..1e6) {
      proptest::prop_assert_eq!(compute_log_sum_exp_2(a, b).to_bits(), compute_log_sum_exp_2(b, a).to_bits());
      proptest::prop_assert!(compute_log_sum_exp_2(a, b) >= a.max(b), "lse below max for a={a} b={b}");
    }

    // All-Missing: no emission evidence, uniform prior, symmetric transitions -> posterior exactly 0.5
    // at every site. Analytic fixed point, independent of length.
    #[test]
    fn test_prop_recombination_forward_backward_all_missing_marginals_half(
      len in 1_usize..200,
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let observations = vec![RecombinationObs::Missing; len];
      let marginals = compute_forward_backward_marginals(&observations, &params);
      for (l, &m) in marginals.iter().enumerate() {
        proptest::prop_assert!((m - 0.5).abs() < 1e-9, "all-Missing marginal at {} not 0.5: {}", l, m);
      }
    }

    // Mean posterior must lie between min and max marginal within the interval. A summary averaging
    // the wrong slice would escape these bounds.
    #[test]
    fn test_prop_recombination_compute_interval_confidences_bounded_by_slice(
      marginals in proptest::collection::vec(0.0_f64..=1.0, 1..200),
      raw_intervals in proptest::collection::vec((proptest::prelude::any::<usize>(), proptest::prelude::any::<usize>()), 0..8),
    ) {
      let n = marginals.len();
      let intervals: Vec<NucRefGlobalRange> = raw_intervals
        .iter()
        .map(|&(a, b)| {
          let begin = a % n;
          let end = begin + 1 + (b % (n - begin));
          NucRefGlobalRange::from_usize(begin, end)
        })
        .collect();

      let confidences = compute_interval_confidences(&marginals, &intervals);

      proptest::prop_assert_eq!(confidences.len(), intervals.len());
      for (conf, iv) in confidences.iter().zip(&intervals) {
        let slice = &marginals[iv.begin.as_usize()..iv.end.as_usize()];
        let mn = slice.iter().copied().fold(f64::INFINITY, f64::min);
        let mx = slice.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        proptest::prop_assert!(*conf >= mn - 1e-12 && *conf <= mx + 1e-12, "conf {} outside [{}, {}]", conf, mn, mx);
        proptest::prop_assert!((0.0..=1.0).contains(conf), "conf {} out of [0, 1]", conf);
      }
    }
  }
}
