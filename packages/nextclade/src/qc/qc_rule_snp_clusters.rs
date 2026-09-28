use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::sliding_window_clusters::find_clusters;
use crate::coord::position::PositionLike;
use crate::qc::qc_config::QcRulesConfigSnpClusters;
use crate::qc::qc_run::{QcRule, QcStatus};
use itertools::Itertools;
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

/// A cluster of private nucleotide substitutions within a genomic window.
///
/// Clusters indicate localized quality problems, such as contamination or sequencing artifacts
/// in a narrow region of the genome.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
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

  let clustered_snps = find_clusters(
    &private_nuc_mutations.private_substitutions,
    |sub| sub.pos.as_usize(),
    config.window_size,
    config.cluster_cut_off,
  )
  .into_iter()
  .map(|cluster| ClusteredSnp {
    start: cluster[0].pos.as_usize(),
    end: cluster[cluster.len() - 1].pos.as_usize(),
    number_of_snps: cluster.len(),
  })
  .collect_vec();

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
mod tests {
  use super::*;
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::nuc_sub::NucSub;
  use crate::coord::position::NucRefGlobalPosition;
  use approx::assert_ulps_eq;
  use generators::{gen_positions, snp_clusters_released};
  use ordered_float::OrderedFloat;
  use pretty_assertions::assert_eq;
  use proptest::prelude::*;
  use proptest::test_runner::RngSeed;
  use rstest::rstest;

  #[test]
  fn test_rule_snp_clusters_disabled() {
    let mut config = config(10, 2);
    config.enabled = false;
    let result = rule_snp_clusters(&private_muts(&[100, 105, 109]), &config);
    assert!(result.is_none());
  }

  // Window 10, cutoff 2, score weight 50. Expected clusters follow the released rule by hand: a window with more than 2
  // substitutions is a cluster, and the next substitution extends it while windows stay over the cutoff
  #[rustfmt::skip]
  #[rstest]
  #[case::no_substitutions(&[],                                  (vec![],                                (0,  0.0)))]
  #[case::sparse(          &[100, 200, 300],                     (vec![],                                (0,  0.0)))]
  #[case::one_cluster(     &[100, 105, 109],                     (vec![(100, 109, 3)],                   (3,  50.0)))]
  #[case::two_clusters(    &[100, 105, 109, 500, 503, 506, 509], (vec![(100, 109, 3), (500, 509, 4)],    (7, 100.0)))]
  #[trace]
  fn test_rule_snp_clusters(
    #[case] positions: &[usize],
    #[case] (expected_clusters, (expected_total_snps, expected_score)): (Vec<ClusterRange>, (usize, f64)),
  ) {
    let result = rule_snp_clusters(&private_muts(positions), &config(10, 2)).expect("rule is enabled");
    assert_eq!(expected_clusters, cluster_ranges(&result));
    assert_eq!(expected_total_snps, result.total_snps);
    assert_ulps_eq!(expected_score, result.score);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::good(    &[100, 200],                          QcStatus::Good)]
  #[case::mediocre(&[100, 105, 109],                     QcStatus::Mediocre)]
  #[case::bad(     &[100, 105, 109, 500, 503, 506, 509], QcStatus::Bad)]
  #[trace]
  fn test_rule_snp_clusters_status(#[case] positions: &[usize], #[case] expected: QcStatus) {
    let result = rule_snp_clusters(&private_muts(positions), &config(10, 2)).expect("rule is enabled");
    assert_eq!(expected.to_string(), result.status.to_string());
  }

  // Substitutions at 4 and 12 are 8 apart, beyond window 5. A window with more than `clusterCutOff` substitutions is a
  // cluster, so cutoff 0 flags every substitution
  #[rustfmt::skip]
  #[rstest]
  #[case::cutoff_zero_flags_every_substitution(0, vec![(4, 4, 1), (12, 12, 1)])]
  #[case::cutoff_one_needs_two_in_window(      1, vec![])]
  #[trace]
  fn test_rule_snp_clusters_cutoff(#[case] cluster_cut_off: usize, #[case] expected: Vec<ClusterRange>) {
    let result = rule_snp_clusters(&private_muts(&[4, 12]), &config(5, cluster_cut_off)).expect("rule is enabled");
    assert_eq!(expected, cluster_ranges(&result));
  }

