//! Resolving the recombination HMM parameters from `pathogen.json` overrides and tree-based
//! fallbacks: override precedence, skip reasons, hard errors, and the `median`/`as_probability`
//! numeric helpers.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{
    REF_LEN, external_tree_with_deletion, internal_only_second_clade_tree, nested_clade_tree, resolved,
    single_clade_tree, three_clade_tree, tree_with_insertion, tree_with_malformed_mutation,
    two_clade_no_mutations_tree, two_clade_tree,
  };
  use crate::analyze::recombination::config::RecombinationConfig;
  use crate::analyze::recombination::estimate::{
    RecombinationResolution, RecombinationSkipReason, as_probability, median, resolve_recombination_params,
  };
  use crate::{assert_error, pretty_assert_ulps_eq};
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use rand::SeedableRng;
  use rand::rngs::StdRng;
  use rand::seq::SliceRandom;
  use rstest::rstest;

  // The estimator does deterministic integer arithmetic (small counts divided by ref_len), so results
  // are bit-identical to the expected literals; a `max_ulps = 2` bound compares them exactly while
  // staying robust if a future estimator step introduces a non-exact operation.
  #[test]
  fn test_recombination_estimate_all_params_from_tree() {
    let graph = two_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(1.0 / 100.0, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(2.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(5.0 / 100.0, params.mu_r(), max_ulps = 2);
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
    // Three single-leaf clades where A1 and B1 share a non-root MRCA `I`, exercising the
    // `- 2 * root_distance(mrca)` term. Root distances: A1=3, B1=5, C1=6. Leaf-pair distances:
    //   A1<->B1 through I(rd 1): 3+5-2 = 6;  A1<->C1 through root: 9;  B1<->C1 through root: 11.
    // median{6, 9, 11} = 9 -> mu_r = 0.09. Terminal branches 2, 4, 6 -> mean 4 -> mu_w = 0.04.
    let graph = three_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(4.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(9.0 / 100.0, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_estimate_nested_clades_uses_leaf_distance() {
    // Nested clades whose clade ancestors sit one mutation apart but whose leaves carry large terminal
    // branches. mu_r reflects the actual inter-clade leaf divergence the HMM will encounter, not the
    // small ancestor separation.
    // Leaf pairs across clades:
    //   parent<->child: {10, 8, 10, 8}  parent<->other: {6, 6}  child<->other: {14, 12}
    // sorted: {6, 6, 8, 8, 10, 10, 12, 14} -> median = (8+10)/2 = 9 -> mu_r = 0.09
    // Terminal branches: 1, 8, 6, 1, 4 -> mean = 4 -> mu_w = 0.04
    let graph = nested_clade_tree();
    let params = resolved(resolve_recombination_params(None, &graph, REF_LEN).unwrap());
    pretty_assert_ulps_eq!(4.0 / 100.0, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(9.0 / 100.0, params.mu_r(), max_ulps = 2);
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
  fn test_recombination_estimate_median(#[case] values: &[f64], #[case] expected: Option<f64>) {
    assert_eq!(expected, median(values));
  }

  #[rustfmt::skip]
  #[rstest]
  // as_probability accepts only the open interval (0, 1); the closed endpoints and non-finite values
  // are rejected (they would produce log(0) = -inf in the decoder).
  #[case::zero( 0.0,      None)]
  #[case::one(  1.0,      None)]
  #[case::nan(  f64::NAN, None)]
  #[case::half( 0.5,      Some(0.5))]
  #[trace]
  fn test_recombination_estimate_as_probability(#[case] value: f64, #[case] expected: Option<f64>) {
    assert_eq!(expected, as_probability(value));
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(512))]

    // median depends only on the multiset of inputs, so it is invariant under permutation; it always
    // lies within the value range; and for odd length it is one of the inputs. A median that failed to
    // sort, or that computed the wrong index, would break at least one of these.
    #[test]
    fn test_prop_recombination_estimate_median_invariants(
      values in proptest::collection::vec(-1e6_f64..1e6, 1..50_usize),
      seed in proptest::prelude::any::<u64>(),
    ) {
      let m = median(&values).unwrap();

      let mn = values.iter().copied().fold(f64::INFINITY, f64::min);
      let mx = values.iter().copied().fold(f64::NEG_INFINITY, f64::max);
      proptest::prop_assert!(m >= mn && m <= mx, "median {} outside [{}, {}]", m, mn, mx);

      let mut shuffled = values.clone();
      let mut rng = StdRng::seed_from_u64(seed);
      shuffled.shuffle(&mut rng);
      proptest::prop_assert_eq!(median(&values).map(f64::to_bits), median(&shuffled).map(f64::to_bits));

      if values.len() % 2 == 1 {
        proptest::prop_assert!(
          values.iter().any(|&v| v.to_bits() == m.to_bits()),
          "odd-length median {} is not an input element",
          m
        );
      }
    }

    // A pathogen.json override is used verbatim: when all three parameters are supplied, the estimator
    // is never consulted and the resolved parameters are bit-identical to the overrides, for any valid
    // parameter triple (gamma < 0.5, 0 < mu_w < mu_r < 1). The tree fixture is irrelevant in this arm.
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
