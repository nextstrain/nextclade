use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::coord::position::PositionLike;
use crate::qc::qc_config::{
  QcRecombConfigClusterGaps, QcRecombConfigLabelSwitching, QcRecombConfigReversionClustering,
  QcRecombConfigSpatialUniformity, QcRulesConfigRecombinants,
};
use crate::qc::qc_recomb_utils::{PositionCluster, compute_cv, find_position_clusters, segment_mutation_counts};
use crate::qc::qc_rule_snp_clusters::QcResultSnpClusters;
use crate::qc::qc_run::{QcRule, QcStatus};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
  pub reversion_clusters: Vec<PositionCluster>,
  pub score: f64,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombResultLabelSwitching {
  pub num_labels: usize,
  pub label_segments: BTreeMap<String, usize>,
  pub num_switches: usize,
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
  pub spatial_uniformity: Option<RecombResultSpatialUniformity>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub cluster_gaps: Option<RecombResultClusterGaps>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub reversion_clustering: Option<RecombResultReversionClustering>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub label_switching: Option<RecombResultLabelSwitching>,
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_recombinants(
  private_nuc_mutations: &PrivateNucMutations,
  snp_clusters: Option<&QcResultSnpClusters>,
  genome_length: usize,
  config: &QcRulesConfigRecombinants,
) -> Option<QcResultRecombinants> {
  if !config.enabled {
    return None;
  }

  let total_private_substitutions = private_nuc_mutations.total_private_substitutions;
  let total_reversion_substitutions = private_nuc_mutations.total_reversion_substitutions;
  let total_labeled_substitutions = private_nuc_mutations.total_labeled_substitutions;
  let total_unlabeled_substitutions = private_nuc_mutations.total_unlabeled_substitutions;

  let spatial_uniformity = config
    .spatial_uniformity
    .as_ref()
    .and_then(|su_config| strategy_spatial_uniformity(private_nuc_mutations, genome_length, su_config));

  let cluster_gaps = config
    .cluster_gaps
    .as_ref()
    .and_then(|cg_config| strategy_cluster_gaps(snp_clusters, cg_config));

  let reversion_clustering = config
    .reversion_clustering
    .as_ref()
    .and_then(|rc_config| strategy_reversion_clustering(private_nuc_mutations, rc_config));

  let label_switching = config
    .label_switching
    .as_ref()
    .and_then(|ls_config| strategy_label_switching(private_nuc_mutations, ls_config));

  let combined_score: f64 = [
    spatial_uniformity.as_ref().map(|r| r.score),
    cluster_gaps.as_ref().map(|r| r.score),
    reversion_clustering.as_ref().map(|r| r.score),
    label_switching.as_ref().map(|r| r.score),
  ]
  .into_iter()
  .flatten()
  .sum();
  let overall_score = combined_score * *config.score_weight;
  let status = QcStatus::from_score(overall_score);

  Some(QcResultRecombinants {
    score: overall_score,
    status,
    total_private_substitutions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
    spatial_uniformity,
    cluster_gaps,
    reversion_clustering,
    label_switching,
  })
}

fn strategy_spatial_uniformity(
  private_muts: &PrivateNucMutations,
  genome_length: usize,
  config: &QcRecombConfigSpatialUniformity,
) -> Option<RecombResultSpatialUniformity> {
  if !config.enabled {
    return None;
  }

  let positions = private_muts
    .private_substitutions
    .iter()
    .map(|s| s.pos.as_isize())
    .collect_vec();

  if positions.is_empty() {
    return Some(RecombResultSpatialUniformity {
      coefficient_of_variation: 0.0,
      num_segments: config.num_segments,
      segment_counts: vec![0; config.num_segments],
      score: 0.0,
    });
  }

  let segment_counts = segment_mutation_counts(&positions, genome_length, config.num_segments);
  let cv = compute_cv(&segment_counts);

  let score = if cv > *config.cv_threshold {
    (cv - *config.cv_threshold) * *config.weight
  } else {
    0.0
  };

  Some(RecombResultSpatialUniformity {
    coefficient_of_variation: cv,
    num_segments: config.num_segments,
    segment_counts,
    score,
  })
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
    .collect_vec();

  let max_gap = gaps.iter().copied().max().unwrap_or(0);

  let score = if max_gap >= config.min_gap_size {
    (clusters.len() as f64 - 1.0) * *config.weight
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

  let reversion_positions = private_muts
    .reversion_substitutions
    .iter()
    .map(|s| s.pos.as_isize())
    .collect_vec();

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

fn strategy_label_switching(
  private_muts: &PrivateNucMutations,
  config: &QcRecombConfigLabelSwitching,
) -> Option<RecombResultLabelSwitching> {
  if !config.enabled {
    return None;
  }

  if private_muts.labeled_substitutions.is_empty() {
    return Some(RecombResultLabelSwitching {
      num_labels: 0,
      label_segments: BTreeMap::new(),
      num_switches: 0,
      score: 0.0,
    });
  }

  let mut label_positions: BTreeMap<String, Vec<isize>> = BTreeMap::new();
  for labeled in &private_muts.labeled_substitutions {
    if let Some(first_label) = labeled.labels.first() {
      label_positions
        .entry(first_label.clone())
        .or_default()
        .push(labeled.substitution.pos.as_isize());
    }
  }

  if label_positions.len() < config.min_labels {
    return Some(RecombResultLabelSwitching {
      num_labels: label_positions.len(),
      label_segments: BTreeMap::new(),
      num_switches: 0,
      score: 0.0,
    });
  }

  let sorted_mutations = private_muts
    .labeled_substitutions
    .iter()
    .filter_map(|sub| sub.labels.first().map(|label| (sub.substitution.pos.as_isize(), label)))
    .sorted_by_key(|(pos, _)| *pos)
    .collect_vec();

  let num_switches = sorted_mutations
    .iter()
    .tuple_windows()
    .filter(|(a, b)| a.1 != b.1)
    .count();
  let score = num_switches as f64 * *config.weight;

  Some(RecombResultLabelSwitching {
    num_labels: label_positions.len(),
    label_segments: label_positions.into_iter().map(|(k, v)| (k, v.len())).collect(),
    num_switches,
    score,
  })
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::nuc_sub::{NucSub, NucSubLabeled};
  use crate::coord::position::NucRefGlobalPosition;
  use crate::qc::qc_rule_snp_clusters::ClusteredSnp;
  use ordered_float::OrderedFloat;

  fn assert_score(actual: f64, expected: f64) {
    assert!(
      (actual - expected).abs() < 1e-9,
      "expected score {expected}, got {actual}"
    );
  }

  fn make_sub(pos: isize) -> NucSub {
    NucSub {
      pos: NucRefGlobalPosition::from(pos),
      ref_nuc: Nuc::A,
      qry_nuc: Nuc::T,
    }
  }

  fn make_labeled_sub(pos: isize, labels: Vec<&str>) -> NucSubLabeled {
    NucSubLabeled {
      substitution: NucSub {
        pos: NucRefGlobalPosition::from(pos),
        ref_nuc: Nuc::A,
        qry_nuc: Nuc::T,
      },
      labels: labels.into_iter().map(ToOwned::to_owned).collect(),
    }
  }

  fn make_private_muts(positions: &[isize]) -> PrivateNucMutations {
    let subs = positions.iter().map(|&p| make_sub(p)).collect_vec();
    PrivateNucMutations {
      private_substitutions: subs.clone(),
      total_private_substitutions: subs.len(),
      unlabeled_substitutions: subs.clone(),
      total_unlabeled_substitutions: subs.len(),
      ..Default::default()
    }
  }

  fn make_su_config(
    enabled: bool,
    cv_threshold: f64,
    weight: f64,
    num_segments: usize,
  ) -> QcRecombConfigSpatialUniformity {
    QcRecombConfigSpatialUniformity {
      enabled,
      cv_threshold: OrderedFloat(cv_threshold),
      weight: OrderedFloat(weight),
      num_segments,
    }
  }

  fn make_rc_config(enabled: bool, ratio_threshold: f64, weight: f64) -> QcRecombConfigReversionClustering {
    QcRecombConfigReversionClustering {
      enabled,
      weight: OrderedFloat(weight),
      ratio_threshold: OrderedFloat(ratio_threshold),
      cluster_window_size: 500,
      min_cluster_size: 3,
    }
  }

  fn make_ls_config(enabled: bool, weight: f64, min_labels: usize) -> QcRecombConfigLabelSwitching {
    QcRecombConfigLabelSwitching {
      enabled,
      weight: OrderedFloat(weight),
      min_labels,
    }
  }

  fn make_cg_config(enabled: bool, min_gap_size: usize, weight: f64) -> QcRecombConfigClusterGaps {
    QcRecombConfigClusterGaps {
      enabled,
      min_gap_size,
      weight: OrderedFloat(weight),
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
        .collect_vec(),
    }
  }

  #[test]
  fn test_spatial_uniformity_disabled() {
    let private_muts = make_private_muts(&[100, 200, 300]);
    let config = make_su_config(false, 1.0, 50.0, 10);

    let result = strategy_spatial_uniformity(&private_muts, 1000, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_spatial_uniformity_uniform_distribution() {
    let private_muts = make_private_muts(&[50, 150, 250, 350, 450, 550, 650, 750, 850, 950]);
    let config = make_su_config(true, 1.5, 50.0, 10);

    let result = strategy_spatial_uniformity(&private_muts, 1000, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert!(result.coefficient_of_variation < 1.5);
    assert_score(result.score, 0.0);
  }

  #[test]
  fn test_spatial_uniformity_clustered_distribution() {
    let private_muts = make_private_muts(&[10, 20, 30, 40, 50]);
    let config = make_su_config(true, 1.0, 50.0, 10);

    let result = strategy_spatial_uniformity(&private_muts, 1000, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert!(result.coefficient_of_variation > 1.0);
    assert!(result.score > 0.0);
  }

  #[test]
  fn test_reversion_clustering_disabled() {
    let config = make_rc_config(false, 0.3, 50.0);
    let private_muts = PrivateNucMutations {
      total_private_substitutions: 10,
      reversion_substitutions: vec![make_sub(100)],
      total_reversion_substitutions: 1,
      ..Default::default()
    };
    let result = strategy_reversion_clustering(&private_muts, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_reversion_clustering_no_mutations() {
    let config = make_rc_config(true, 0.3, 50.0);
    let private_muts = PrivateNucMutations::default();
    let result = strategy_reversion_clustering(&private_muts, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_score(result.reversion_ratio, 0.0);
    assert_score(result.score, 0.0);
  }

  #[test]
  fn test_reversion_clustering_with_clusters() {
    let config = make_rc_config(true, 0.3, 50.0);
    let reversions = vec![make_sub(100), make_sub(120), make_sub(140), make_sub(160)];
    let private_muts = PrivateNucMutations {
      total_private_substitutions: 10,
      reversion_substitutions: reversions,
      total_reversion_substitutions: 4,
      ..Default::default()
    };

    let result = strategy_reversion_clustering(&private_muts, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_score(result.reversion_ratio, 0.4);
    assert_eq!(result.reversion_clusters.len(), 1);
    assert!(result.score > 0.0);
  }

  #[test]
  fn test_label_switching_disabled() {
    let private_muts = PrivateNucMutations {
      labeled_substitutions: vec![make_labeled_sub(100, vec!["Alpha"])],
      ..Default::default()
    };
    let config = make_ls_config(false, 50.0, 2);

    let result = strategy_label_switching(&private_muts, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_label_switching_empty_labeled() {
    let private_muts = PrivateNucMutations::default();
    let config = make_ls_config(true, 50.0, 2);

    let result = strategy_label_switching(&private_muts, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_labels, 0);
    assert_eq!(result.num_switches, 0);
    assert_score(result.score, 0.0);
  }

  #[test]
  fn test_label_switching_single_label_below_min() {
    let private_muts = PrivateNucMutations {
      labeled_substitutions: vec![
        make_labeled_sub(100, vec!["Alpha"]),
        make_labeled_sub(200, vec!["Alpha"]),
      ],
      ..Default::default()
    };
    let config = make_ls_config(true, 50.0, 2);

    let result = strategy_label_switching(&private_muts, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_labels, 1);
    assert_eq!(result.num_switches, 0);
    assert_score(result.score, 0.0);
    assert!(result.label_segments.is_empty());
  }

  #[test]
  fn test_label_switching_two_labels() {
    let private_muts = PrivateNucMutations {
      labeled_substitutions: vec![
        make_labeled_sub(100, vec!["Alpha"]),
        make_labeled_sub(200, vec!["Alpha"]),
        make_labeled_sub(1000, vec!["Beta"]),
        make_labeled_sub(1100, vec!["Beta"]),
      ],
      ..Default::default()
    };
    let config = make_ls_config(true, 50.0, 2);

    let result = strategy_label_switching(&private_muts, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_labels, 2);
    assert_eq!(result.num_switches, 1);
    assert_score(result.score, 50.0);
    assert_eq!(result.label_segments.get("Alpha"), Some(&2));
    assert_eq!(result.label_segments.get("Beta"), Some(&2));
  }

  #[test]
  fn test_label_switching_three_labels() {
    let private_muts = PrivateNucMutations {
      labeled_substitutions: vec![
        make_labeled_sub(100, vec!["Alpha"]),
        make_labeled_sub(500, vec!["Beta"]),
        make_labeled_sub(1000, vec!["Gamma"]),
      ],
      ..Default::default()
    };
    let config = make_ls_config(true, 25.0, 2);

    let result = strategy_label_switching(&private_muts, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_labels, 3);
    assert_eq!(result.num_switches, 2);
    assert_score(result.score, 50.0);
  }

  #[test]
  fn test_label_switching_interleaved() {
    let private_muts = PrivateNucMutations {
      labeled_substitutions: vec![
        make_labeled_sub(100, vec!["Alpha"]),
        make_labeled_sub(300, vec!["Beta"]),
        make_labeled_sub(500, vec!["Alpha"]),
        make_labeled_sub(700, vec!["Beta"]),
        make_labeled_sub(900, vec!["Alpha"]),
      ],
      ..Default::default()
    };
    let config = make_ls_config(true, 10.0, 2);

    let result = strategy_label_switching(&private_muts, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_labels, 2);
    assert_eq!(result.num_switches, 4);
    assert_score(result.score, 40.0);
    assert_eq!(result.label_segments.get("Alpha"), Some(&3));
    assert_eq!(result.label_segments.get("Beta"), Some(&2));
  }

  #[test]
  fn test_rule_disabled() {
    let private_muts = make_private_muts(&[100, 200, 300]);
    let config = QcRulesConfigRecombinants {
      enabled: false,
      ..Default::default()
    };

    let result = rule_recombinants(&private_muts, None, 1000, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_rule_combined_scores() {
    let reversions = vec![make_sub(100), make_sub(120), make_sub(140), make_sub(160)];
    let private_muts = PrivateNucMutations {
      private_substitutions: vec![make_sub(10), make_sub(20), make_sub(30), make_sub(40), make_sub(50)],
      total_private_substitutions: 10,
      reversion_substitutions: reversions,
      total_reversion_substitutions: 4,
      labeled_substitutions: vec![
        make_labeled_sub(100, vec!["Alpha"]),
        make_labeled_sub(1000, vec!["Beta"]),
      ],
      total_labeled_substitutions: 2,
      unlabeled_substitutions: vec![make_sub(500)],
      total_unlabeled_substitutions: 1,
      ..Default::default()
    };

    let config = QcRulesConfigRecombinants {
      enabled: true,
      score_weight: OrderedFloat(1.0),
      spatial_uniformity: Some(make_su_config(true, 1.0, 50.0, 10)),
      cluster_gaps: None,
      reversion_clustering: Some(make_rc_config(true, 0.3, 50.0)),
      label_switching: Some(make_ls_config(true, 50.0, 2)),
    };

    let result = rule_recombinants(&private_muts, None, 1000, &config);
    assert!(result.is_some());
    let result = result.unwrap();

    assert!(result.spatial_uniformity.is_some());
    assert!(result.reversion_clustering.is_some());
    assert!(result.label_switching.is_some());
  }

  #[test]
  fn test_cluster_gaps_disabled() {
    let config = make_cg_config(false, 1000, 1.0);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (5000, 5100, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_cluster_gaps_no_snp_clusters() {
    let config = make_cg_config(true, 1000, 1.0);
    let result = strategy_cluster_gaps(None, &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_clusters, 0);
    assert_eq!(result.max_gap, 0);
    assert!(result.gaps.is_empty());
    assert_score(result.score, 0.0);
  }

  #[test]
  fn test_cluster_gaps_single_cluster() {
    let config = make_cg_config(true, 1000, 1.0);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_clusters, 1);
    assert_eq!(result.max_gap, 0);
    assert!(result.gaps.is_empty());
    assert_score(result.score, 0.0);
  }

  #[test]
  fn test_cluster_gaps_two_clusters_gap_below_threshold() {
    let config = make_cg_config(true, 1000, 1.0);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (500, 600, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_clusters, 2);
    assert_eq!(result.max_gap, 300);
    assert_eq!(result.gaps, vec![300]);
    assert_score(result.score, 0.0);
  }

  #[test]
  fn test_cluster_gaps_two_clusters_gap_above_threshold() {
    let config = make_cg_config(true, 1000, 1.0);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (5000, 5100, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_clusters, 2);
    assert_eq!(result.max_gap, 4800);
    assert_eq!(result.gaps, vec![4800]);
    // 1 gap * 1.0 weight = 1.0
    assert_score(result.score, 1.0);
  }

  #[test]
  fn test_cluster_gaps_three_clusters() {
    let config = make_cg_config(true, 1000, 1.0);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (5000, 5100, 4), (10000, 10100, 3)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_clusters, 3);
    assert_eq!(result.max_gap, 4900);
    assert_eq!(result.gaps, vec![4800, 4900]);
    // 2 gaps * 1.0 weight = 2.0
    assert_score(result.score, 2.0);
  }

  #[test]
  fn test_cluster_gaps_exactly_at_threshold() {
    let config = make_cg_config(true, 1000, 1.0);
    let snp_clusters = make_snp_clusters(vec![(0, 100, 5), (1100, 1200, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_clusters, 2);
    assert_eq!(result.max_gap, 1000);
    // 1 gap * 1.0 weight = 1.0
    assert_score(result.score, 1.0);
  }

  #[test]
  fn test_cluster_gaps_weight_applied() {
    let config = make_cg_config(true, 1000, 2.0);
    let snp_clusters = make_snp_clusters(vec![(100, 200, 5), (5000, 5100, 4)]);
    let result = strategy_cluster_gaps(Some(&snp_clusters), &config);
    assert!(result.is_some());
    let result = result.unwrap();
    // 1 gap * 2.0 weight = 2.0
    assert_score(result.score, 2.0);
  }
}
