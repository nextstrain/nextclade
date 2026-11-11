//! `RecombinationConfig` and `RecombinationUserParams` semantics: the on/off decision and serde defaults.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::config::{RecombinationConfig, RecombinationUserParams, is_recombination_enabled};
  use clap::Parser;
  use clap::error::ErrorKind;
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  // The dataset decides when the user makes no choice; absent config or `enabled` means off. The user's flags
  // override the dataset in both directions.
  #[rustfmt::skip]
  #[rstest]
  #[case::no_choice_absent(      (None,        None),        false)]
  #[case::no_choice_default(     (None,        Some(false)), false)]
  #[case::no_choice_enabled(     (None,        Some(true)),  true)]
  #[case::user_on_absent(        (Some(true),  None),        true)]
  #[case::user_on_disabled(      (Some(true),  Some(false)), true)]
  #[case::user_off_enabled(      (Some(false), Some(true)),  false)]
  #[case::user_off_absent(       (Some(false), None),        false)]
  #[trace]
  fn test_recombination_config_is_recombination_enabled(
    #[case] (user, dataset): (Option<bool>, Option<bool>),
    #[case] expected: bool,
  ) {
    let user = RecombinationUserParams {
      with_recombination: user == Some(true),
      without_recombination: user == Some(false),
    };
    let config = dataset.map(|enabled| RecombinationConfig { enabled, ..RecombinationConfig::default() });
    assert_eq!(expected, is_recombination_enabled(&user, config.as_ref()));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::none(        &[],                          None)]
  #[case::with(        &["--with-recombination"],    Some(true))]
  #[case::without(     &["--without-recombination"], Some(false))]
  #[trace]
  fn test_recombination_config_user_params_from_cli(#[case] args: &[&str], #[case] expected: Option<bool>) {
    let argv = [&["nextclade"], args].concat();
    let params = RecombinationUserParams::try_parse_from(argv).unwrap();
    assert_eq!(expected, params.choice());
  }

  #[test]
  fn test_recombination_config_user_params_from_cli_rejects_both_flags() {
    let result =
      RecombinationUserParams::try_parse_from(["nextclade", "--with-recombination", "--without-recombination"]);
    let error = result.map(|_| ()).map_err(|error| error.kind());
    assert_eq!(Err(ErrorKind::ArgumentConflict), error);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty_object(   "{}",                    false)]
  #[case::enabled_omitted(r#"{"gamma": 0.01}"#,    false)]
  #[case::enabled_true(   r#"{"enabled": true}"#,  true)]
  #[case::enabled_false(  r#"{"enabled": false}"#, false)]
  #[trace]
  fn test_recombination_config_serde_default_enabled(#[case] json: &str, #[case] expected: bool) {
    let config: RecombinationConfig = serde_json::from_str(json).unwrap();
    assert_eq!(expected, config.enabled);
  }

  #[test]
  fn test_recombination_config_serde_full_roundtrip() {
    // Every camelCase field deserializes into its Rust field, and reserializes to the same shape
    // (fields declared in struct order; unset optionals stay omitted via skip_serializing_if).
    let json = r#"{"enabled":true,"gamma":0.01,"muW":0.005,"muR":0.05,"minRegionLength":30,"maxRegionMissingFraction":0.25,"maxRecombinantFraction":0.8}"#;
    let config: RecombinationConfig = serde_json::from_str(json).unwrap();
    let expected = RecombinationConfig {
      enabled: true,
      gamma: Some(OrderedFloat(0.01)),
      mu_w: Some(OrderedFloat(0.005)),
      mu_r: Some(OrderedFloat(0.05)),
      min_region_length: 30,
      max_region_missing_fraction: OrderedFloat(0.25),
      max_recombinant_fraction: OrderedFloat(0.8),
    };
    assert_eq!(expected, config);
    assert_eq!(json, serde_json::to_string(&config).unwrap());
  }

  // Oracle: the defaults of the call checks agreed for detection (minimal region length 50, maximal missing fraction
  // 0.5, maximal recombinant fraction 2/3).
  #[test]
  fn test_recombination_config_serde_default() {
    let config: RecombinationConfig = serde_json::from_str("{}").unwrap();
    let expected = RecombinationConfig {
      enabled: false,
      gamma: None,
      mu_w: None,
      mu_r: None,
      min_region_length: 50,
      max_region_missing_fraction: OrderedFloat(0.5),
      max_recombinant_fraction: OrderedFloat(2.0 / 3.0),
    };
    assert_eq!(expected, config);
    assert_eq!(expected, RecombinationConfig::default());
  }
}
