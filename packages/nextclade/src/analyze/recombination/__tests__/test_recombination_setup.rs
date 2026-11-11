//! Per-dataset setup: detection off, detection on with a supported dataset, and the load errors when the dataset
//! cannot support detection.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{
    REF_LEN, single_clade_tree, two_clade_tree,
  };
  use crate::analyze::recombination::call_qc::RecombinationCallQcConfig;
  use crate::analyze::recombination::config::RecombinationConfig;
  use crate::analyze::recombination::params::RecombinationHmmParams;
  use crate::analyze::recombination::setup::{RecombinationSetup, resolve_recombination_setup};
  use crate::assert_error;
  use crate::qc::qc_config::{QcConfig, QcRulesConfigPrivateMutations};
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[test]
  fn test_recombination_setup_off_needs_no_tree() {
    assert_eq!(None, resolve_recombination_setup(false, None, None, None, REF_LEN).unwrap());
  }

  #[test]
  fn test_recombination_setup_on_resolves_params() {
    let graph = two_clade_tree();
    // Oracle: hand-computed estimates of `two_clade_tree` (see its fixture comment).
    let expected = RecombinationSetup {
      params: RecombinationHmmParams::new(0.01 / 100.0, 2.0 / 100.0, 5.0 / 100.0).unwrap(),
      call_qc: RecombinationCallQcConfig {
        min_region_length: 50,
        max_region_missing_fraction: 0.5,
        max_recombinant_fraction: 2.0 / 3.0,
        private_mutations: QcRulesConfigPrivateMutations::example(),
      },
    };
    let qc_config = helpers::qc_config();
    assert_eq!(
      Some(expected),
      resolve_recombination_setup(true, None, Some(&graph), Some(&qc_config), REF_LEN).unwrap()
    );
  }

  #[test]
  fn test_recombination_setup_on_without_tree_is_error() {
    assert_error!(
      resolve_recombination_setup(true, None, None, Some(&helpers::qc_config()), REF_LEN),
      "Recombination detection is enabled for this dataset, but cannot run. To analyze without it, remove \
       `recombination.enabled` from pathogen.json or pass `--without-recombination`: No reference tree is available, \
       and recombination detection requires one to derive parent-relative mutations"
    );
  }

  #[test]
  fn test_recombination_setup_on_with_unsupported_tree_is_error() {
    let graph = single_clade_tree();
    assert_error!(
      resolve_recombination_setup(true, None, Some(&graph), Some(&helpers::qc_config()), REF_LEN),
      "Recombination detection is enabled for this dataset, but cannot run. To analyze without it, remove \
       `recombination.enabled` from pathogen.json or pass `--without-recombination`: The reference tree has fewer \
       than two clades, so the recombinant divergence rate (muR) cannot be estimated. Set `recombination.muR` in \
       pathogen.json"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::below_zero(-0.1)]
  #[case::above_one(  1.5)]
  #[case::nan(        f64::NAN)]
  #[trace]
  fn test_recombination_setup_rejects_region_missing_fraction_out_of_range(#[case] value: f64) {
    let config = RecombinationConfig {
      max_region_missing_fraction: OrderedFloat(value),
      ..RecombinationConfig::default()
    };
    assert_error!(
      helpers::resolve_with(&config),
      helpers::expected_fraction_error("maxRegionMissingFraction", value)
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::below_zero(-0.1)]
  #[case::above_one(  1.5)]
  #[trace]
  fn test_recombination_setup_rejects_recombinant_fraction_out_of_range(#[case] value: f64) {
    let config = RecombinationConfig {
      max_recombinant_fraction: OrderedFloat(value),
      ..RecombinationConfig::default()
    };
    assert_error!(
      helpers::resolve_with(&config),
      helpers::expected_fraction_error("maxRecombinantFraction", value)
    );
  }

  // The rest-of-sequence check needs the private mutations QC rule: absent `qc`, and a disabled rule, both fail.
  #[rustfmt::skip]
  #[rstest]
  #[case::qc_absent(   None)]
  #[case::qc_disabled( Some(QcConfig::default()))]
  #[trace]
  fn test_recombination_setup_requires_private_mutations_qc(#[case] qc_config: Option<QcConfig>) {
    let graph = two_clade_tree();
    assert_error!(
      resolve_recombination_setup(true, None, Some(&graph), qc_config.as_ref(), REF_LEN),
      "Recombination detection is enabled for this dataset, but cannot run. To analyze without it, remove \
       `recombination.enabled` from pathogen.json or pass `--without-recombination`: Recombination detection checks \
       the rest of each sequence outside the recombinant regions with the private mutations QC rule, but the rule is \
       absent or disabled. Configure `qc.privateMutations` in pathogen.json"
    );
  }

  mod helpers {
    use crate::analyze::recombination::__tests__::recombination_test_helpers::{REF_LEN, two_clade_tree};
    use crate::analyze::recombination::config::RecombinationConfig;
    use crate::analyze::recombination::setup::{RecombinationSetup, resolve_recombination_setup};
    use crate::qc::qc_config::{QcConfig, QcRulesConfigPrivateMutations};
    use eyre::Report;

    pub fn qc_config() -> QcConfig {
      QcConfig {
        private_mutations: QcRulesConfigPrivateMutations::example(),
        ..QcConfig::default()
      }
    }

    /// Resolve the setup with detection on, a supported tree, and the private mutations QC rule.
    pub fn resolve_with(config: &RecombinationConfig) -> Result<Option<RecombinationSetup>, Report> {
      resolve_recombination_setup(true, Some(config), Some(&two_clade_tree()), Some(&qc_config()), REF_LEN)
    }

    pub fn expected_fraction_error(name: &str, value: f64) -> String {
      format!(
        "Recombination detection is enabled for this dataset, but cannot run. To analyze without it, remove \
         `recombination.enabled` from pathogen.json or pass `--without-recombination`: \
         `recombination.{name}` in pathogen.json must be in the closed interval [0, 1], but got {value}"
      )
    }
  }
}
