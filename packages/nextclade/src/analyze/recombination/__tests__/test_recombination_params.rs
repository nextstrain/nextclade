//! `RecombinationHmmParams` validation, `is_hmm_probability`, and serde/`TryFrom` path.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::params::{RecombinationHmmParams, is_hmm_probability};
  use crate::{assert_error, pretty_assert_ulps_eq};
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::gamma_zero(0.0,  0.005, 0.05, "Recombination HMM parameter `gamma` must be in the open interval (0, 1), but got 0")]
  #[case::gamma_one( 1.0,  0.005, 0.05, "Recombination HMM parameter `gamma` must be in the open interval (0, 1), but got 1")]
  #[case::mu_w_zero( 5e-4, 0.0,   0.05, "Recombination HMM parameter `muW` must be in the open interval (0, 1), but got 0")]
  #[case::mu_r_one(  5e-4, 0.005, 1.0,  "Recombination HMM parameter `muR` must be in the open interval (0, 1), but got 1")]
  #[case::mu_w_neg(  5e-4, -0.1,  0.05, "Recombination HMM parameter `muW` must be in the open interval (0, 1), but got -0.1")]
  fn test_recombination_new_rejects_out_of_range_params(
    #[case] gamma: f64,
    #[case] mu_w: f64,
    #[case] mu_r: f64,
    #[case] expected: &str,
  ) {
    assert_error!(RecombinationHmmParams::new(gamma, mu_w, mu_r), expected);
  }

  #[test]
  fn test_recombination_new_rejects_high_gamma() {
    // Valid probability but not a sticky HMM: switching is at least as likely as staying.
    assert_error!(
      RecombinationHmmParams::new(0.5, 0.005, 0.05),
      "Recombination HMM requires gamma < 0.5 (state switching must be rarer than staying), but got gamma=0.5"
    );
  }

  #[test]
  fn test_recombination_new_rejects_non_elevated_recombinant_rate() {
    // Valid probabilities, but muR does not exceed muW: the two states are indistinguishable.
    assert_error!(
      RecombinationHmmParams::new(5e-4, 0.05, 0.05),
      "Recombination HMM requires muR > muW (elevated recombinant divergence), but got muW=0.05 and muR=0.05"
    );
  }

  #[test]
  fn test_recombination_new_accepts_valid_params() {
    // Private fields, so assert via getters. `new` stores inputs verbatim; 2-ulp bound is exact.
    let params = RecombinationHmmParams::new(5e-4, 0.005, 0.05).unwrap();
    pretty_assert_ulps_eq!(5e-4, params.gamma(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.005, params.mu_w(), max_ulps = 2);
    pretty_assert_ulps_eq!(0.05, params.mu_r(), max_ulps = 2);
  }

  #[test]
  fn test_recombination_hmm_params_deserialize_rejects_invalid() {
    // Serde enforces the same invariants via `TryFrom`.
    let json = r#"{"gamma":0.7,"muW":0.05,"muR":0.2}"#;
    let result = serde_json::from_str::<RecombinationHmmParams>(json).map_err(Report::from);
    assert_error!(
      result,
      "Recombination HMM requires gamma < 0.5 (state switching must be rarer than staying), but got gamma=0.7"
    );
  }

  #[test]
  fn test_recombination_hmm_params_deserialize_roundtrip_valid() {
    let params = RecombinationHmmParams::new(5e-4, 0.005, 0.05).unwrap();
    let json = serde_json::to_string(&params).unwrap();
    let back: RecombinationHmmParams = serde_json::from_str(&json).unwrap();
    assert_eq!(params, back);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::zero(         0.0,               false)]
  #[case::one(          1.0,               false)]
  #[case::negative(    -0.1,               false)]
  #[case::above_one(    1.5,               false)]
  #[case::nan(          f64::NAN,          false)]
  #[case::pos_inf(      f64::INFINITY,     false)]
  #[case::neg_inf(      f64::NEG_INFINITY, false)]
  #[case::tiny(         1e-9,              true)]
  #[case::half(         0.5,               true)]
  #[case::near_one(     0.999_999,         true)]
  fn test_recombination_is_hmm_probability_bounds(#[case] value: f64, #[case] expected: bool) {
    assert_eq!(expected, is_hmm_probability(value));
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(512))]

    // Valid params survive JSON round-trip within 2 ULPs. Not bit-exact because serde_json reparses
    // the shortest decimal to within one ULP. The fixed-value test pins one point; this covers the
    // whole valid regime.
    #[test]
    fn test_prop_recombination_params_serde_roundtrip(
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let json = serde_json::to_string(&params).unwrap();
      let back: RecombinationHmmParams = serde_json::from_str(&json).unwrap();
      proptest::prop_assert!(approx::ulps_eq!(params.gamma(), back.gamma(), max_ulps = 2), "gamma drift: {} vs {}", params.gamma(), back.gamma());
      proptest::prop_assert!(approx::ulps_eq!(params.mu_w(), back.mu_w(), max_ulps = 2), "muW drift: {} vs {}", params.mu_w(), back.mu_w());
      proptest::prop_assert!(approx::ulps_eq!(params.mu_r(), back.mu_r(), max_ulps = 2), "muR drift: {} vs {}", params.mu_r(), back.mu_r());
    }
  }
}
