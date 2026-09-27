#[cfg(test)]
mod tests {
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::__tests__::test_mutation_patterns::tests::helpers::{
    analyze, config, event_positions, motif_sites, private_muts, qc,
  };
  use crate::analyze::mutation_patterns::{MutationPatterns, analyze_mutation_patterns};
  use crate::analyze::nuc_sub::NucSub;
  use crate::coord::position::NucRefGlobalPosition;
  use generators::{gen_positions, snp_clusters_released};
  use itertools::Itertools;
  use proptest::prelude::*;
  use regex::Regex;
  use serde_json::json;
  use std::collections::BTreeSet;

  const REF_LEN: usize = 600;

  proptest! {
    #[test]
    fn test_prop_mutation_patterns_qc_clusters_matches_released_rule(
      positions in gen_positions(),
      window_size in 0_usize..150,
      cluster_cut_off in 0_usize..8,
    ) {
      let ref_seq = vec![Nuc::A; REF_LEN];
      let patterns = MutationPatterns::new(None, &ref_seq).unwrap();
      let qc = qc(window_size, cluster_cut_off);
      let analysis = analyze_mutation_patterns(&private_muts(subs_at(&positions)), &ref_seq, &patterns, Some(&qc));
      let actual = analysis.qc_clusters.iter().map(|c| (c.start, c.end, c.number_of_snps)).collect_vec();
      prop_assert_eq!(snp_clusters_released(&positions, window_size, cluster_cut_off), actual);
    }

    #[test]
    fn test_prop_mutation_patterns_clusters_preserves_invariants(
      positions in gen_positions(),
      window_size in 1_usize..150,
      cutoff in 0_usize..8,
    ) {
      let ref_seq = vec![Nuc::A; REF_LEN];
      let config = config(&json!([{ "id": "all", "name": "All", "cluster": { "windowSize": window_size, "cutoff": cutoff } }])).unwrap();
      let patterns = MutationPatterns::new(Some(&config), &ref_seq).unwrap();
      let analysis = analyze_mutation_patterns(&private_muts(subs_at(&positions)), &ref_seq, &patterns, None);
      let result = &analysis.results.results[0];

      let clustered = result.clusters.iter().flat_map(|cluster| event_positions(&cluster.events)).collect::<BTreeSet<_>>();
      prop_assert_eq!(positions.len(), result.counts.matches);
      prop_assert_eq!(clustered.len(), result.counts.clustered);
      prop_assert_eq!(result.clusters.len(), result.counts.clusters);
      for cluster in &result.clusters {
        let cluster_positions = event_positions(&cluster.events);
        prop_assert_eq!(cluster.count, cluster_positions.len());
        prop_assert_eq!(Some(&cluster.start), cluster_positions.first());
        prop_assert_eq!(Some(&cluster.end), cluster_positions.last());
        prop_assert!(cluster_positions.iter().tuple_windows().all(|(a, b)| a < b));
      }
    }

    #[test]
    fn test_prop_mutation_patterns_motif_sites_matches_brute_force(
      ref_seq in "[ACGT]{1,60}",
      motif in prop::sample::select(vec!["TC[AT]", "[CT]G[ACT]", "A+", "(AC)+", "GA|GAT", "C.?G"]),
      pos in any::<prop::sample::Index>(),
    ) {
      let pos = pos.index(ref_seq.len());
      let qry_nuc = if ref_seq.as_bytes()[pos] == b'A' { "C" } else { "A" };
      let mut qry_seq = ref_seq.clone();
      qry_seq.replace_range(pos..=pos, qry_nuc);
      let config = config(&json!([{
        "id": "p", "name": "P",
        "events": [{ "type": "nucSubstitution", "ref": ["N"], "qry": ["N"], "motifs": [motif] }]
      }])).unwrap();
      let analysis = analyze(&ref_seq, &qry_seq, Some(&config), None).unwrap();

      // Oracle: leftmost-first match anchored at each start position, found with the `regex` crate on the suffix
      let anchored = Regex::new(&format!("^(?:{motif})")).unwrap();
      let expected = (0..ref_seq.len())
        .filter_map(|start| ref_seq.get(start..).and_then(|suffix| anchored.find(suffix)).map(|m| (start, start + m.end())))
        .filter(|&(start, end)| start < end && start <= pos && pos < end)
        .collect_vec();

      let result = &analysis.results.results[0];
      prop_assert_eq!(usize::from(!expected.is_empty()), result.counts.matches);
      prop_assert_eq!(expected, motif_sites(result).into_iter().flatten().collect_vec());
    }
  }

  /// A>G substitutions at the given positions of a poly-A reference
  fn subs_at(positions: &[usize]) -> Vec<NucSub> {
    positions
      .iter()
      .map(|&pos| NucSub {
        pos: NucRefGlobalPosition::from(pos),
        ref_nuc: Nuc::A,
        qry_nuc: Nuc::G,
      })
      .collect_vec()
  }

  mod generators {
    use super::REF_LEN;
    use itertools::Itertools;
    use proptest::prelude::*;
    use std::collections::VecDeque;

    /// Sorted, unique substitution positions
    pub fn gen_positions() -> impl Strategy<Value = Vec<usize>> {
      prop::collection::btree_set(0..REF_LEN, 0..80).prop_map(|positions| positions.into_iter().collect_vec())
    }

    /// Oracle for QC parity: `find_snp_clusters` and `process_snp_clusters` of the `qc.snpClusters` rule as released in
    /// Nextclade 3.23.0 (`packages/nextclade/src/qc/qc_rule_snp_clusters.rs`), unchanged except for the input and
    /// output types. Returns `(start, end, number_of_snps)` per cluster.
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
