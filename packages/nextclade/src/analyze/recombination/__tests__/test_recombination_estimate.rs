//! Resolving HMM parameters: `pathogen.json` override precedence, skip reasons, hard errors, and
//! the `compute_median`/`accept_as_probability` helpers.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{
    REF_LEN, disconnected_clade_tree, external_tree_with_deletion, internal_only_second_clade_tree, nested_clade_tree,
    resolved, single_clade_tree, three_clade_tree, tree_with_insertion, tree_with_malformed_mutation,
    two_clade_no_mutations_tree, two_clade_tree,
  };
  use crate::analyze::recombination::config::RecombinationConfig;
  use crate::analyze::recombination::estimate::{
    RecombinationResolution, RecombinationSkipReason, accept_as_probability, compute_inter_clade_leaf_distances,
    compute_median, estimate_mu_w, resolve_recombination_params,
  };
  use crate::tree::tree::{AuspiceGraph, AuspiceGraphMeta};
  use crate::{assert_error, pretty_assert_ulps_eq};
  use itertools::Itertools;
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use rand::SeedableRng;
  use rand::rngs::StdRng;
  use rand::seq::SliceRandom;
  use rstest::rstest;

  // Deterministic integer arithmetic: results are bit-identical. max_ulps = 2 guards against future
  // non-exact operations.
  #[test]
  fn test_recombination_estimate_all_params_from_tree() {
    let graph = two_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(1.0 / 100.0, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(2.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(5.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_mu_w_empty_graph() {
    let graph = AuspiceGraph::new(AuspiceGraphMeta::default());

    // There are no terminal branch lengths from which to estimate the fallback.
    assert_eq!(None, estimate_mu_w(&graph, REF_LEN).unwrap());
  }

  #[test]
  fn test_recombination_estimate_mu_w_zero_reference_length() {
    let graph = two_clade_tree();

    // Dividing the finite mean by zero is non-finite and therefore not a valid probability.
    assert_eq!(None, estimate_mu_w(&graph, 0).unwrap());
  }

  #[test]
  fn test_recombination_estimate_config_override_is_used_verbatim() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(0.1)),
      mu_w: None,
      mu_r: None,
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(0.1, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(2.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(5.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_partial_mu_overrides_used() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: None,
      mu_w: Some(OrderedFloat(0.01)),
      mu_r: Some(OrderedFloat(0.2)),
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(1.0 / 100.0, params.gamma(), max_ulps = 2); // still estimated
    pretty_assert_ulps_eq!(0.01, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.2, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_single_clade_is_unresolved() {
    let graph = single_clade_tree();
    // mu_r is undefined with a single clade and there is no override, so the model is skipped.
    let resolution = resolve_recombination_params(None, &graph, REF_LEN).unwrap();
    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::FewerThanTwoClades)
      ),
      "got {resolution:?}"
    );
  }

  #[test]
  fn test_recombination_estimate_skips_when_recombinant_rate_not_elevated() {
    let graph = two_clade_tree(); // estimated mu_w = 0.02
    // Only muR is overridden (0.01 <= muW), so this is a degenerate estimate, not a misconfiguration: skip.
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: None,
      mu_w: None,
      mu_r: Some(OrderedFloat(0.01)),
    };
    let resolution = resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap();
    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::RecombinantRateNotElevated { .. })
      ),
      "got {resolution:?}"
    );
  }

  #[test]
  fn test_recombination_estimate_errors_on_explicit_non_elevated_rate() {
    let graph = two_clade_tree();
    // Both rates explicit with muR <= muW: a misconfiguration, reported as a dataset-level error.
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: None,
      mu_w: Some(OrderedFloat(0.05)),
      mu_r: Some(OrderedFloat(0.01)),
    };
    assert_error!(
      resolve_recombination_params(Some(&config), &graph, REF_LEN),
      "Recombination parameters in pathogen.json require muR > muW, but got muW=0.05 and muR=0.01"
    );
  }

  #[test]
  fn test_recombination_estimate_errors_on_high_gamma_override() {
    let graph = two_clade_tree();
    // gamma = 0.7 is within (0, 1) but not a sticky HMM; the resolution surfaces the model error.
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(0.7)),
      mu_w: None,
      mu_r: None,
    };
    assert_error!(
      resolve_recombination_params(Some(&config), &graph, REF_LEN),
      "Recombination HMM requires gamma < 0.5 (state switching must be rarer than staying), but got gamma=0.7"
    );
  }

  #[test]
  fn test_recombination_estimate_errors_on_out_of_range_override() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(1.5)),
      mu_w: None,
      mu_r: None,
    };
    assert_error!(
      resolve_recombination_params(Some(&config), &graph, REF_LEN),
      "Recombination parameter `gamma` in pathogen.json must be in the open interval (0, 1), but got 1.5"
    );
  }

  #[test]
  fn test_recombination_estimate_three_clades_uses_nonroot_mrca() {
    // A1 and B1 share non-root MRCA `I`, exercising `- 2 * compute_root_distance(mrca)`.
    // Leaf distances: A1<->B1=6, A1<->C1=9, B1<->C1=11; median=9 -> mu_r=0.09.
    // Terminal branches 2, 4, 6 -> mean 4 -> mu_w=0.04.
    let graph = three_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(4.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(9.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_nested_clades_uses_leaf_distance() {
    // Ancestors one mutation apart, but leaves carry large terminal branches. mu_r tracks leaf
    // divergence, not ancestor proximity.
    // Cross-clade pairs: {10,8,10,8,6,6,14,12} -> median = (8+10)/2 = 9 -> mu_r = 0.09
    // Terminal branches: 1,8,6,1,4 -> mean 4 -> mu_w = 0.04
    let graph = nested_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(4.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(9.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_inter_clade_leaf_distances_are_exhaustive() {
    let graph = nested_clade_tree();

    let actual = compute_inter_clade_leaf_distances(&graph).unwrap();
    let actual = actual.into_iter().sorted().collect_vec();

    // Manual oracle from the fixture's branch mutations and d(a,b) = rd(a) + rd(b) - 2*rd(MRCA).
    let expected = vec![6, 6, 8, 8, 10, 10, 12, 14];
    assert_eq!(expected, actual);
  }

  #[test]
  fn test_recombination_estimate_disconnected_clades_error() {
    let graph = disconnected_clade_tree();

    assert_error!(
      compute_inter_clade_leaf_distances(&graph),
      "Recombination parameter estimation: node 1 has no common ancestor with the compared leaf"
    );
  }

  #[test]
  fn test_recombination_estimate_zero_reference_length_rejects_mu_r() {
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      gamma: Some(OrderedFloat(0.01)),
      mu_w: Some(OrderedFloat(0.01)),
      ..RecombinationConfig::default()
    };

    let resolution = resolve_recombination_params(Some(&config), &graph, 0).unwrap();

    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::TreeEstimateUnavailable)
      ),
      "got {resolution:?}"
    );
  }

  #[test]
  fn test_recombination_estimate_excludes_deletions_from_branch_length() {
    // Terminal branches counting substitutions only: A1=2, B1=1 (the `A15-` deletion excluded).
    // mean = (2+1)/2 = 1.5 -> mu_w = 1.5/100 = 0.015. If the deletion were counted, B1=2 and mu_w=0.02.
    let graph = external_tree_with_deletion();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(1.5 / 100.0, params.mu_w(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_internal_only_clade_is_fewer_than_two_clades() {
    // Internal node I is labeled clade "B" but no leaf is; the two leaves are both clade "A".
    // The skip reason is derived from leaf clades, so it must be FewerThanTwoClades.
    let graph = internal_only_second_clade_tree();
    let resolution = resolve_recombination_params(None, &graph, REF_LEN).unwrap();
    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::FewerThanTwoClades)
      ),
      "got {resolution:?}"
    );
  }

  #[test]
  fn test_recombination_estimate_no_branch_mutations_skip_reason() {
    // Two clades, but no `nuc` branch mutations: rates are undefined, so the reason distinguishes the
    // missing-annotation cause from a generic degenerate topology.
    let graph = two_clade_no_mutations_tree();
    let resolution = resolve_recombination_params(None, &graph, REF_LEN).unwrap();
    assert!(
      matches!(
        resolution,
        RecombinationResolution::Skipped(RecombinationSkipReason::NoBranchMutations)
      ),
      "got {resolution:?}"
    );
  }

  #[test]
  fn test_recombination_estimate_all_overrides_bypass_unresolvable_tree() {
    // A single-clade tree cannot estimate muR, so with no overrides it would skip. Overriding all
    // three parameters must resolve regardless: the estimator is not consulted when a value is given.
    let graph = single_clade_tree();
    let config = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: None,
      gamma: Some(OrderedFloat(0.01)),
      mu_w: Some(OrderedFloat(0.02)),
      mu_r: Some(OrderedFloat(0.2)),
    };
    let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(0.01, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.02, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.2, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_counts_insertions_as_mutations() {
    // The insertion "-10A" is counted (query base present), so B1's branch length is 2, not 1.
    let graph = tree_with_insertion();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(2.0 / 100.0, params.mu_w(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_errors_on_malformed_branch_mutation() {
    // A malformed tree annotation surfaces as an error instead of being silently miscounted.
    let graph = tree_with_malformed_mutation();
    assert_error!(
      resolve_recombination_params(None, &graph, REF_LEN),
      "When counting recombination branch mutations from tree annotation 'not-a-mutation': \
       Unable to parse nucleotide mutation: 'not-a-mutation'"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::no_reference_tree(RecombinationSkipReason::NoReferenceTree,
    "no reference tree is available, and recombination detection requires one to derive parent-relative mutations")]
  #[case::fewer_than_two(RecombinationSkipReason::FewerThanTwoClades,
    "the reference tree has fewer than two clades, so the recombinant divergence rate (muR) cannot be estimated")]
  #[case::no_mutations(RecombinationSkipReason::NoBranchMutations,
    "the reference tree carries no per-branch nucleotide mutations, so the wildtype and recombinant divergence rates cannot be estimated")]
  #[case::tree_unavailable(RecombinationSkipReason::TreeEstimateUnavailable,
    "a required parameter could not be estimated from the reference tree (degenerate topology)")]
  #[case::not_elevated(RecombinationSkipReason::RecombinantRateNotElevated { mu_w: 0.05, mu_r: 0.01 },
    "the estimated recombinant divergence rate does not exceed the wildtype rate (muW=0.05, muR=0.01)")]
  #[trace]
  fn test_recombination_skip_reason_message(#[case] reason: RecombinationSkipReason, #[case] expected: &str) {
    assert_eq!(expected, reason.message());
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty(  &[],                    None)]
  #[case::single( &[3.0],                 Some(3.0))]
  #[case::odd(    &[5.0, 1.0, 3.0],       Some(3.0))]      // sorted {1,3,5}, middle 3
  #[case::even(   &[1.0, 4.0, 2.0, 3.0],  Some(2.5))]      // sorted {1,2,3,4}, midpoint(2,3)
  #[trace]
  fn test_recombination_estimate_compute_median(#[case] values: &[f64], #[case] expected: Option<f64>) {
    assert_eq!(expected, compute_median(values));
  }

  #[rustfmt::skip]
  #[rstest]
  // accept_as_probability accepts only the open interval (0, 1); the closed endpoints and non-finite values
  // are rejected (they would produce log(0) = -inf in the decoder).
  #[case::zero( 0.0,      None)]
  #[case::one(  1.0,      None)]
  #[case::nan(  f64::NAN, None)]
  #[case::half( 0.5,      Some(0.5))]
  #[trace]
  fn test_recombination_estimate_accept_as_probability(#[case] value: f64, #[case] expected: Option<f64>) {
    assert_eq!(expected, accept_as_probability(value));
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(512))]

    // Permutation-invariant, within [min, max], and for odd length is one of the inputs.
    #[test]
    fn test_prop_recombination_estimate_median_invariants(
      values in proptest::collection::vec(-1e6_f64..1e6, 1..50_usize),
      seed in proptest::prelude::any::<u64>(),
    ) {
      let m = compute_median(&values).unwrap();

      let mn = values.iter().copied().fold(f64::INFINITY, f64::min);
      let mx = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
      proptest::prop_assert!(m >= mn && m <= mx, "median {} outside [{}, {}]", m, mn, mx);

      let mut shuffled = values.clone();
      let mut rng = StdRng::seed_from_u64(seed);
      shuffled.shuffle(&mut rng);
      proptest::prop_assert_eq!(compute_median(&values).map(f64::to_bits), compute_median(&shuffled).map(f64::to_bits));

      if values.len() % 2 == 1 {
        proptest::prop_assert!(
          values.iter().any(|&v| v.to_bits() == m.to_bits()),
          "odd-length median {} is not an input element",
          m
        );
      }
    }

    // All three params supplied -> estimator not consulted, resolved values bit-identical to overrides.
    #[test]
    fn test_prop_recombination_estimate_override_verbatim(
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let mu_r = mu_w + offset;
      let config = RecombinationConfig {
        enabled: Some(true),
        min_private_subs_to_run: None,
        gamma: Some(OrderedFloat(gamma)),
        mu_w: Some(OrderedFloat(mu_w)),
        mu_r: Some(OrderedFloat(mu_r)),
      };
      let graph = two_clade_tree();
      let params = resolved(resolve_recombination_params(Some(&config), &graph, REF_LEN).unwrap());
      proptest::prop_assert_eq!(params.gamma().to_bits(), gamma.to_bits());
      proptest::prop_assert_eq!(params.mu_w().to_bits(), mu_w.to_bits());
      proptest::prop_assert_eq!(params.mu_r().to_bits(), mu_r.to_bits());
    }
  }
}
