#[cfg(test)]
mod tests {
  use crate::analyze::__tests__::test_mutation_patterns::tests::helpers::{
    analyze, config, event_positions, motif_sites,
  };
  use generators::{MotifCase, gen_motif_case, gen_positions};
  use itertools::Itertools;
  use proptest::prelude::*;
  use proptest::test_runner::RngSeed;
  use serde_json::json;
  use std::collections::BTreeSet;

  const REF_LEN: usize = 600;

  proptest! {
    #![proptest_config(ProptestConfig {
      rng_seed: RngSeed::Fixed(0),
      failure_persistence: None,
      ..ProptestConfig::default()
    })]

    #[test]
    fn test_prop_mutation_patterns_clusters_preserves_invariants(
      positions in gen_positions(),
      window_size in 1_usize..150,
      cutoff in 0_usize..8,
    ) {
      let ref_seq = "A".repeat(REF_LEN);
      let qry_seq = ref_seq
        .char_indices()
        .map(|(pos, nuc)| if positions.contains(&pos) { 'G' } else { nuc })
        .collect::<String>();
      let config = config(&json!([{ "id": "all", "name": "All", "cluster": { "windowSize": window_size, "cutoff": cutoff } }])).unwrap();
      let results = analyze(&ref_seq, &qry_seq, Some(&config)).unwrap();
      let result = &results.results[0];
      let clusters = result.clusters.iter().map(|cluster| event_positions(&cluster.events)).collect_vec();

      let clustered = clusters.iter().flatten().collect::<BTreeSet<_>>();
      prop_assert_eq!(positions.len(), result.counts.matches);
      prop_assert_eq!(clustered.len(), result.counts.clustered);
      prop_assert_eq!(result.clusters.len(), result.counts.clusters);
      prop_assert_eq!(
        result.clusters.iter().map(|cluster| (cluster.start, cluster.end, cluster.count)).collect_vec(),
        clusters.iter().map(|events| (events[0], events[events.len() - 1], events.len())).collect_vec()
      );
      prop_assert!(clusters.iter().all(|events| events.len() > cutoff));
      prop_assert!(clusters.iter().flat_map(|events| events.iter().tuple_windows()).all(|(a, b)| a < b && b - a <= window_size));
    }

    #[test]
    fn test_prop_mutation_patterns_motif_sites_matches_oracle(case in gen_motif_case()) {
      let MotifCase { ref_seq, qry_seq, motif, pos, expected_site } = case;
      let config = config(&json!([{
        "id": "p", "name": "P",
        "events": [{ "type": "nucSubstitution", "ref": ["N"], "qry": ["N"], "motifs": [motif] }]
      }])).unwrap();
      let results = analyze(&ref_seq, &qry_seq, Some(&config)).unwrap();
      let result = &results.results[0];

      let expected_matches = expected_site.iter().map(|_| pos).collect_vec();
      prop_assert_eq!(expected_matches, event_positions(&result.matches));
      prop_assert_eq!(expected_site.into_iter().collect_vec(), motif_sites(result).into_iter().flatten().collect_vec());
    }
  }

  mod generators {
    use super::REF_LEN;
    use itertools::Itertools;
    use proptest::prelude::*;

    /// Sorted, unique substitution positions
    pub fn gen_positions() -> impl Strategy<Value = Vec<usize>> {
      prop::collection::btree_set(0..REF_LEN, 0..80).prop_map(|positions| positions.into_iter().collect_vec())
    }

    /// Fixed-length motif, a sequence with one substitution, and the expected motif site with its group at the
    /// substituted position
    #[derive(Clone, Debug)]
    pub struct MotifCase {
      pub ref_seq: String,
      pub qry_seq: String,
      pub motif: String,
      pub pos: usize,
      pub expected_site: Option<(usize, usize)>,
    }

    /// IUPAC nucleotide codes and their bases (IUPAC-IUB 1985 nomenclature), written out independently of the code under
    /// test
    const IUPAC: [(char, &str); 15] = [
      ('A', "A"),
      ('C', "C"),
      ('G', "G"),
      ('T', "T"),
      ('R', "AG"),
      ('Y', "CT"),
      ('S', "CG"),
      ('W', "AT"),
      ('K', "GT"),
      ('M', "AC"),
      ('B', "CGT"),
      ('D', "AGT"),
      ('H', "ACT"),
      ('V', "ACG"),
      ('N', "ACGT"),
    ];

    fn bases(code: char) -> &'static str {
      IUPAC.iter().find(|(c, _)| *c == code).map(|(_, bases)| *bases).unwrap()
    }

    /// Motif position: a non-empty set of bases, written as its IUPAC code, as a bracketed list of bases, or in lower case
    fn gen_motif_position() -> impl Strategy<Value = (String, String)> {
      (prop::sample::select(IUPAC.to_vec()), 0_usize..3).prop_map(|((code, bases), style)| {
        let text = match style {
          0 => code.to_string(),
          1 => format!("[{bases}]"),
          _ => code.to_ascii_lowercase().to_string(),
        };
        (text, bases.to_owned())
      })
    }

    /// Mostly unambiguous sequence letters, with some ambiguous codes
    fn gen_seq() -> impl Strategy<Value = String> {
      prop::collection::vec(
        prop::sample::select("ACGTACGTACGTACGTRYSWKMBDHVN".chars().collect_vec()),
        1..40,
      )
      .prop_map(|letters| letters.into_iter().collect())
    }

    pub fn gen_motif_case() -> impl Strategy<Value = MotifCase> {
      (
        gen_seq(),
        prop::collection::vec(gen_motif_position(), 1..5),
        any::<prop::sample::Index>(),
        any::<prop::sample::Index>(),
      )
        .prop_map(|(ref_seq, motif_positions, group, pos)| {
          let group = group.index(motif_positions.len());
          let pos = pos.index(ref_seq.len());
          let motif = motif_positions
            .iter()
            .enumerate()
            .map(|(i, (text, _))| if i == group { format!("({text})") } else { text.clone() })
            .join("");

          // Oracle: the only site with the group at `pos` starts at `pos - group`, and matches when every sequence
          // letter stands only for bases allowed at its motif position
          let ref_letters = ref_seq.chars().collect_vec();
          let expected_site = pos.checked_sub(group).and_then(|start| {
            let end = start + motif_positions.len();
            let matches = end <= ref_letters.len()
              && motif_positions
                .iter()
                .zip(&ref_letters[start..end])
                .all(|((_, allowed), letter)| bases(*letter).chars().all(|base| allowed.contains(base)));
            matches.then_some((start, end))
          });

          let qry_nuc = if ref_letters[pos] == 'A' { 'C' } else { 'A' };
          let qry_seq = ref_letters
            .iter()
            .enumerate()
            .map(|(i, &letter)| if i == pos { qry_nuc } else { letter })
            .collect();

          MotifCase {
            ref_seq,
            qry_seq,
            motif,
            pos,
            expected_site,
          }
        })
    }
  }
}
