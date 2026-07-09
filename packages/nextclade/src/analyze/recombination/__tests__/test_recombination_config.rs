//! [`RecombinationConfig`] semantics: default-on enablement, explicit-enable detection, serde
//! defaults, and the minimum private-substitution threshold.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::cfg_min_subs;
  use crate::analyze::recombination::config::RecombinationConfig;
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
  // is_explicitly_enabled is true ONLY for `enabled: true`; the default-on states (absent config or
  // omitted `enabled`) are not explicit, so they do not warrant a skip warning.
  #[case::absent(None,                                                                                       false)]
  #[case::default(Some(RecombinationConfig::default()),                                                      false)]
  #[case::explicit_on(Some(RecombinationConfig { enabled: Some(true),  ..RecombinationConfig::default() }),  true)]
  #[case::explicit_off(Some(RecombinationConfig { enabled: Some(false), ..RecombinationConfig::default() }), false)]
  fn test_recombination_config_is_explicitly_enabled(#[case] config: Option<RecombinationConfig>, #[case] expected: bool) {
    assert_eq!(expected, RecombinationConfig::is_explicitly_enabled(config.as_ref()));
  }

  #[rustfmt::skip]
  #[rstest]
  // `enabled` is Option<bool>: absent or omitted deserializes to None (default-on), only an explicit
  // value is Some. `is_enabled` treats None and Some(true) as enabled, Some(false) as disabled.
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
}
