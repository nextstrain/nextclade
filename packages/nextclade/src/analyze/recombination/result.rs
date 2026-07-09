//! Per-sequence recombination detection result data model.

use crate::coord::range::NucRefGlobalRange;
use serde::{Deserialize, Serialize};

/// A putative recombinant interval with optional forward-backward confidence.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationRegion {
  pub range: NucRefGlobalRange,
  pub length: usize,
  /// Mean posterior P(recombinant) from forward-backward within this interval.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub confidence: Option<f64>,
}

/// Per-sequence detection result. Always has at least one region; empty results are `None`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
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
  /// Summarize decoded ranges with optional confidences. `None` when empty.
  pub(crate) fn from_ranges(ranges: Vec<NucRefGlobalRange>, confidences: Option<&[f64]>) -> Option<Self> {
    if ranges.is_empty() {
      return None;
    }
    debug_assert!(
      confidences.is_none_or(|c| c.len() == ranges.len()),
      "confidences length must match ranges length"
    );
    let regions: Vec<RecombinationRegion> = ranges
      .into_iter()
      .enumerate()
      .map(|(i, range)| {
        let length = range.len();
        let confidence = confidences.map(|c| c[i]);
        RecombinationRegion {
          range,
          length,
          confidence,
        }
      })
      .collect();
    let total_regions = regions.len();
    let total_length = regions.iter().map(|r| r.length).sum();
    let longest_region = regions.iter().max_by_key(|r| r.length).unwrap().clone();
    Some(Self {
      regions,
      total_regions,
      total_length,
      longest_region,
    })
  }
}
