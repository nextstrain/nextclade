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
  /// Summarize decoded regions, each paired with its optional confidence. `None` when empty.
  ///
  /// Pairing range and confidence at the input makes a per-region confidence count mismatch
  /// unrepresentable: every region carries exactly its own confidence, so no length invariant
  /// needs enforcing.
  pub(crate) fn from_ranges(regions: Vec<(NucRefGlobalRange, Option<f64>)>) -> Option<Self> {
    if regions.is_empty() {
      return None;
    }
    let regions: Vec<RecombinationRegion> = regions
      .into_iter()
      .map(|(range, confidence)| {
        let length = range.len();
        RecombinationRegion {
          range,
          length,
          confidence,
        }
      })
      .collect();
    let total_regions = regions.len();
    let total_length = regions.iter().map(|r| r.length).sum();
    let longest_region = regions
      .iter()
      .max_by_key(|r| r.length)
      .expect("regions is non-empty: empty case returns None above")
      .clone();
    Some(Self {
      regions,
      total_regions,
      total_length,
      longest_region,
    })
  }
}
