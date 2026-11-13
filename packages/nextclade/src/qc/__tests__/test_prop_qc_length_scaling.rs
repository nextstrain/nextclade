#[cfg(test)]
mod tests {
  use approx::abs_diff_eq;
  use generators::{RuleParams, gen_rule_params};
  use helpers::scores;
  use proptest::prelude::*;
  use proptest::test_runner::RngSeed;

  proptest! {
    #![proptest_config(ProptestConfig {
      rng_seed: RngSeed::Fixed(0),
      failure_persistence: None,
      ..ProptestConfig::default()
    })]

    #[test]
    fn test_prop_qc_length_scaling_full_length_preserves_scores(params in gen_rule_params(), reference in 1_usize..20_000) {
      let min_length = params.min_length.min(reference);
      let scaled = scores(&params, Some(min_length), reference, reference);
      let unscaled = scores(&params, None, reference, reference);
      prop_assert_eq!(unscaled, scaled);
    }

    #[test]
    fn test_prop_qc_length_scaling_matches_density_oracle(params in gen_rule_params(), length in 1_usize..2000, k in 1_usize..20) {
      let reference = length * k;
      let min_length = params.min_length.min(length);
      let scaled = scores(&params, Some(min_length), length, reference);
      let oracle = scores(&RuleParams { count: params.count * k, ..params }, None, reference, reference);
      prop_assert!(abs_diff_eq!(oracle.0, scaled.0, epsilon = 1e-9), "private mutations: {oracle:?} != {scaled:?}");
      prop_assert!(abs_diff_eq!(oracle.1, scaled.1, epsilon = 1e-9), "mixed sites: {oracle:?} != {scaled:?}");
      prop_assert!(abs_diff_eq!(oracle.2, scaled.2, epsilon = 1e-9), "missing data: {oracle:?} != {scaled:?}");
    }

    #[test]
    fn test_prop_qc_length_scaling_below_min_length_preserves_scores(params in gen_rule_params(), shortfall in 0_usize..300) {
      let reference = 20_000;
      let length = params.min_length.saturating_sub(shortfall);
      let below = scores(&params, Some(params.min_length), length, reference);
      let at_min_length = scores(&params, Some(params.min_length), params.min_length, reference);
      prop_assert_eq!(at_min_length, below);
    }
  }

  mod helpers {
    use super::generators::RuleParams;
    use crate::qc::__tests__::test_qc_length_scaling::tests::helpers::{
      config_missing_data, config_mixed_sites, config_private_mutations, lengths_uniform, mixed_sites, private_mutations,
    };
    use crate::qc::qc_rule_missing_data::rule_missing_data;
    use crate::qc::qc_rule_mixed_sites::rule_mixed_sites;
    use crate::qc::qc_rule_private_mutations::rule_private_mutations;

    pub fn scores(params: &RuleParams, min_length: Option<usize>, length: usize, reference: usize) -> (f64, f64, f64) {
      let lengths = lengths_uniform(reference, length);
      let config_pm = config_private_mutations(params.typical, params.cutoff, min_length);
      let config_ms = config_mixed_sites(params.mixed_sites_threshold, min_length);
      let config_md = config_missing_data(params.missing_data_threshold, params.score_bias, min_length);
      (
        rule_private_mutations(&private_mutations(params.count), &lengths, &config_pm)
          .unwrap()
          .score,
        rule_mixed_sites(&mixed_sites(params.count), &lengths, &config_ms)
          .unwrap()
          .score,
        rule_missing_data(params.count, &lengths, &config_md).unwrap().score,
      )
    }
  }

  mod generators {
    use proptest::prelude::*;

    #[derive(Clone, Debug)]
    pub struct RuleParams {
      pub count: usize,
      pub min_length: usize,
      pub typical: f64,
      pub cutoff: f64,
      pub mixed_sites_threshold: usize,
      pub missing_data_threshold: f64,
      pub score_bias: f64,
    }

    pub fn gen_rule_params() -> impl Strategy<Value = RuleParams> {
      (
        0_usize..200,
        1_usize..1000,
        0_u32..100,
        1_u32..100,
        1_usize..100,
        1_u32..1000,
        0_u32..1000,
      )
        .prop_map(
          |(count, min_length, typical, cutoff, mixed_sites_threshold, missing_data_threshold, score_bias)| {
            RuleParams {
              count,
              min_length,
              typical: f64::from(typical),
              cutoff: f64::from(cutoff),
              mixed_sites_threshold,
              missing_data_threshold: f64::from(missing_data_threshold),
              score_bias: f64::from(score_bias),
            }
          },
        )
    }
  }
}
