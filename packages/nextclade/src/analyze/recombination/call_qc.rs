//! Quality control of recombinant calls.
//!
//! The region checks drop decoded regions that rest on too little evidence: regions that consist mostly of missing
//! sites, and regions shorter than a minimal length.

use crate::analyze::recombination::observations::RecombinationObs;
use crate::coord::range::NucRefGlobalRange;

/// Keep the decoded regions that pass the region checks.
pub(crate) fn filter_regions(
  regions: Vec<NucRefGlobalRange>,
  obs: &[RecombinationObs],
  config: &RecombinationCallQcConfig,
) -> Vec<NucRefGlobalRange> {
  regions
    .into_iter()
    .filter(|region| is_region_supported(region, obs, config))
    .collect()
}

/// Settings of the call checks, resolved once per dataset.
#[derive(Clone, Debug, PartialEq)]
pub struct RecombinationCallQcConfig {
  /// Minimal span of a region, in nucleotides
  pub min_region_length: usize,
  /// Maximal fraction of missing sites in the span of a region
  pub max_region_missing_fraction: f64,
}

/// Whether a region passes the region checks: its fraction of missing sites is at most
/// `max_region_missing_fraction`, and its span is at least `min_region_length`.
pub(crate) fn is_region_supported(
  region: &NucRefGlobalRange,
  obs: &[RecombinationObs],
  config: &RecombinationCallQcConfig,
) -> bool {
  compute_missing_fraction(region, obs) <= config.max_region_missing_fraction && region.len() >= config.min_region_length
}

/// Fraction of the sites in the span of a region that the decoder observes as `Missing`.
pub(crate) fn compute_missing_fraction(region: &NucRefGlobalRange, obs: &[RecombinationObs]) -> f64 {
  let span = region.len();
  if span == 0 {
    return 0.0;
  }
  let missing = obs
    .get(region.to_std())
    .map_or(span, |sites| sites.iter().filter(|o| **o == RecombinationObs::Missing).count());
  missing as f64 / span as f64
}
