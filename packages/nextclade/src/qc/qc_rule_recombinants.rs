use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::coord::position::PositionLike;
use crate::qc::qc_config::{QcRecombConfigLabelSwitching, QcRulesConfigRecombinants};
use crate::qc::qc_rule_snp_clusters::QcResultSnpClusters;
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

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
  pub weighted_threshold: Option<RecombResultWeightedThreshold>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub label_switching: Option<RecombResultLabelSwitching>,
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

fn strategy_label_switching(
  private_muts: &PrivateNucMutations,
  config: &QcRecombConfigLabelSwitching,
) -> Option<RecombResultLabelSwitching> {
  if !config.enabled || private_muts.labeled_substitutions.is_empty() {
    return None;
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

  let mut label_centroids: Vec<(String, f64)> = label_positions
    .iter()
    .map(|(label, positions)| {
      let centroid = positions.iter().sum::<isize>() as f64 / positions.len() as f64;
      (label.clone(), centroid)
    })
    .collect();

  label_centroids.sort_by(|a, b| a.1.partial_cmp(&b.1).unwrap_or(std::cmp::Ordering::Equal));

  let num_switches = label_centroids.len().saturating_sub(1);
  let score = num_switches as f64 * *config.weight;

  Some(RecombResultLabelSwitching {
    num_labels: label_positions.len(),
    label_segments: label_positions.into_iter().map(|(k, v)| (k, v.len())).collect(),
    num_switches,
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

  let label_switching = config
    .label_switching
    .as_ref()
    .and_then(|ls_config| strategy_label_switching(private_nuc_mutations, ls_config));

  let ls_strategy_score = label_switching.as_ref().map_or(0.0, |ls| ls.score);

  let overall_score = (wt_strategy_score + ls_strategy_score) * *config.score_weight;
  let status = QcStatus::from_score(overall_score);

  Some(QcResultRecombinants {
    score: overall_score,
    status,
    total_private_substitutions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
    weighted_threshold,
    label_switching,
  })
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::nuc_sub::{NucSub, NucSubLabeled};
  use crate::coord::position::NucRefGlobalPosition;
  use ordered_float::OrderedFloat;

  fn assert_score(actual: f64, expected: f64) {
    assert!(
      (actual - expected).abs() < 1e-9,
      "expected score {expected}, got {actual}"
    );
  }

  fn make_labeled_sub(pos: isize, labels: Vec<&str>) -> NucSubLabeled {
    NucSubLabeled {
      substitution: NucSub {
        pos: NucRefGlobalPosition::from(pos),
        ref_nuc: Nuc::A,
        qry_nuc: Nuc::T,
      },
      labels: labels.into_iter().map(String::from).collect(),
    }
  }

  fn make_config(enabled: bool, weight: f64, min_labels: usize) -> QcRecombConfigLabelSwitching {
    QcRecombConfigLabelSwitching {
      enabled,
      weight: OrderedFloat(weight),
      min_labels,
    }
  }

  #[test]
  fn test_label_switching_disabled() {
    let private_muts = PrivateNucMutations {
      labeled_substitutions: vec![make_labeled_sub(100, vec!["Alpha"])],
      ..Default::default()
    };
    let config = make_config(false, 50.0, 2);

    let result = strategy_label_switching(&private_muts, &config);

    assert!(result.is_none());
  }

  #[test]
  fn test_label_switching_empty_labeled() {
    let private_muts = PrivateNucMutations::default();
    let config = make_config(true, 50.0, 2);

    let result = strategy_label_switching(&private_muts, &config);

    assert!(result.is_none());
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
    let config = make_config(true, 50.0, 2);

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
    let config = make_config(true, 50.0, 2);

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
    let config = make_config(true, 25.0, 2);

    let result = strategy_label_switching(&private_muts, &config);

    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_labels, 3);
    assert_eq!(result.num_switches, 2);
    assert_score(result.score, 50.0);
  }

  #[test]
  fn test_label_switching_uses_first_label() {
    let private_muts = PrivateNucMutations {
      labeled_substitutions: vec![
        make_labeled_sub(100, vec!["Alpha", "Extra"]),
        make_labeled_sub(1000, vec!["Beta", "Another"]),
      ],
      ..Default::default()
    };
    let config = make_config(true, 50.0, 2);

    let result = strategy_label_switching(&private_muts, &config);

    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_labels, 2);
    assert!(result.label_segments.contains_key("Alpha"));
    assert!(result.label_segments.contains_key("Beta"));
    assert!(!result.label_segments.contains_key("Extra"));
    assert!(!result.label_segments.contains_key("Another"));
  }
}
