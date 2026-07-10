//! `RecombinationConfig` semantics: enablement, serde defaults, minimum private-sub threshold.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::cfg_min_subs;
  use crate::analyze::recombination::config::RecombinationConfig;
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::absent(None,                                                                                      true)]
  #[case::default(Some(RecombinationConfig::default()),                                                     true)]
  #[case::explicit_on(Some(RecombinationConfig { enabled: Some(true),  ..RecombinationConfig::default() }), true)]
  #[case::explicit_off(Some(RecombinationConfig { enabled: Some(false), ..RecombinationConfig::default() }), false)]
  fn test_recombination_config_is_enabled_default_on(#[case] config: Option<RecombinationConfig>, #[case] expected: bool) {
    assert_eq!(expected, RecombinationConfig::is_enabled(config.as_ref()));
  }

  #[rustfmt::skip]
  #[rstest]
  // is_explicitly_enabled is true only for `enabled: true`; default-on states are not explicit.
  #[case::absent(None,                                                                                       false)]
  #[case::default(Some(RecombinationConfig::default()),                                                      false)]
  #[case::explicit_on(Some(RecombinationConfig { enabled: Some(true),  ..RecombinationConfig::default() }),  true)]
  #[case::explicit_off(Some(RecombinationConfig { enabled: Some(false), ..RecombinationConfig::default() }), false)]
  fn test_recombination_config_is_explicitly_enabled(#[case] config: Option<RecombinationConfig>, #[case] expected: bool) {
    assert_eq!(expected, RecombinationConfig::is_explicitly_enabled(config.as_ref()));
  }

  #[rustfmt::skip]
  #[rstest]
  // `enabled`: None (absent/omitted) = default-on, Some(true) = on, Some(false) = off.
  #[case::empty_object("{}",                    None,        true)]
  #[case::enabled_omitted(r#"{"gamma": 0.01}"#, None,        true)]
  #[case::enabled_true(r#"{"enabled": true}"#,  Some(true),  true)]
  #[case::enabled_false(r#"{"enabled": false}"#, Some(false), false)]
  fn test_recombination_config_serde_default_enabled(#[case] json: &str, #[case] enabled: Option<bool>, #[case] is_enabled: bool) {
    let config: RecombinationConfig = serde_json::from_str(json).unwrap();
    assert_eq!(enabled, config.enabled);
    assert_eq!(is_enabled, RecombinationConfig::is_enabled(Some(&config)));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::absent(         None,                                   1)]
  #[case::field_omitted(  Some(RecombinationConfig::default()),   1)]
  #[case::explicit_one(   Some(cfg_min_subs(1)),                  1)]
  #[case::explicit_three( Some(cfg_min_subs(3)),                  3)]
  #[case::explicit_zero(  Some(cfg_min_subs(0)),                  0)]
  fn test_recombination_config_min_private_subs_to_run(#[case] config: Option<RecombinationConfig>, #[case] expected: usize) {
    assert_eq!(expected, RecombinationConfig::min_private_subs_to_run(config.as_ref()));
  }

  #[test]
  fn test_recombination_config_serde_full_roundtrip() {
    // Every camelCase field deserializes into its Rust field, and reserializes to the same shape
    // (fields declared in struct order; unset optionals stay omitted via skip_serializing_if).
    let json = r#"{"enabled":true,"minPrivateSubsToRun":3,"gamma":0.01,"muW":0.005,"muR":0.05}"#;
    let config: RecombinationConfig = serde_json::from_str(json).unwrap();
    let expected = RecombinationConfig {
      enabled: Some(true),
      min_private_subs_to_run: Some(3),
      gamma: Some(OrderedFloat(0.01)),
      mu_w: Some(OrderedFloat(0.005)),
      mu_r: Some(OrderedFloat(0.05)),
    };
    assert_eq!(expected, config);
    assert_eq!(json, serde_json::to_string(&config).unwrap());
  }

  #[test]
  fn test_recombination_config_serde_default_is_empty_object() {
    // All fields unset -> `{}` (every field is `skip_serializing_if`), the shape an absent config takes.
    assert_eq!("{}", serde_json::to_string(&RecombinationConfig::default()).unwrap());
  }
}
