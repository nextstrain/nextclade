use crate::analyze::mutation_patterns::MutationPatternCluster;
use crate::qc::qc_config::QcRulesConfigSnpClusters;
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

/// A cluster of private nucleotide substitutions within a genomic window.
///
/// Clusters indicate localized quality problems, such as contamination or sequencing artifacts
/// in a narrow region of the genome.
#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ClusteredSnp {
  /// 0-based position of the first substitution in the cluster
  pub start: usize,
  /// 0-based position of the last substitution in the cluster
  pub end: usize,
  /// Number of substitutions in this cluster
  pub number_of_snps: usize,
}

/// Result of the SNP clusters QC rule.
///
/// Detects clusters of private substitutions within a sliding window. If more than `clusterCutOff`
/// substitutions fall within a `windowSize`-nucleotide window, it counts as one cluster. Score
/// equals the number of clusters times `scoreWeight`.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
pub struct QcResultSnpClusters {
  /// Numeric QC score for this rule (0-100+)
  pub score: f64,
  /// Quality category derived from the score
  pub status: QcStatus,

  /// Total number of substitutions across all clusters
  #[serde(rename = "totalSNPs")]
  pub total_snps: usize,

  /// List of detected substitution clusters
  #[serde(rename = "clusteredSNPs")]
  pub clustered_snps: Vec<ClusteredSnp>,
}

impl QcRule for QcResultSnpClusters {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_snp_clusters(
  qc_clusters: &[MutationPatternCluster],
  config: &QcRulesConfigSnpClusters,
) -> Option<QcResultSnpClusters> {
  if !config.enabled {
    return None;
  }

  let clustered_snps: Vec<ClusteredSnp> = qc_clusters
    .iter()
    .map(|c| ClusteredSnp {
      start: c.start,
      end: c.end,
      number_of_snps: c.count,
    })
    .collect();

  let total_clusters = clustered_snps.len();
  let total_snps = clustered_snps.iter().map(|c| c.number_of_snps).sum();

  let score = clamp_min(total_clusters as f64 * *config.score_weight, 0.0);
  let status = QcStatus::from_score(score);

  Some(QcResultSnpClusters {
    score,
    status,
    total_snps,
    clustered_snps,
  })
}

#[cfg(test)]
#[allow(
  clippy::float_cmp,
  reason = "SNP cluster QC scores are exact products of integer cluster counts and fixed score weights"
)]
mod tests {
  use super::*;
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;

  fn make_config(enabled: bool, score_weight: f64) -> QcRulesConfigSnpClusters {
    QcRulesConfigSnpClusters {
      enabled,
      score_weight: OrderedFloat(score_weight),
      window_size: 0,
      cluster_cut_off: 0,
    }
  }

  fn make_cluster(start: usize, end: usize, n: usize) -> MutationPatternCluster {
    MutationPatternCluster {
      start,
      end,
      count: n,
      ..MutationPatternCluster::default()
    }
  }

  #[test]
  fn test_rule_snp_clusters_disabled() {
    let result = rule_snp_clusters(&[], &make_config(false, 50.0));
    assert!(result.is_none());
  }

  #[test]
  fn test_rule_snp_clusters_empty() {
    let result = rule_snp_clusters(&[], &make_config(true, 50.0)).expect("should be Some");
    assert_eq!(0.0, result.score);
    assert!(matches!(result.status, QcStatus::Good));
    assert_eq!(0, result.total_snps);
    assert!(result.clustered_snps.is_empty());
  }

  #[test]
  fn test_rule_snp_clusters_one_cluster() {
    let clusters = vec![make_cluster(100, 200, 6)];
    let result = rule_snp_clusters(&clusters, &make_config(true, 50.0)).expect("should be Some");
    assert_eq!(50.0, result.score);
    assert!(matches!(result.status, QcStatus::Mediocre));
    assert_eq!(6, result.total_snps);
    assert_eq!(1, result.clustered_snps.len());
    assert_eq!(100, result.clustered_snps[0].start);
    assert_eq!(200, result.clustered_snps[0].end);
    assert_eq!(6, result.clustered_snps[0].number_of_snps);
  }

  #[test]
  fn test_rule_snp_clusters_two_clusters_bad() {
    let clusters = vec![make_cluster(100, 200, 6), make_cluster(500, 600, 8)];
    let result = rule_snp_clusters(&clusters, &make_config(true, 50.0)).expect("should be Some");
    assert_eq!(100.0, result.score);
    assert!(matches!(result.status, QcStatus::Bad));
    assert_eq!(14, result.total_snps);
  }
}
