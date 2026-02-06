use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::coord::position::PositionLike;
use crate::qc::qc_config::{QcRecombConfigReversionClustering, QcRulesConfigRecombinants};
use crate::qc::qc_recomb_utils::{PositionCluster, find_position_clusters};
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
pub struct RecombResultReversionClustering {
  pub reversion_ratio: f64,
  pub reversion_clusters: Vec<PositionCluster>,
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
  pub reversion_clustering: Option<RecombResultReversionClustering>,
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

fn strategy_reversion_clustering(
  private_muts: &PrivateNucMutations,
  config: &QcRecombConfigReversionClustering,
) -> Option<RecombResultReversionClustering> {
  if !config.enabled {
    return None;
  }

  let total = private_muts.total_private_substitutions;
  if total == 0 {
    return Some(RecombResultReversionClustering {
      reversion_ratio: 0.0,
      reversion_clusters: vec![],
      score: 0.0,
    });
  }

  let reversion_ratio = private_muts.total_reversion_substitutions as f64 / total as f64;

  let reversion_positions: Vec<isize> = private_muts
    .reversion_substitutions
    .iter()
    .map(|s| s.pos.as_isize())
    .collect();

  let reversion_clusters = find_position_clusters(
    &reversion_positions,
    config.cluster_window_size,
    config.min_cluster_size,
  );

  let score = if reversion_ratio >= *config.ratio_threshold && !reversion_clusters.is_empty() {
    reversion_ratio * reversion_clusters.len() as f64 * *config.weight
  } else {
    0.0
  };

  Some(RecombResultReversionClustering {
    reversion_ratio,
    reversion_clusters,
    score,
  })
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

  let wt_score = weighted_threshold.as_ref().map_or(0.0, |r| r.score);

  let reversion_clustering = config
    .reversion_clustering
    .as_ref()
    .and_then(|rc_config| strategy_reversion_clustering(private_nuc_mutations, rc_config));

  let rc_score = reversion_clustering.as_ref().map_or(0.0, |r| r.score);

  let overall_score = (wt_score + rc_score) * *config.score_weight;
  let status = QcStatus::from_score(overall_score);

  Some(QcResultRecombinants {
    score: overall_score,
    status,
    total_private_substitutions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
    weighted_threshold,
    reversion_clustering,
  })
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::nuc_sub::NucSub;
  use crate::coord::position::NucRefGlobalPosition;
  use ordered_float::OrderedFloat;

  fn make_reversion(pos: isize) -> NucSub {
    NucSub {
      pos: NucRefGlobalPosition::from(pos),
      ref_nuc: Nuc::A,
      qry_nuc: Nuc::T,
    }
  }

  fn make_config(enabled: bool, ratio_threshold: f64, weight: f64) -> QcRecombConfigReversionClustering {
    QcRecombConfigReversionClustering {
      enabled,
      weight: OrderedFloat(weight),
      ratio_threshold: OrderedFloat(ratio_threshold),
      cluster_window_size: 500,
      min_cluster_size: 3,
    }
  }

  fn make_private_muts(total_private: usize, reversions: Vec<NucSub>) -> PrivateNucMutations {
    let total_reversion = reversions.len();
    PrivateNucMutations {
      total_private_substitutions: total_private,
      total_reversion_substitutions: total_reversion,
      reversion_substitutions: reversions,
      ..Default::default()
    }
  }

  #[test]
  fn test_strategy_reversion_clustering_disabled() {
    let config = make_config(false, 0.3, 50.0);
    let private_muts = make_private_muts(10, vec![make_reversion(100)]);
    let result = strategy_reversion_clustering(&private_muts, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_strategy_reversion_clustering_no_mutations() {
    let config = make_config(true, 0.3, 50.0);
    let private_muts = make_private_muts(0, vec![]);
    let result = strategy_reversion_clustering(&private_muts, &config);
    let result = result.unwrap();
    assert!((result.reversion_ratio - 0.0).abs() < 1e-10);
    assert!(result.reversion_clusters.is_empty());
    assert!((result.score - 0.0).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_reversion_clustering_below_ratio_threshold() {
    let config = make_config(true, 0.3, 50.0);
    let private_muts = make_private_muts(10, vec![make_reversion(100), make_reversion(120)]);
    let result = strategy_reversion_clustering(&private_muts, &config);
    let result = result.unwrap();
    assert!((result.reversion_ratio - 0.2).abs() < 1e-10);
    assert!((result.score - 0.0).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_reversion_clustering_no_clusters() {
    let config = make_config(true, 0.3, 50.0);
    let reversions = vec![
      make_reversion(100),
      make_reversion(1000),
      make_reversion(2000),
      make_reversion(3000),
    ];
    let private_muts = make_private_muts(10, reversions);
    let result = strategy_reversion_clustering(&private_muts, &config);
    let result = result.unwrap();
    assert!((result.reversion_ratio - 0.4).abs() < 1e-10);
    assert!(result.reversion_clusters.is_empty());
    assert!((result.score - 0.0).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_reversion_clustering_with_cluster() {
    let config = make_config(true, 0.3, 50.0);
    let reversions = vec![
      make_reversion(100),
      make_reversion(120),
      make_reversion(140),
      make_reversion(160),
    ];
    let private_muts = make_private_muts(10, reversions);
    let result = strategy_reversion_clustering(&private_muts, &config);
    let result = result.unwrap();
    assert!((result.reversion_ratio - 0.4).abs() < 1e-10);
    assert_eq!(result.reversion_clusters.len(), 1);
    let expected_score = 0.4 * 1.0 * 50.0;
    assert!((result.score - expected_score).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_reversion_clustering_multiple_clusters() {
    let config = make_config(true, 0.3, 50.0);
    let reversions = vec![
      make_reversion(100),
      make_reversion(120),
      make_reversion(140),
      make_reversion(2000),
      make_reversion(2020),
      make_reversion(2040),
    ];
    let private_muts = make_private_muts(10, reversions);
    let result = strategy_reversion_clustering(&private_muts, &config);
    let result = result.unwrap();
    assert!((result.reversion_ratio - 0.6).abs() < 1e-10);
    assert_eq!(result.reversion_clusters.len(), 2);
    let expected_score = 0.6 * 2.0 * 50.0;
    assert!((result.score - expected_score).abs() < 1e-10);
  }
}
