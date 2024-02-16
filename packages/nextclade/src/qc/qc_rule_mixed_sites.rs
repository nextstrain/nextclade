use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::qc::qc_config::{QcRulesConfigMixedSites};
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultMixedSites {
  pub score: f64,
  pub status: QcStatus,
  pub total_mixed_sites: usize,
  pub mixed_sites_threshold: usize,
}

impl QcRule for QcResultMixedSites {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_mixed_sites(
  nucleotide_composition: &BTreeMap<Nuc, usize>,
  config: &QcRulesConfigMixedSites,
) -> Option<QcResultMixedSites> {
  if !config.enabled {
    return None;
  }

  // Calculate total of mixed (ambiguous) nucleotides: non-ACGT, non-N, non-Gap
  let total_mixed_sites = nucleotide_composition
    .iter()
    .filter(|(nuc, _)| !(nuc.is_acgtn() || nuc.is_gap()))
    .map(|(_, total)| total)
    .sum();

  let score = clamp_min(
    100.0 * (total_mixed_sites as f64 / config.mixed_sites_threshold as f64),
    0.0,
  );
  let status = QcStatus::from_score(score);

  Some(QcResultMixedSites {
    score,
    status,
    total_mixed_sites,
    mixed_sites_threshold: config.mixed_sites_threshold,
  })
}
