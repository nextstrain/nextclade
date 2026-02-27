use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PositionCluster {
  pub start: usize,
  pub end: usize,
  pub count: usize,
}

pub fn find_position_clusters(
  positions: &[isize],
  window_size: usize,
  min_cluster_size: usize,
) -> Vec<PositionCluster> {
  if positions.len() < min_cluster_size {
    return vec![];
  }

  let mut sorted_positions: Vec<isize> = positions.to_vec();
  sorted_positions.sort_unstable();

  let mut clusters = Vec::new();
  let mut cluster_start = 0_usize;

  for i in 1..sorted_positions.len() {
    let gap = (sorted_positions[i] - sorted_positions[i - 1]).unsigned_abs();
    if gap > window_size {
      let cluster_len = i - cluster_start;
      if cluster_len >= min_cluster_size {
        clusters.push(PositionCluster {
          start: sorted_positions[cluster_start] as usize,
          end: sorted_positions[i - 1] as usize,
          count: cluster_len,
        });
      }
      cluster_start = i;
    }
  }

  let cluster_len = sorted_positions.len() - cluster_start;
  if cluster_len >= min_cluster_size {
    clusters.push(PositionCluster {
      start: sorted_positions[cluster_start] as usize,
      end: sorted_positions[sorted_positions.len() - 1] as usize,
      count: cluster_len,
    });
  }

  clusters
}

pub fn segment_mutation_counts(positions: &[isize], genome_length: usize, num_segments: usize) -> Vec<usize> {
  if num_segments == 0 || genome_length == 0 {
    return vec![];
  }

  let segment_size = genome_length / num_segments;
  if segment_size == 0 {
    return vec![0; num_segments];
  }

  let mut counts = vec![0_usize; num_segments];

  for &pos in positions {
    if pos < 0 {
      continue;
    }
    let pos = pos as usize;
    if pos >= genome_length {
      continue;
    }
    let segment_idx = (pos / segment_size).min(num_segments - 1);
    counts[segment_idx] += 1;
  }

  counts
}

pub fn compute_cv(counts: &[usize]) -> f64 {
  if counts.is_empty() {
    return 0.0;
  }

  let n = counts.len() as f64;
  let sum: usize = counts.iter().sum();
  let mean = sum as f64 / n;

  if mean == 0.0 {
    return 0.0;
  }

  let variance: f64 = counts.iter().map(|&c| (c as f64 - mean).powi(2)).sum::<f64>() / n;

  let std_dev = variance.sqrt();
  std_dev / mean
}

#[cfg(test)]
mod tests {
  use super::*;

  #[test]
  fn test_find_position_clusters_empty() {
    let positions: Vec<isize> = vec![];
    let clusters = find_position_clusters(&positions, 100, 3);
    assert!(clusters.is_empty());
  }

  #[test]
  fn test_find_position_clusters_single_cluster() {
    let positions: Vec<isize> = vec![100, 120, 140, 160];
    let clusters = find_position_clusters(&positions, 50, 3);
    assert_eq!(clusters.len(), 1);
    assert_eq!(clusters[0].start, 100);
    assert_eq!(clusters[0].end, 160);
    assert_eq!(clusters[0].count, 4);
  }

  #[test]
  fn test_find_position_clusters_two_clusters() {
    let positions: Vec<isize> = vec![100, 120, 140, 1000, 1020, 1040];
    let clusters = find_position_clusters(&positions, 50, 3);
    assert_eq!(clusters.len(), 2);
    assert_eq!(clusters[0].start, 100);
    assert_eq!(clusters[0].end, 140);
    assert_eq!(clusters[1].start, 1000);
    assert_eq!(clusters[1].end, 1040);
  }

  #[test]
  fn test_find_position_clusters_min_size() {
    let positions: Vec<isize> = vec![100, 120, 1000, 1020, 1040];
    let clusters = find_position_clusters(&positions, 50, 3);
    assert_eq!(clusters.len(), 1);
    assert_eq!(clusters[0].start, 1000);
  }

  #[test]
  fn test_segment_mutation_counts_basic() {
    let positions: Vec<isize> = vec![50, 150, 250, 350, 450];
    let counts = segment_mutation_counts(&positions, 500, 5);
    assert_eq!(counts, vec![1, 1, 1, 1, 1]);
  }

  #[test]
  fn test_segment_mutation_counts_clustered() {
    let positions: Vec<isize> = vec![10, 20, 30, 40, 450];
    let counts = segment_mutation_counts(&positions, 500, 5);
    assert_eq!(counts, vec![4, 0, 0, 0, 1]);
  }

  #[test]
  fn test_compute_cv_uniform() {
    let counts = vec![10, 10, 10, 10, 10];
    let cv = compute_cv(&counts);
    assert!((cv - 0.0).abs() < 1e-10);
  }

  #[test]
  fn test_compute_cv_non_uniform() {
    let counts = vec![0, 0, 0, 0, 10];
    let cv = compute_cv(&counts);
    assert!(cv > 1.5);
  }

  #[test]
  fn test_compute_cv_empty() {
    let counts: Vec<usize> = vec![];
    let cv = compute_cv(&counts);
    assert!((cv - 0.0).abs() < 1e-10);
  }
}
