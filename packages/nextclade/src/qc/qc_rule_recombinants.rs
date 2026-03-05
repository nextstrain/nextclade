use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::coord::position::PositionLike;
use crate::qc::qc_config::{QcRecombConfigSpatialUniformity, QcRulesConfigRecombinants};
use crate::qc::qc_recomb_utils::{compute_cv, segment_mutation_counts};
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
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

fn strategy_spatial_uniformity(
  private_muts: &PrivateNucMutations,
  genome_length: usize,
  config: &QcRecombConfigSpatialUniformity,
) -> Option<RecombResultSpatialUniformity> {
  if !config.enabled {
    return None;
  }

  let positions: Vec<isize> = private_muts
    .private_substitutions
    .iter()
    .map(|s| s.pos.as_isize())
    .collect();

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

pub fn rule_recombinants(
  private_nuc_mutations: &PrivateNucMutations,
  _snp_clusters: Option<&QcResultSnpClusters>,
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

  let wt_config = config.get_weighted_threshold_config();

  let weighted_count = *wt_config.weight_unlabeled * total_unlabeled_substitutions as f64
    + *wt_config.weight_labeled * total_labeled_substitutions as f64
    + *wt_config.weight_reversion * total_reversion_substitutions as f64;

  let threshold = wt_config.threshold;
  let excess = (weighted_count - threshold as f64).max(0.0);

  let wt_score = if weighted_count > threshold as f64 {
    clamp_min(excess * *wt_config.weight / threshold as f64, 0.0)
  } else {
    0.0
  };

  let weighted_threshold = wt_config.enabled.then_some(RecombResultWeightedThreshold {
    weighted_count,
    threshold,
    excess,
    score: wt_score,
  });

  let spatial_uniformity = config
    .spatial_uniformity
    .as_ref()
    .and_then(|su_config| strategy_spatial_uniformity(private_nuc_mutations, genome_length, su_config));

  let su_score = spatial_uniformity.as_ref().map_or(0.0, |su| su.score);

  let combined_score = if wt_config.enabled { wt_score } else { 0.0 } + su_score;
  let overall_score = combined_score * *config.score_weight;
  let status = QcStatus::from_score(overall_score);

  Some(QcResultRecombinants {
    score: overall_score,
    status,
    total_private_substitutions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
    weighted_threshold,
    spatial_uniformity,
  })
}

#[cfg(test)]
#[allow(clippy::float_cmp)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::nuc_sub::NucSub;
  use crate::coord::position::NucRefGlobalPosition;
  use ordered_float::OrderedFloat;

  fn make_sub(pos: isize) -> NucSub {
    NucSub {
      pos: NucRefGlobalPosition::from(pos),
      ref_nuc: Nuc::A,
      qry_nuc: Nuc::T,
    }
  }

  fn make_private_muts(positions: &[isize]) -> PrivateNucMutations {
    let subs: Vec<NucSub> = positions.iter().map(|&p| make_sub(p)).collect();
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

  #[test]
  fn test_spatial_uniformity_disabled() {
    let private_muts = make_private_muts(&[100, 200, 300]);
    let config = make_su_config(false, 1.0, 50.0, 10);

    let result = strategy_spatial_uniformity(&private_muts, 1000, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_spatial_uniformity_empty_mutations() {
    let private_muts = make_private_muts(&[]);
    let config = make_su_config(true, 1.0, 50.0, 5);

    let result = strategy_spatial_uniformity(&private_muts, 1000, &config);
    assert!(result.is_some());

    let result = result.unwrap();
    assert_eq!(result.coefficient_of_variation, 0.0);
    assert_eq!(result.num_segments, 5);
    assert_eq!(result.segment_counts, vec![0, 0, 0, 0, 0]);
    assert_eq!(result.score, 0.0);
  }

  #[test]
  fn test_spatial_uniformity_uniform_distribution() {
    let private_muts = make_private_muts(&[50, 150, 250, 350, 450]);
    let config = make_su_config(true, 1.0, 50.0, 5);

    let result = strategy_spatial_uniformity(&private_muts, 500, &config);
    assert!(result.is_some());

    let result = result.unwrap();
    assert_eq!(result.segment_counts, vec![1, 1, 1, 1, 1]);
    assert!(result.coefficient_of_variation < 0.01);
    assert_eq!(result.score, 0.0);
  }

  #[test]
  fn test_spatial_uniformity_clustered_distribution() {
    let private_muts = make_private_muts(&[10, 20, 30, 40, 50]);
    let config = make_su_config(true, 1.0, 50.0, 5);

    let result = strategy_spatial_uniformity(&private_muts, 500, &config);
    assert!(result.is_some());

    let result = result.unwrap();
    assert_eq!(result.segment_counts, vec![5, 0, 0, 0, 0]);
    assert!(result.coefficient_of_variation > 1.5);
    assert!(result.score > 0.0);
  }

  #[test]
  fn test_spatial_uniformity_score_calculation() {
    let private_muts = make_private_muts(&[10, 20, 30, 40, 50]);
    let cv_threshold = 1.0;
    let weight = 50.0;
    let config = make_su_config(true, cv_threshold, weight, 5);

    let result = strategy_spatial_uniformity(&private_muts, 500, &config);
    assert!(result.is_some());

    let result = result.unwrap();
    let expected_score = (result.coefficient_of_variation - cv_threshold) * weight;
    assert!((result.score - expected_score).abs() < 1e-10);
  }

  #[test]
  fn test_spatial_uniformity_below_threshold() {
    let private_muts = make_private_muts(&[50, 150, 250, 350, 450]);
    let config = make_su_config(true, 0.5, 50.0, 5);

    let result = strategy_spatial_uniformity(&private_muts, 500, &config);
    assert!(result.is_some());

    let result = result.unwrap();
    assert_eq!(result.score, 0.0);
  }
}
