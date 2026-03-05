use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::PositionLike;
use crate::qc::qc_config::QcRulesConfigSnpClusters;
use crate::qc::qc_run::{QcRule, QcStatus};
use itertools::Itertools;
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};
use std::collections::VecDeque;

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
  private_nuc_mutations: &PrivateNucMutations,
  config: &QcRulesConfigSnpClusters,
) -> Option<QcResultSnpClusters> {
  if !config.enabled {
    return None;
  }

  let mut snp_clusters = find_snp_clusters(&private_nuc_mutations.private_substitutions, config);
  for cluster in &mut snp_clusters {
    cluster.sort_unstable();
  }

  let total_clusters = snp_clusters.len();

  let clustered_snps = process_snp_clusters(snp_clusters);
  let total_snps = clustered_snps.iter().map(|cluster| cluster.number_of_snps).sum();

  let score = clamp_min(total_clusters as f64 * *config.score_weight, 0.0);
  let status = QcStatus::from_score(score);

  Some(QcResultSnpClusters {
    score,
    status,
    total_snps,
    clustered_snps,
  })
}

fn find_snp_clusters(private_nuc_mutations: &[NucSub], config: &QcRulesConfigSnpClusters) -> Vec<Vec<isize>> {
  let mut current_cluster = VecDeque::<isize>::new();
  let mut all_clusters = Vec::<Vec<isize>>::new();
  let mut previous_pos: isize = -1;
  for mutation in private_nuc_mutations {
    let pos = mutation.pos.as_isize();
    current_cluster.push_back(pos);

    while current_cluster[0] < (pos - config.window_size as isize) {
      current_cluster.pop_front();
    }

    if current_cluster.len() > config.cluster_cut_off {
      let n_clusters = all_clusters.len();

      if !all_clusters.is_empty() && current_cluster.len() > 1 {
        let i = n_clusters - 1;
        let j = all_clusters[i].len() - 1;
        let p = all_clusters[i][j];

        if p == previous_pos {
          all_clusters[i].push(pos);
        } else {
          all_clusters.push(current_cluster.iter().copied().collect_vec());
        }
      } else {
        all_clusters.push(current_cluster.iter().copied().collect_vec());
      }
    }
    previous_pos = pos;
  }

  all_clusters
}

fn process_snp_clusters(snp_clusters: Vec<Vec<isize>>) -> Vec<ClusteredSnp> {
  let mut result = Vec::with_capacity(snp_clusters.len());
  for cluster in snp_clusters {
    result.push(ClusteredSnp {
      start: cluster[0] as usize,
      end: cluster[cluster.len() - 1] as usize,
      number_of_snps: cluster.len(),
    });
  }
  result
}
