use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::find_relative_nuc_mutations::RelativeNucMutations;
use crate::coord::position::PositionLike;
use crate::qc::qc_config::{QcRecombConfigMultiAncestor, QcRulesConfigRecombinants};
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
pub struct RecombResultMultiAncestor {
  pub num_ancestor_switches: usize,
  pub best_ancestor_per_segment: Vec<usize>,
  pub ancestor_names: Vec<String>,
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
  pub multi_ancestor: Option<RecombResultMultiAncestor>,
}

impl QcRule for QcResultRecombinants {
  fn score(&self) -> f64 {
    self.score
  }
}

fn strategy_multi_ancestor(
  relative_nuc_mutations: &[RelativeNucMutations],
  genome_length: usize,
  config: &QcRecombConfigMultiAncestor,
) -> Option<RecombResultMultiAncestor> {
  if !config.enabled || relative_nuc_mutations.is_empty() || genome_length == 0 || config.num_segments == 0 {
    return None;
  }

  let segment_size = genome_length / config.num_segments;
  if segment_size == 0 {
    return None;
  }

  let mut ancestor_names = Vec::new();
  let mut mutation_counts_per_ancestor: Vec<Vec<usize>> = Vec::new();

  for (ancestor_idx, rel_muts) in relative_nuc_mutations.iter().enumerate() {
    let name = rel_muts
      .result
      .as_ref()
      .map_or_else(|| format!("ancestor_{ancestor_idx}"), |r| r.r#match.node_name.clone());
    ancestor_names.push(name);

    let mut segment_counts = vec![0_usize; config.num_segments];

    if let Some(result) = &rel_muts.result {
      for sub in &result.muts.private_substitutions {
        let pos = sub.pos.as_usize();
        let segment_idx = (pos / segment_size).min(config.num_segments - 1);
        segment_counts[segment_idx] += 1;
      }
    }

    mutation_counts_per_ancestor.push(segment_counts);
  }

  if ancestor_names.is_empty() {
    return None;
  }

  let mut best_ancestor_per_segment = Vec::with_capacity(config.num_segments);
  for seg_idx in 0..config.num_segments {
    let best_ancestor = mutation_counts_per_ancestor
      .iter()
      .enumerate()
      .min_by_key(|(_, counts)| counts[seg_idx])
      .map_or(0, |(idx, _)| idx);
    best_ancestor_per_segment.push(best_ancestor);
  }

  let mut num_ancestor_switches = 0;
  for i in 1..best_ancestor_per_segment.len() {
    if best_ancestor_per_segment[i] != best_ancestor_per_segment[i - 1] {
      num_ancestor_switches += 1;
    }
  }

  let score = if num_ancestor_switches >= config.min_switches {
    (num_ancestor_switches - config.min_switches + 1) as f64 * *config.weight
  } else {
    0.0
  };

  Some(RecombResultMultiAncestor {
    num_ancestor_switches,
    best_ancestor_per_segment,
    ancestor_names,
    score,
  })
}

pub fn rule_recombinants(
  private_nuc_mutations: &PrivateNucMutations,
  _snp_clusters: Option<&QcResultSnpClusters>,
  relative_nuc_mutations: Option<&[RelativeNucMutations]>,
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

  let multi_ancestor = config.multi_ancestor.as_ref().and_then(|ma_config| {
    let rel_muts = relative_nuc_mutations?;
    strategy_multi_ancestor(rel_muts, genome_length, ma_config)
  });

  let ma_strategy_score = multi_ancestor.as_ref().map_or(0.0, |ma| ma.score);

  let overall_score =
    (if wt_config.enabled { wt_strategy_score } else { 0.0 } + ma_strategy_score) * *config.score_weight;
  let status = QcStatus::from_score(overall_score);

  Some(QcResultRecombinants {
    score: overall_score,
    status,
    total_private_substitutions,
    total_reversion_substitutions,
    total_labeled_substitutions,
    total_unlabeled_substitutions,
    weighted_threshold,
    multi_ancestor,
  })
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::find_relative_nuc_mutations::RelativeNucMutationsResult;
  use crate::analyze::nuc_sub::NucSub;
  use crate::coord::position::NucRefGlobalPosition;
  use crate::graph::node::GraphNodeKey;
  use crate::o;
  use crate::tree::tree::{AuspiceRefNodeSearchCriteria, AuspiceRefNodeSearchDesc};
  use crate::tree::tree_find_ancestors_of_interest::{AncestralSearchMatch, AncestralSearchResult};
  use ordered_float::OrderedFloat;

  fn make_nuc_sub(pos: usize) -> NucSub {
    NucSub {
      pos: NucRefGlobalPosition::from(pos),
      ref_nuc: Nuc::A,
      qry_nuc: Nuc::T,
    }
  }

  fn make_private_mutations(positions: &[usize]) -> PrivateNucMutations {
    let private_substitutions: Vec<NucSub> = positions.iter().map(|&p| make_nuc_sub(p)).collect();
    PrivateNucMutations {
      private_substitutions,
      ..Default::default()
    }
  }

  fn make_search_desc() -> AuspiceRefNodeSearchDesc {
    AuspiceRefNodeSearchDesc {
      name: o!("test"),
      display_name: None,
      description: None,
      criteria: vec![],
      other: serde_json::Value::Null,
    }
  }

  fn make_search_criteria() -> AuspiceRefNodeSearchCriteria {
    AuspiceRefNodeSearchCriteria {
      qry: vec![],
      node: vec![],
      other: serde_json::Value::Null,
    }
  }

  fn make_relative_nuc_mutations(name: &str, positions: &[usize]) -> RelativeNucMutations {
    let muts = make_private_mutations(positions);
    RelativeNucMutations {
      search: AncestralSearchResult {
        search: make_search_desc(),
        result: None,
      },
      result: Some(RelativeNucMutationsResult {
        criterion: make_search_criteria(),
        r#match: AncestralSearchMatch {
          node_key: GraphNodeKey::new(0),
          node_name: name.to_owned(),
          name: Some(name.to_owned()),
          clade: None,
          clade_like_attrs: None,
        },
        muts,
      }),
    }
  }

  fn make_config(enabled: bool, num_segments: usize, min_switches: usize) -> QcRecombConfigMultiAncestor {
    QcRecombConfigMultiAncestor {
      enabled,
      weight: OrderedFloat(50.0),
      num_segments,
      min_switches,
    }
  }

  #[test]
  fn test_multi_ancestor_disabled() {
    let rel_muts = vec![make_relative_nuc_mutations("anc1", &[100, 200])];
    let config = make_config(false, 10, 2);
    let result = strategy_multi_ancestor(&rel_muts, 1000, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_multi_ancestor_empty_mutations() {
    let rel_muts: Vec<RelativeNucMutations> = vec![];
    let config = make_config(true, 10, 2);
    let result = strategy_multi_ancestor(&rel_muts, 1000, &config);
    assert!(result.is_none());
  }

  #[test]
  fn test_multi_ancestor_zero_genome_length() {
    let rel_muts = vec![make_relative_nuc_mutations("anc1", &[100, 200])];
    let config = make_config(true, 10, 2);
    let result = strategy_multi_ancestor(&rel_muts, 0, &config);
    assert!(result.is_none());
  }

  #[test]
  #[allow(clippy::float_cmp)]
  fn test_multi_ancestor_single_ancestor_no_switches() {
    let rel_muts = vec![make_relative_nuc_mutations("anc1", &[100, 200, 300, 400, 500])];
    let config = make_config(true, 5, 2);
    let result = strategy_multi_ancestor(&rel_muts, 1000, &config);

    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.num_ancestor_switches, 0);
    assert_eq!(result.best_ancestor_per_segment, vec![0, 0, 0, 0, 0]);
    assert_eq!(result.ancestor_names, vec!["anc1"]);
    assert_eq!(result.score, 0.0);
  }

  #[test]
  fn test_multi_ancestor_two_ancestors_with_switches() {
    let rel_muts = vec![
      make_relative_nuc_mutations("anc1", &[100, 200, 600, 700, 800]),
      make_relative_nuc_mutations("anc2", &[600, 700, 100, 200, 300]),
    ];
    let config = make_config(true, 5, 2);
    let result = strategy_multi_ancestor(&rel_muts, 1000, &config);

    assert!(result.is_some());
    let result = result.unwrap();
    assert_eq!(result.ancestor_names, vec!["anc1", "anc2"]);
    assert!(result.num_ancestor_switches >= 1);
  }

  #[test]
  fn test_multi_ancestor_clear_recombination_pattern() {
    let rel_muts = vec![
      make_relative_nuc_mutations("anc1", &[0, 50, 500, 550, 600, 650]),
      make_relative_nuc_mutations("anc2", &[300, 350, 400, 450]),
    ];
    let config = make_config(true, 10, 1);
    let result = strategy_multi_ancestor(&rel_muts, 1000, &config);

    assert!(result.is_some());
    let result = result.unwrap();
    assert!(result.num_ancestor_switches >= 1);
    assert!(result.score > 0.0);
  }

  #[test]
  #[allow(clippy::float_cmp)]
  fn test_multi_ancestor_score_calculation() {
    let rel_muts = vec![
      make_relative_nuc_mutations("anc1", &[0, 50, 500, 550]),
      make_relative_nuc_mutations("anc2", &[200, 250, 300, 350]),
    ];
    let config = make_config(true, 4, 1);
    let result = strategy_multi_ancestor(&rel_muts, 1000, &config);

    assert!(result.is_some());
    let result = result.unwrap();

    let expected_score = if result.num_ancestor_switches >= 1 {
      (result.num_ancestor_switches - 1 + 1) as f64 * 50.0
    } else {
      0.0
    };
    assert_eq!(result.score, expected_score);
  }

  #[test]
  #[allow(clippy::float_cmp)]
  fn test_multi_ancestor_min_switches_threshold() {
    let rel_muts = vec![
      make_relative_nuc_mutations("anc1", &[0, 50]),
      make_relative_nuc_mutations("anc2", &[900, 950]),
    ];
    let config = make_config(true, 2, 5);
    let result = strategy_multi_ancestor(&rel_muts, 1000, &config);

    assert!(result.is_some());
    let result = result.unwrap();
    if result.num_ancestor_switches < 5 {
      assert_eq!(result.score, 0.0);
    }
  }
}
