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
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[test]
  fn test_recombination_setup_off_needs_no_tree() {
    assert_eq!(None, resolve_recombination_setup(false, None, None, REF_LEN).unwrap());
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
      },
    };
    assert_eq!(
      Some(expected),
      resolve_recombination_setup(true, None, Some(&graph), REF_LEN).unwrap()
    );
  }

  #[test]
  fn test_recombination_setup_on_without_tree_is_error() {
    assert_error!(
      resolve_recombination_setup(true, None, None, REF_LEN),
      "Recombination detection is enabled for this dataset, but cannot run. To analyze without it, remove \
       `recombination.enabled` from pathogen.json or pass `--without-recombination`: No reference tree is available, \
       and recombination detection requires one to derive parent-relative mutations"
    );
  }

  #[test]
  fn test_recombination_setup_on_with_unsupported_tree_is_error() {
    let graph = single_clade_tree();
    assert_error!(
      resolve_recombination_setup(true, None, Some(&graph), REF_LEN),
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
    let graph = two_clade_tree();
    let config = RecombinationConfig {
      max_region_missing_fraction: OrderedFloat(value),
      ..RecombinationConfig::default()
    };
    assert_error!(
      resolve_recombination_setup(true, Some(&config), Some(&graph), REF_LEN),
      format!(
        "Recombination detection is enabled for this dataset, but cannot run. To analyze without it, remove \
         `recombination.enabled` from pathogen.json or pass `--without-recombination`: \
         `recombination.maxRegionMissingFraction` in pathogen.json must be in the closed interval [0, 1], but got {value}"
      )
    );
  }
}
