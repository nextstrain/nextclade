//! Forward-backward scoring and confidence: the `log_sum_exp_2` kernel, per-site marginals against an
//! independent brute-force oracle, and mean-posterior interval confidences.

#[cfg(test)]
mod tests {
  use crate::analyze::__tests__::recombination_test_helpers::{bruteforce_marginals, obs, ranges, test_params};
  use crate::analyze::recombination::{
    RECOMBINANT, RecombinationHmmParams, RecombinationObs, WILDTYPE, compute_interval_confidences,
    find_recombinant_regions, forward_backward_marginals, forward_backward_posteriors, log_sum_exp_2,
  };
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
  fn test_recombination_log_sum_exp_2(#[case] a: f64, #[case] b: f64, #[case] expected: f64) {
    pretty_assert_abs_diff_eq!(expected, log_sum_exp_2(a, b), epsilon = 1e-12);
  }

  #[test]
  fn test_recombination_log_sum_exp_2_both_neg_inf() {
    let result = log_sum_exp_2(f64::NEG_INFINITY, f64::NEG_INFINITY);
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
  fn test_recombination_log_sum_exp_2_matches_naive(#[case] a: f64, #[case] b: f64) {
    // Independent naive oracle: log(exp(a) + exp(b)) computed directly. Valid for operands where
    // exp(a) and exp(b) neither overflow nor underflow, so it cross-checks the stable `max + ln_1p`
    // form on well-conditioned inputs.
    let naive = (a.exp() + b.exp()).ln();
    pretty_assert_abs_diff_eq!(naive, log_sum_exp_2(a, b), epsilon = 1e-10);
  }

  #[test]
  fn test_recombination_forward_backward_empty() {
    assert!(forward_backward_marginals(&[], &test_params()).is_empty());
  }

  // The thresholds in these four forward-backward tests (0.1, 0.9, 0.8, 0.2, 0.5) are loose
  // qualitative sanity bands, not derived values: they assert the sign of the signal (Ref sites low,
  // Mut sites high, Missing-bridged sites stay elevated), not exact posteriors. Exact per-site
  // correctness is pinned by `test_recombination_forward_backward_matches_bruteforce_marginals`
  // against an independent oracle.
  #[test]
  fn test_recombination_forward_backward_all_ref_near_zero() {
    let marginals = forward_backward_marginals(&obs("RRRRRRRRRRRRRRRRRRRR"), &test_params());
    for &m in &marginals {
      assert!(m < 0.1, "all-Ref site should have low P(recombinant), got {m}");
    }
  }

  #[test]
  fn test_recombination_forward_backward_all_mut_near_one() {
    let marginals = forward_backward_marginals(&obs("MMMMMMMMMMMMMMMMMMMM"), &test_params());
    for &m in &marginals {
      assert!(m > 0.9, "all-Mut site should have high P(recombinant), got {m}");
    }
  }

  #[test]
  fn test_recombination_forward_backward_dense_block() {
    let marginals = forward_backward_marginals(&obs("RRRRRRRRRRMMMMMMMMMMMMMMMRRRRRRRRRR"), &test_params());
    // Interior of Mut block [12..23] should have high marginals.
    for &m in &marginals[12..23] {
      assert!(m > 0.8, "interior Mut site should be high, got {m}");
    }
    // Ref flanks [0..5] and [29..34] should have low marginals.
    for &m in &marginals[0..5] {
      assert!(m < 0.2, "Ref flank site should be low, got {m}");
    }
    for &m in &marginals[29..34] {
      assert!(m < 0.2, "Ref flank site should be low, got {m}");
    }
  }

  #[test]
  fn test_recombination_forward_backward_missing_run_persists() {
    // Mut block with Missing run in the middle -- marginals should stay elevated across the hole.
    let marginals = forward_backward_marginals(&obs("RRRRRMMMMMMMMMMMMMMMXXXXXMMMMMMMMMMMMMMMRRRRR"), &test_params());
    // Middle of the Missing run (positions 22-23) should still show elevated marginals.
    for &m in &marginals[22..24] {
      assert!(
        m > 0.5,
        "Missing-bridged site should maintain elevated marginal, got {m}"
      );
    }
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
    // Compare the production forward-backward posteriors against an independent brute-force
    // marginalization over all 2^L hidden-state paths. This pins the alpha/beta recurrence and its
    // normalization against a different algorithm, not against a re-derivation of the same math (as a
    // sum-to-one identity on the same normalizer would be). Normalization is covered transitively:
    // brute-force marginals sum to 1, so matching them forces the production posteriors to as well.
    let params = test_params();
    let observations = obs(input);
    assert!(
      observations.len() <= 12,
      "brute-force marginals are only tractable for short vectors"
    );

    let posteriors = forward_backward_posteriors(&observations, &params);
    let expected = bruteforce_marginals(&observations, &params);
    assert_eq!(expected.len(), posteriors.len());

    for (post, exp) in posteriors.iter().zip(&expected) {
      pretty_assert_abs_diff_eq!(exp[WILDTYPE], post[WILDTYPE], epsilon = 1e-9);
      pretty_assert_abs_diff_eq!(exp[RECOMBINANT], post[RECOMBINANT], epsilon = 1e-9);
    }
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
    let marginals = forward_backward_marginals(&observations, &params);
    let confidences = compute_interval_confidences(&marginals, &regions);
    assert_eq!(regions.len(), confidences.len());
    for &c in &confidences {
      assert!(c > 0.5, "confidence for a strong Mut block should be high, got {c}");
    }
  }

  // Property: forward-backward marginals are always in [0, 1] for any valid params and observations.
  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(500))]

    #[test]
    fn test_prop_recombination_forward_backward_marginals_bounded(
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
      let marginals = forward_backward_marginals(&observations, &params);
      proptest::prop_assert_eq!(observations.len(), marginals.len());
      for (l, &m) in marginals.iter().enumerate() {
        proptest::prop_assert!((0.0..=1.0).contains(&m), "marginal at {l} out of [0,1]: {m}");
      }
    }
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(512))]

    // log_sum_exp_2 reproduces the naive log(exp(a) + exp(b)) on a range where the naive form does not
    // overflow, so the numerically stable kernel is pinned to its mathematical definition.
    #[test]
    fn test_prop_recombination_log_sum_exp_2_matches_naive(a in -30.0_f64..30.0, b in -30.0_f64..30.0) {
      let naive = (a.exp() + b.exp()).ln();
      let lse = log_sum_exp_2(a, b);
      proptest::prop_assert!((naive - lse).abs() < 1e-9, "naive={naive} lse={lse}");
    }

    // log_sum_exp_2 is symmetric in its arguments (bit-identical under swap) and never falls below the
    // larger operand, both required for the forward-backward recursions that consume it.
    #[test]
    fn test_prop_recombination_log_sum_exp_2_commutative_and_lower_bounded(a in -1e6_f64..1e6, b in -1e6_f64..1e6) {
      proptest::prop_assert_eq!(log_sum_exp_2(a, b).to_bits(), log_sum_exp_2(b, a).to_bits());
      proptest::prop_assert!(log_sum_exp_2(a, b) >= a.max(b), "lse below max for a={a} b={b}");
    }

    // An all-Missing observation vector carries no emission evidence, so with a uniform prior and
    // symmetric transitions the posterior is exactly 0.5 at every site for any valid parameters. This
    // is an analytic fixed point of forward-backward independent of length, complementing the bounded
    // marginals property.
    #[test]
    fn test_prop_recombination_forward_backward_all_missing_marginals_half(
      len in 1_usize..200,
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let observations = vec![RecombinationObs::Missing; len];
      let marginals = forward_backward_marginals(&observations, &params);
      for (l, &m) in marginals.iter().enumerate() {
        proptest::prop_assert!((m - 0.5).abs() < 1e-9, "all-Missing marginal at {} not 0.5: {}", l, m);
      }
    }

    // A per-interval confidence is the mean posterior within the interval, so it must lie between the
    // minimum and maximum marginal over that interval (and stay in [0, 1] when the marginals do). A
    // summary that averaged the wrong slice would escape these bounds.
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
