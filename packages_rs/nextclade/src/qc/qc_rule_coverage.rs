use crate::qc::qc_config::QcRulesConfigCoverage;
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QcResultCoverage {
  pub score: f64,
  pub status: QcStatus,
  pub coverage: f64,
}

impl QcRule for QcResultCoverage {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_coverage(coverage: f64, config: &QcRulesConfigCoverage) -> Option<QcResultCoverage> {
  if !config.enabled {
    return None;
  }

  let score = (((1.0 - coverage) - config.score_bias) * 100.0) / config.score_threshold;
  let score = clamp_min(score, 0.0);

  let status = QcStatus::from_score(score);

  Some(QcResultCoverage {
    score,
    status,
    coverage,
  })
}
