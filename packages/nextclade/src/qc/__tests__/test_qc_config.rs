#[cfg(test)]
mod tests {
  use crate::assert_error;
  use crate::qc::qc_config::{
    QcConfig, QcLengthScaling, QcRulesConfigMissingData, QcRulesConfigMixedSites, QcRulesConfigPrivateMutations,
  };
  use indoc::indoc;
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use std::num::NonZeroUsize;
  use std::str::FromStr;

  #[test]
  fn test_qc_config_parses_length_scaling_of_each_rule() {
    let json = indoc! {r#"{
      "missingData": { "enabled": true, "missingDataThreshold": 1000, "scoreBias": 1000, "lengthScaling": { "minLength": 500 } },
      "mixedSites": { "enabled": true, "mixedSitesThreshold": 50, "lengthScaling": { "minLength": 1000 } },
      "privateMutations": { "enabled": true, "typical": 500, "cutoff": 1000, "lengthScaling": { "minLength": 300 } }
    }"#};

    let expected = QcConfig {
      missing_data: QcRulesConfigMissingData {
        enabled: true,
        missing_data_threshold: OrderedFloat(1000.0),
        score_bias: OrderedFloat(1000.0),
        length_scaling: Some(QcLengthScaling {
          min_length: NonZeroUsize::new(500).unwrap(),
        }),
      },
      mixed_sites: QcRulesConfigMixedSites {
        enabled: true,
        mixed_sites_threshold: 50,
        length_scaling: Some(QcLengthScaling {
          min_length: NonZeroUsize::new(1000).unwrap(),
        }),
      },
      private_mutations: QcRulesConfigPrivateMutations {
        enabled: true,
        weight_reversion_substitutions: OrderedFloat(1.0),
        weight_reversion_deletions: OrderedFloat(1.0),
        weight_labeled_substitutions: OrderedFloat(1.0),
        weight_labeled_deletions: OrderedFloat(1.0),
        weight_unlabeled_substitutions: OrderedFloat(1.0),
        weight_unlabeled_deletions: OrderedFloat(1.0),
        typical: OrderedFloat(500.0),
        cutoff: OrderedFloat(1000.0),
        length_scaling: Some(QcLengthScaling {
          min_length: NonZeroUsize::new(300).unwrap(),
        }),
      },
      ..QcConfig::default()
    };

    assert_eq!(expected, QcConfig::from_str(json).unwrap());
  }

  #[test]
  fn test_qc_config_without_length_scaling_has_none() {
    let json = r#"{ "mixedSites": { "enabled": true, "mixedSitesThreshold": 10 } }"#;
    let expected = QcRulesConfigMixedSites {
      enabled: true,
      mixed_sites_threshold: 10,
      length_scaling: None,
    };
    assert_eq!(expected, QcConfig::from_str(json).unwrap().mixed_sites);
  }

  #[test]
  fn test_qc_config_rejects_zero_min_length() {
    let json =
      r#"{ "mixedSites": { "enabled": true, "mixedSitesThreshold": 10, "lengthScaling": { "minLength": 0 } } }"#;
    assert_error!(
      QcConfig::from_str(json),
      "When parsing QC config: When parsing JSON: invalid value: integer `0`, expected a nonzero usize at line 1 column 95"
    );
  }

  #[test]
  fn test_qc_config_rejects_length_scaling_without_min_length() {
    let json = r#"{ "mixedSites": { "enabled": true, "mixedSitesThreshold": 10, "lengthScaling": {} } }"#;
    assert_error!(
      QcConfig::from_str(json),
      "When parsing QC config: When parsing JSON: missing field `minLength` at line 1 column 81"
    );
  }

  #[test]
  fn test_qc_config_accepts_min_length_equal_to_reference_length() {
    let config = QcConfig::from_str(
      r#"{ "privateMutations": { "enabled": true, "typical": 5, "cutoff": 15, "lengthScaling": { "minLength": 9646 } } }"#,
    )
    .unwrap();
    config.validate_for_reference(9646).unwrap();
  }

  #[test]
  fn test_qc_config_rejects_min_length_longer_than_reference() {
    let config = QcConfig::from_str(
      r#"{ "privateMutations": { "enabled": true, "typical": 5, "cutoff": 15, "lengthScaling": { "minLength": 9647 } } }"#,
    )
    .unwrap();
    assert_error!(
      config.validate_for_reference(9646),
      "QC rule 'privateMutations': 'lengthScaling.minLength' is 9647, but the reference sequence has 9646 nucleotides. Set 'minLength' to at most the length of the reference sequence."
    );
  }
}
