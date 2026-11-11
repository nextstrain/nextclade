//! Call checks of decoded recombinant regions: the region checks with the boundary values of their thresholds.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{obs, ranges};
  use crate::analyze::recombination::call_qc::{
    RecombinationCallQcConfig, compute_missing_fraction, filter_regions, is_region_supported,
  };
  use crate::coord::range::NucRefGlobalRange;
  use crate::pretty_assert_ulps_eq;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  // Small thresholds keep the fixtures short: regions need a span of at least 4 and at most half of their sites
  // missing.
  fn call_qc() -> RecombinationCallQcConfig {
    RecombinationCallQcConfig {
      min_region_length: 4,
      max_region_missing_fraction: 0.5,
    }
  }

  // Oracle: the fraction of `X` (Missing) in the region span, counted by hand.
  #[rustfmt::skip]
  #[rstest]
  #[case::no_missing(  "RMMMR",  (1, 4), 0.0)]
  #[case::half(        "RMXXM",  (1, 5), 0.5)]
  #[case::all_missing( "RXXXR",  (1, 4), 1.0)]
  #[case::outside(     "XXMMXX", (2, 4), 0.0)]
  #[trace]
  fn test_recombination_call_qc_missing_fraction(
    #[case] observations: &str,
    #[case] (begin, end): (usize, usize),
    #[case] expected: f64,
  ) {
    let region = NucRefGlobalRange::from_usize(begin, end);
    pretty_assert_ulps_eq!(expected, compute_missing_fraction(&region, &obs(observations)), max_ulps = 1);
  }

  // Region = the whole observation string. Boundaries: span 4 (= minimum) passes, span 3 fails; missing fraction 0.5
  // (= maximum) passes, 0.6 fails. A region that fails on missing data fails also when it is long enough.
  #[rustfmt::skip]
  #[rstest]
  #[case::min_length(              "MMMM",       true)]
  #[case::below_min_length(        "MMM",        false)]
  #[case::max_missing(             "MXXM",       true)]
  #[case::above_max_missing(       "MXXXM",      false)]
  #[case::long_but_mostly_missing( "MXXXXXXXXM", false)]
  #[case::below_max_missing(       "MXMXM",      true)]
  #[trace]
  fn test_recombination_call_qc_region_supported(#[case] observations: &str, #[case] expected: bool) {
    let observations = obs(observations);
    let region = NucRefGlobalRange::from_usize(0, observations.len());
    assert_eq!(expected, is_region_supported(&region, &observations, &call_qc()));
  }

  #[test]
  fn test_recombination_call_qc_filter_regions_keeps_supported_in_order() {
    //                      0         1         2
    //                      0123456789012345678901234
    let observations = obs("RMMMMRRMMMRRMXXXMRRMXXMRR");
    //                       [--]  [-]  [---]  [--]
    let regions = ranges(&[(1, 5), (7, 10), (12, 17), (19, 23)]);
    // (7, 10) is too short; (12, 17) has 3 of 5 sites missing.
    let expected = ranges(&[(1, 5), (19, 23)]);
    assert_eq!(expected, filter_regions(regions, &observations, &call_qc()));
  }
}
