use crate::qc::qc_config::QcRulesConfigMissingData;
use crate::qc::qc_length_scaling::{
  QcResultLengthScaling, QcSequenceLengths, qc_length_scaling, qc_length_scaling_factor,
};
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

/// Result of the missing data QC rule.
///
/// Penalizes sequences with excessive N (missing) characters. Score increases linearly from 0 to
/// 100 as the number of missing sites goes from `scoreBias` to `scoreBias + missingDataThreshold`.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultMissingData {
  /// Numeric QC score for this rule (0-100+)
  pub score: f64,
  /// Quality category derived from the score
  pub status: QcStatus,
  /// Total number of N (missing) characters in the query sequence
  pub total_missing: usize,
  /// Effective threshold above which the score reaches 100 (scoreBias + missingDataThreshold, after length scaling)
  pub missing_data_threshold: f64,
  /// Length scaling of `scoreBias` and `missingDataThreshold`
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub length_scaling: Option<QcResultLengthScaling>,
}

impl QcRule for QcResultMissingData {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_missing_data(
  total_missing: usize,
  lengths: &QcSequenceLengths,
  config: &QcRulesConfigMissingData,
) -> Option<QcResultMissingData> {
  if !config.enabled {
    return None;
  }

  let length_scaling = config
    .length_scaling
    .as_ref()
    .map(|length_scaling| qc_length_scaling(length_scaling, lengths.aligned, lengths.reference));
  let factor = qc_length_scaling_factor(length_scaling.as_ref());
  let score_bias = *config.score_bias * factor;
  let missing_data_threshold = *config.missing_data_threshold * factor;

  let score = clamp_min(
    ((total_missing as f64 - score_bias) * 100.0) / missing_data_threshold,
    0.0,
  );
  let status = QcStatus::from_score(score);

  Some(QcResultMissingData {
    score,
    status,
    total_missing,
    missing_data_threshold: missing_data_threshold + score_bias,
    length_scaling,
  })
}