  #[test]
  fn test_rule_snp_clusters_largest_window_size() {
    let result = rule_snp_clusters(&private_muts(&[0, 4, 8]), &config(usize::MAX, 2)).expect("rule is enabled");
    assert_eq!(vec![(0, 8, 3)], cluster_ranges(&result));
  }

  proptest! {
    #![proptest_config(ProptestConfig {
      rng_seed: RngSeed::Fixed(0),
      failure_persistence: None,
      ..ProptestConfig::default()
    })]

    #[test]
    fn test_prop_rule_snp_clusters_matches_released_rule(
      positions in gen_positions(),
      window_size in 0_usize..150,
      cluster_cut_off in 0_usize..8,
    ) {
      let result = rule_snp_clusters(&private_muts(&positions), &config(window_size, cluster_cut_off)).expect("rule is enabled");
      prop_assert_eq!(snp_clusters_released(&positions, window_size, cluster_cut_off), cluster_ranges(&result));
    }
  }

  fn config(window_size: usize, cluster_cut_off: usize) -> QcRulesConfigSnpClusters {
    QcRulesConfigSnpClusters {
      enabled: true,
      window_size,
      cluster_cut_off,
      score_weight: OrderedFloat(50.0),
    }
  }

  /// A>G substitutions at the given sorted positions
  fn private_muts(positions: &[usize]) -> PrivateNucMutations {
    let private_substitutions = positions
      .iter()
      .map(|&pos| NucSub {
        pos: NucRefGlobalPosition::from(pos),
        ref_nuc: Nuc::A,
        qry_nuc: Nuc::G,
      })
      .collect_vec();
    PrivateNucMutations {
      total_private_substitutions: private_substitutions.len(),
      private_substitutions,
      ..PrivateNucMutations::default()
    }
  }

  /// Cluster `(start, end, number_of_snps)`
  type ClusterRange = (usize, usize, usize);

  fn cluster_ranges(result: &QcResultSnpClusters) -> Vec<ClusterRange> {
    result
      .clustered_snps
      .iter()
      .map(|cluster| (cluster.start, cluster.end, cluster.number_of_snps))
      .collect_vec()
  }

  mod generators {
    use itertools::Itertools;
    use proptest::prelude::*;
    use std::collections::VecDeque;

    /// Sorted, unique substitution positions
    pub fn gen_positions() -> impl Strategy<Value = Vec<usize>> {
      prop::collection::btree_set(0_usize..600, 0..80).prop_map(|positions| positions.into_iter().collect_vec())
    }

    /// Oracle for QC parity: `find_snp_clusters` and `process_snp_clusters` of the `qc.snpClusters` rule as released in
    /// Nextclade 3.23.0 (`packages/nextclade/src/qc/qc_rule_snp_clusters.rs`), unchanged except for the input and
    /// output types. Returns `(start, end, number_of_snps)` per cluster.
    ///
    /// This copy is frozen: change it only to track a behavior change of a released version of the rule, never to
    /// follow the current implementation.
    pub fn snp_clusters_released(
      positions: &[usize],
      window_size: usize,
      cluster_cut_off: usize,
    ) -> Vec<(usize, usize, usize)> {
      let mut current_cluster = VecDeque::<isize>::new();
      let mut all_clusters = Vec::<Vec<isize>>::new();
      let mut previous_pos: isize = -1;
      for &pos in positions {
        let pos = pos as isize;
        current_cluster.push_back(pos);

        while current_cluster[0] < (pos - window_size as isize) {
          current_cluster.pop_front();
        }

        if current_cluster.len() > cluster_cut_off {
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
        .into_iter()
        .map(|mut cluster| {
          cluster.sort_unstable();
          (cluster[0] as usize, cluster[cluster.len() - 1] as usize, cluster.len())
        })
        .collect_vec()
    }
  }
}
