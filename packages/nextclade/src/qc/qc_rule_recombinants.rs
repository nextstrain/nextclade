use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::qc::qc_config::QcRulesConfigRecombinants;
use crate::qc::qc_rule_snp_clusters::QcResultSnpClusters;
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombResultWeightedThreshold {
  pub weighted_count: f64,
  pub threshold: usize,
  pub excess: f64,
  pub score: f64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombResultSpatialUniformity {
  pub coefficient_of_variation: f64,
  pub num_segments: usize,
  pub segment_counts: Vec<usize>,
  pub score: f64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombResultClusterGaps {
  pub num_clusters: usize,
  pub max_gap: usize,
  pub gaps: Vec<usize>,
  pub score: f64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombResultReversionClustering {
  pub reversion_ratio: f64,
  pub reversion_clusters: Vec<crate::qc::qc_recomb_utils::PositionCluster>,
  pub score: f64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultRecombinants {
  pub score: f64,
  pub status: QcStatus,
  pub total_private_substitutions: usize,
  pub total_reversion_substitutions: usize,
  pub total_labeled_substitutions: usize,
  pub total_unlabeled_substitutions: usize,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub weighted_threshold: Option<RecombResultWeightedThreshold>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub spatial_uniformity: Option<RecombResultSpatialUniformity>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub cluster_gaps: Option<RecombResultClusterGaps>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub reversion_clustering: Option<RecombResultReversionClustering>,
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_recombinants(
  private_nuc_mutations: &PrivateNucMutations,
  _snp_clusters: Option<&QcResultSnpClusters>,
  config: &QcRulesConfigRecombinants,
) -> Option<QcResultRecombinants> {
  if !config.enabled {
    return None;
  }

  let total_private_substitutions = private_nuc_mutations.total_private_substitutions;
  let total_reversion_substitutions = private_nuc_mutations.total_reversion_substitutions;
  let total_labeled_substitutions = private_nuc_mutations.total_labeled_substitutions;
  let total_unlabeled_substitutions = private_nuc_mutations.total_unlabeled_substitutions;

  let wt_config = config.get_weighted_threshold_config();

  let weighted_count = *wt_config.weight_unlabeled * total_unlabeled_substitutions as f64
    + *wt_config.weight_labeled * total_labeled_substitutions as f64
    + *wt_config.weight_reversion * total_reversion_substitutions as f64;

  let threshold = wt_config.threshold;
  let excess = (weighted_count - threshold as f64).max(0.0);

  let strategy_score = if weighted_count > threshold as f64 {
    clamp_min(excess * *wt_config.weight / threshold as f64, 0.0)
  } else {
    0.0
  };

  let weighted_threshold = wt_config.enabled.then_some(RecombResultWeightedThreshold {
    weighted_count,
    threshold,
    excess,
    score: strategy_score,
  });

  let overall_score = strategy_score * *config.score_weight;
  let status = QcStatus::from_score(overall_score);

  Some(QcResultRecombinants {
    score: overall_score,
    status,
    total_private_substitutions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
    weighted_threshold,
    spatial_uniformity: None,
    cluster_gaps: None,
    reversion_clustering: None,
  })
}
