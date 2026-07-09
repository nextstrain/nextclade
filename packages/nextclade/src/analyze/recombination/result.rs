//! Per-sequence recombination detection result data model.

use crate::coord::range::NucRefGlobalRange;
use serde::{Deserialize, Serialize};

/// A single putative recombinant interval with its range, nucleotide length, and optional
/// forward-backward confidence score.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationRegion {
  pub range: NucRefGlobalRange,
  pub length: usize,
  /// Mean posterior P(recombinant) from forward-backward within this interval.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub confidence: Option<f64>,
}

/// Per-sequence recombination detection result: the detected regions and their summary statistics.
///
/// Always contains at least one region. When detection runs but finds no recombinant intervals the
/// caller produces `None` rather than an empty `RecombinationResult`.
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
  /// Summarize decoded recombinant ranges with optional per-interval confidence scores.
  /// Returns `None` when the list is empty (detection ran but found no recombinant intervals).
  pub fn from_ranges(ranges: Vec<NucRefGlobalRange>, confidences: Option<&[f64]>) -> Option<Self> {
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
