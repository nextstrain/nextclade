use crate::qc::qc_config::QcLengthScaling;
use serde::{Deserialize, Serialize};

/// Return the scaling of a rule's thresholds for a sequence of `length` positions.
pub fn qc_length_scaling(
  QcLengthScaling { min_length }: &QcLengthScaling,
  length: usize,
  reference_length: usize,
) -> QcResultLengthScaling {
  let length = length.max(min_length.get());
  QcResultLengthScaling {
    length,
    factor: length as f64 / reference_length as f64,
  }
}

/// Return the factor by which a rule multiplies its thresholds: 1 without length scaling.
pub fn qc_length_scaling_factor(length_scaling: Option<&QcResultLengthScaling>) -> f64 {
  length_scaling.map_or(1.0, |length_scaling| length_scaling.factor)
}

/// Length scaling that a QC rule applied to its thresholds
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultLengthScaling {
  /// Length (in nucleotides) used for scaling, at least `lengthScaling.minLength`
  pub length: usize,
  /// Factor applied to the thresholds: `length` divided by the reference length
  pub factor: f64,
}

/// Lengths of a query sequence on the reference, in nucleotides, with deletions included
#[derive(Clone, Copy, Debug)]
pub struct QcSequenceLengths {
  /// Length of the reference sequence
  pub reference: usize,
  /// Reference positions from the first to the last aligned query nucleotide
  pub aligned: usize,
  /// Aligned positions that are not `N`
  pub sequenced: usize,
  /// Sequenced positions without ambiguous nucleotides
  pub covered: usize,
}
