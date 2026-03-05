use crate::qc::qc_config::QcRulesConfigMissingData;
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
  /// Effective threshold above which the score reaches 100 (scoreBias + missingDataThreshold from config)
  pub missing_data_threshold: f64,
}

impl QcRule for QcResultMissingData {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_missing_data(total_missing: usize, config: &QcRulesConfigMissingData) -> Option<QcResultMissingData> {
  if !config.enabled {
    return None;
  }

  let score = clamp_min(
    ((total_missing as f64 - *config.score_bias) * 100.0) / *config.missing_data_threshold,
    0.0,
  );
  let status = QcStatus::from_score(score);

  Some(QcResultMissingData {
    score,
    status,
    total_missing,
    missing_data_threshold: *config.missing_data_threshold + *config.score_bias,
  })
}
