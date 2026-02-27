use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::qc::qc_config::{QcRecombConfigClusterGaps, QcRulesConfigRecombinants};
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
pub struct RecombResultClusterGaps {
  pub num_clusters: usize,
  pub max_gap: usize,
  pub gaps: Vec<usize>,
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
  pub cluster_gaps: Option<RecombResultClusterGaps>,
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

fn strategy_cluster_gaps(
  snp_clusters: Option<&QcResultSnpClusters>,
  config: &QcRecombConfigClusterGaps,
) -> Option<RecombResultClusterGaps> {
  if !config.enabled {
    return None;
  }

  let clusters = match snp_clusters {
    Some(result) => &result.clustered_snps,
    None => {
      return Some(RecombResultClusterGaps {
        num_clusters: 0,
        max_gap: 0,
        gaps: vec![],
        score: 0.0,
      });
    }
  };

  if clusters.len() < 2 {
    return Some(RecombResultClusterGaps {
      num_clusters: clusters.len(),
      max_gap: 0,
      gaps: vec![],
      score: 0.0,
    });
  }

  let gaps: Vec<usize> = clusters
    .windows(2)
    .map(|w| w[1].start.saturating_sub(w[0].end))
    .collect();

  let max_gap = gaps.iter().copied().max().unwrap_or(0);

  let score = if max_gap >= config.min_gap_size {
    (clusters.len() as f64 - 1.0) * *config.weight_per_gap
      + (max_gap as f64 / config.min_gap_size as f64) * *config.weight_gap_size
  } else {
    0.0
  };

  Some(RecombResultClusterGaps {
    num_clusters: clusters.len(),
    max_gap,
    gaps,
    score,
  })
}

pub fn rule_recombinants(
  private_nuc_mutations: &PrivateNucMutations,
  snp_clusters: Option<&QcResultSnpClusters>,
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

  let wt_strategy_score = if weighted_count > threshold as f64 {
    clamp_min(excess * *wt_config.weight / threshold as f64, 0.0)
  } else {
    0.0
  };

  let weighted_threshold = wt_config.enabled.then_some(RecombResultWeightedThreshold {
    weighted_count,
    threshold,
    excess,
    score: wt_strategy_score,
  });

  let cg_config = config.cluster_gaps.clone().unwrap_or_default();
  let cluster_gaps = strategy_cluster_gaps(snp_clusters, &cg_config);
  let cg_strategy_score = cluster_gaps.as_ref().map_or(0.0, |cg| cg.score);

  let total_strategy_score = wt_strategy_score + cg_strategy_score;
  let overall_score = total_strategy_score * *config.score_weight;
  let status = QcStatus::from_score(overall_score);

  Some(QcResultRecombinants {
    score: overall_score,
    status,
    total_private_substitutions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
    weighted_threshold,
    cluster_gaps,
  })
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::qc::qc_rule_snp_clusters::ClusteredSnp;
  use ordered_float::OrderedFloat;

  fn make_config(enabled: bool, min_gap_size: usize) -> QcRecombConfigClusterGaps {
    QcRecombConfigClusterGaps {
      enabled,
      min_gap_size,
      weight_per_gap: OrderedFloat(25.0),
      weight_gap_size: OrderedFloat(0.01),
    }
  }

  fn make_snp_clusters(clusters: Vec<(usize, usize, usize)>) -> QcResultSnpClusters {
    QcResultSnpClusters {
      score: 0.0,
      status: QcStatus::Good,
      total_snps: clusters.iter().map(|(_, _, n)| n).sum(),
      clustered_snps: clusters
        .into_iter()
        .map(|(start, end, number_of_snps)| ClusteredSnp {
          start,
          end,
          number_of_snps,
        })
        .collect(),
    }
  }

  #[test]
  fn test_strategy_cluster_gaps_disabled() {
    let config = make_config(false, 1000);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (5000, 5100, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_strategy_cluster_gaps_no_snp_clusters() {
    let config = make_config(true, 1000);
    let result = strategy_cluster_gaps(None, &config);
    let result = result.expect("expected Some");
    assert_eq!(result.num_clusters, 0);
    assert_eq!(result.max_gap, 0);
    assert!(result.gaps.is_empty());
    assert!((result.score - 0.0).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_cluster_gaps_single_cluster() {
    let config = make_config(true, 1000);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    let result = result.expect("expected Some");
    assert_eq!(result.num_clusters, 1);
    assert_eq!(result.max_gap, 0);
    assert!(result.gaps.is_empty());
    assert!((result.score - 0.0).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_cluster_gaps_two_clusters_gap_below_threshold() {
    let config = make_config(true, 1000);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (500, 600, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    let result = result.expect("expected Some");
    assert_eq!(result.num_clusters, 2);
    assert_eq!(result.max_gap, 300);
    assert_eq!(result.gaps, vec![300]);
    assert!((result.score - 0.0).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_cluster_gaps_two_clusters_gap_above_threshold() {
    let config = make_config(true, 1000);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (5000, 5100, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    let result = result.expect("expected Some");
    assert_eq!(result.num_clusters, 2);
    assert_eq!(result.max_gap, 4800);
    assert_eq!(result.gaps, vec![4800]);
    let expected_score = 1.0 * 25.0 + (4800.0 / 1000.0) * 0.01;
    assert!((result.score - expected_score).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_cluster_gaps_three_clusters() {
    let config = make_config(true, 1000);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (5000, 5100, 4), (10000, 10100, 3)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    let result = result.expect("expected Some");
    assert_eq!(result.num_clusters, 3);
    assert_eq!(result.max_gap, 4900);
    assert_eq!(result.gaps, vec![4800, 4900]);
    let expected_score = 2.0 * 25.0 + (4900.0 / 1000.0) * 0.01;
    assert!((result.score - expected_score).abs() < 1e-10);
  }

  #[test]
  fn test_strategy_cluster_gaps_exactly_at_threshold() {
    let config = make_config(true, 1000);
    let snp_clusters = make_snp_clusters(vec![(0, 100, 5), (1100, 1200, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    let result = result.expect("expected Some");
    assert_eq!(result.num_clusters, 2);
    assert_eq!(result.max_gap, 1000);
    let expected_score = 1.0 * 25.0 + (1000.0 / 1000.0) * 0.01;
    assert!((result.score - expected_score).abs() < 1e-10);
  }
}
