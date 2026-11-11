//! Per-sequence recombination detection result data model.

use crate::coord::range::NucRefGlobalRange;
use serde::{Deserialize, Serialize};

/// A putative recombinant interval.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationRegion {
  pub range: NucRefGlobalRange,
  pub length: usize,
}

/// Per-sequence detection result. Always has at least one region; empty results are `None`.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationResult {
  /// Putative recombinant intervals.
  pub regions: Vec<RecombinationRegion>,

  /// Number of recombinant regions.
  pub total_regions: usize,

  /// Total length of all recombinant regions, in nucleotides.
  pub total_length: usize,

  /// The longest recombinant region.
  pub longest_region: RecombinationRegion,
}

impl RecombinationResult {
  /// Summarize decoded regions. `None` when empty.
  pub(crate) fn from_ranges(ranges: Vec<NucRefGlobalRange>) -> Option<Self> {
    let regions: Vec<RecombinationRegion> = ranges
      .into_iter()
      .map(|range| {
        let length = range.len();
        RecombinationRegion { range, length }
      })
      .collect();
    let longest_region = regions.iter().max_by_key(|r| r.length)?.clone();
    let total_regions = regions.len();
    let total_length = regions.iter().map(|r| r.length).sum();
    Some(Self {
      regions,
      total_regions,
      total_length,
      longest_region,
    })
  }
}
