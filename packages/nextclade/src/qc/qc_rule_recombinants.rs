use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::qc::qc_config::QcRulesConfigRecombinants;
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultRecombinants {
  pub score: f64,
  pub status: QcStatus,
  pub total_private_mutations: usize,
  pub total_reversion_substitutions: usize,
  pub mutations_threshold: usize,
  pub excess_mutations: usize,
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_recombinants(
  private_nuc_mutations: &PrivateNucMutations,
  config: &QcRulesConfigRecombinants,
) -> Option<QcResultRecombinants> {
  if !config.enabled {
    return None;
  }

  let total_private_mutations = private_nuc_mutations.total_private_substitutions;
  let total_reversion_substitutions = private_nuc_mutations.total_reversion_substitutions;

  // Calculate the total mutations relevant for recombinant detection
  // This includes all private substitutions and reversions, as both are indicators of recombination
  let total_mutations_for_recombination = total_private_mutations + total_reversion_substitutions;

  let excess_mutations = if total_mutations_for_recombination > config.mutations_threshold {
    total_mutations_for_recombination - config.mutations_threshold
  } else {
    0
  };

  // Calculate score based on excess mutations beyond threshold
  let score = if total_mutations_for_recombination > config.mutations_threshold {
    clamp_min(excess_mutations as f64 * *config.score_weight / config.mutations_threshold as f64, 0.0)
  } else {
    0.0
  };

  let status = QcStatus::from_score(score);

  Some(QcResultRecombinants {
    score,
    status,
    total_private_mutations,
    total_reversion_substitutions,
    mutations_threshold: config.mutations_threshold,
    excess_mutations,
  })
}
