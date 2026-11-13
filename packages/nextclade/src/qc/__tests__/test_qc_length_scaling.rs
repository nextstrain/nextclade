#[cfg(test)]
pub mod tests {
  use crate::qc::__tests__::test_qc_length_scaling::tests::helpers::{
    config_missing_data, config_mixed_sites, config_private_mutations, lengths_uniform, mixed_sites, private_mutations,
  };
  use crate::qc::qc_length_scaling::QcSequenceLengths;
  use crate::qc::qc_rule_missing_data::rule_missing_data;
  use crate::qc::qc_rule_mixed_sites::rule_mixed_sites;
  use crate::qc::qc_rule_private_mutations::rule_private_mutations;
  use approx::assert_abs_diff_eq;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::unscaled_short_sequence(  (None,      300,    100), 0.0)]                   // max(100 - 500, 0)
  #[case::scaled_many_mutations(    (Some(300), 300,    100), 283.333_333_333_333_3)] // (3333.33 - 500) / 10
  #[case::scaled_few_mutations(     (Some(300), 300,     30), 50.0)]                  // (1000 - 500) / 10
  #[case::below_min_length(         (Some(300), 100,     10), 0.0)]                   // max(333.33 - 500, 0)
  #[case::full_length(              (Some(300), 10_000, 600), 10.0)]                  // (600 - 500) / 10
  #[trace]
  fn test_qc_private_mutations_length_scaling(
    #[case] (min_length, length, num_mutations): (Option<usize>, usize, usize),
    #[case] expected_score: f64,
  ) {
    let config = config_private_mutations(500.0, 1000.0, min_length);
    let actual = rule_private_mutations(&private_mutations(num_mutations), &lengths_uniform(10_000, length), &config)
      .unwrap();
    assert_abs_diff_eq!(expected_score, actual.score, epsilon = 1e-12);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::unscaled_short_sequence(  (None,      300,    2), 4.0)]                   // 2 * 100 / 50
  #[case::scaled_short_sequence(    (Some(300), 300,    2), 133.333_333_333_333_3)] // 66.67 * 100 / 50
  #[case::below_min_length(         (Some(300), 100,    1), 66.666_666_666_666_7)]  // 33.33 * 100 / 50
  #[case::full_length(              (Some(300), 10_000, 5), 10.0)]                  // 5 * 100 / 50
  #[trace]
  fn test_qc_mixed_sites_length_scaling(
    #[case] (min_length, length, num_mixed): (Option<usize>, usize, usize),
    #[case] expected_score: f64,
  ) {
    let config = config_mixed_sites(50, min_length);
    let actual = rule_mixed_sites(&mixed_sites(num_mixed), &lengths_uniform(10_000, length), &config).unwrap();
    assert_abs_diff_eq!(expected_score, actual.score, epsilon = 1e-12);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::unscaled_short_sequence(  (None,      300,     150), (0.0,                  2000.0))] // max(150 - 1000, 0)
  #[case::scaled_short_sequence(    (Some(300), 300,     150), (400.0,                  60.0))] // (5000 - 1000) / 10, 2000 * 0.03
  #[case::below_min_length(         (Some(300), 100,      40), (33.333_333_333_333_3,   60.0))] // (1333.33 - 1000) / 10
  #[case::full_length(              (Some(300), 10_000, 1500), (50.0,                 2000.0))] // (1500 - 1000) / 10
  #[trace]
  fn test_qc_missing_data_length_scaling(
    #[case] (min_length, length, total_missing): (Option<usize>, usize, usize),
    #[case] (expected_score, expected_threshold): (f64, f64),
  ) {
    let config = config_missing_data(1000.0, 1000.0, min_length);
    let actual = rule_missing_data(total_missing, &lengths_uniform(10_000, length), &config).unwrap();
    assert_abs_diff_eq!(expected_score, actual.score, epsilon = 1e-12);
    assert_abs_diff_eq!(expected_threshold, actual.missing_data_threshold, epsilon = 1e-12);
  }

  #[test]
  fn test_qc_length_scaling_rule_lengths() {
    let lengths = QcSequenceLengths {
      reference: 10_000,
      aligned: 1000,
      sequenced: 400,
      covered: 390,
    };

    let actual = (
      rule_missing_data(600, &lengths, &config_missing_data(1000.0, 1000.0, Some(1)))
        .unwrap()
        .length_scaling
        .unwrap()
        .length,
      rule_mixed_sites(&mixed_sites(10), &lengths, &config_mixed_sites(50, Some(1)))
        .unwrap()
        .length_scaling
        .unwrap()
        .length,
      rule_private_mutations(
        &private_mutations(0),
        &lengths,
        &config_private_mutations(500.0, 1000.0, Some(1)),
      )
      .unwrap()
      .length_scaling
      .unwrap()
      .length,
    );

    assert_eq!((1000, 400, 390), actual);
  }

  #[test]
  fn test_qc_private_mutations_reports_excess_over_scaled_typical() {
    let config = config_private_mutations(500.0, 1000.0, Some(300));
    let actual = rule_private_mutations(&private_mutations(100), &lengths_uniform(10_000, 300), &config).unwrap();
    assert_abs_diff_eq!(85.0, actual.excess, epsilon = 1e-12); // 100 - 500 * 0.03
    assert_abs_diff_eq!(1000.0, actual.cutoff, epsilon = 1e-12);
    assert_abs_diff_eq!(0.03, actual.length_scaling.unwrap().factor, epsilon = 1e-12);
  }

  #[test]
  fn test_qc_rules_without_length_scaling_report_none() {
    let lengths = lengths_uniform(10_000, 300);
    let actual = (
      rule_missing_data(0, &lengths, &config_missing_data(1000.0, 1000.0, None))
        .unwrap()
        .length_scaling
        .is_none(),
      rule_mixed_sites(&mixed_sites(0), &lengths, &config_mixed_sites(50, None))
        .unwrap()
        .length_scaling
        .is_none(),
      rule_private_mutations(
        &private_mutations(0),
        &lengths,
        &config_private_mutations(500.0, 1000.0, None),
      )
      .unwrap()
      .length_scaling
      .is_none(),
    );
    assert_eq!((true, true, true), actual);
  }

  pub mod helpers {
    use crate::alphabet::nuc::Nuc;
    use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
    use crate::analyze::nuc_sub::NucSub;
    use crate::qc::qc_config::{
      QcLengthScaling, QcRulesConfigMissingData, QcRulesConfigMixedSites, QcRulesConfigPrivateMutations,
    };
    use crate::qc::qc_length_scaling::QcSequenceLengths;
    use itertools::Itertools;
    use maplit::btreemap;
    use ordered_float::OrderedFloat;
    use std::collections::BTreeMap;
    use std::num::NonZeroUsize;

    pub fn lengths_uniform(reference: usize, length: usize) -> QcSequenceLengths {
      QcSequenceLengths {
        reference,
        aligned: length,
        sequenced: length,
        covered: length,
      }
    }

    pub fn private_mutations(num_unlabeled_substitutions: usize) -> PrivateNucMutations {
      PrivateNucMutations {
        unlabeled_substitutions: (0..num_unlabeled_substitutions)
          .map(|pos| NucSub {
            ref_nuc: Nuc::A,
            pos: pos.into(),
            qry_nuc: Nuc::G,
          })
          .collect_vec(),
        ..PrivateNucMutations::default()
      }
    }

    pub fn mixed_sites(num_mixed: usize) -> BTreeMap<Nuc, usize> {
      btreemap! { Nuc::A => 100, Nuc::R => num_mixed }
    }

    pub fn length_scaling(min_length: usize) -> QcLengthScaling {
      QcLengthScaling {
        min_length: NonZeroUsize::new(min_length).unwrap(),
      }
    }

    pub fn config_private_mutations(
      typical: f64,
      cutoff: f64,
      min_length: Option<usize>,
    ) -> QcRulesConfigPrivateMutations {
      QcRulesConfigPrivateMutations {
        enabled: true,
        weight_reversion_substitutions: OrderedFloat(1.0),
        weight_reversion_deletions: OrderedFloat(1.0),
        weight_labeled_substitutions: OrderedFloat(1.0),
        weight_labeled_deletions: OrderedFloat(1.0),
        weight_unlabeled_substitutions: OrderedFloat(1.0),
        weight_unlabeled_deletions: OrderedFloat(1.0),
        typical: OrderedFloat(typical),
        cutoff: OrderedFloat(cutoff),
        length_scaling: min_length.map(length_scaling),
      }
    }

    pub fn config_mixed_sites(mixed_sites_threshold: usize, min_length: Option<usize>) -> QcRulesConfigMixedSites {
      QcRulesConfigMixedSites {
        enabled: true,
        mixed_sites_threshold,
        length_scaling: min_length.map(length_scaling),
      }
    }

    pub fn config_missing_data(
      missing_data_threshold: f64,
      score_bias: f64,
      min_length: Option<usize>,
    ) -> QcRulesConfigMissingData {
      QcRulesConfigMissingData {
        enabled: true,
        missing_data_threshold: OrderedFloat(missing_data_threshold),
        score_bias: OrderedFloat(score_bias),
        length_scaling: min_length.map(length_scaling),
      }
    }
  }
}
