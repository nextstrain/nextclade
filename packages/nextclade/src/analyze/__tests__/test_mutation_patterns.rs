#[cfg(test)]
pub mod tests {
  use crate::alphabet::nuc::Nuc;
  use crate::analyze::mutation_patterns::MutationPatterns;
  use crate::analyze::virus_properties::MutationPatternsConfig;
  use crate::assert_error;
  use crate::io::json::{JsonPretty, json_parse, json_stringify};
  use crate::qc::qc_rule_snp_clusters::ClusteredSnp;
  use eyre::Report;
  use helpers::{ClusterRange, analyze, cluster_ranges, config, matched_positions, motif_sites, qc, type_count};
  use indoc::indoc;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use serde_json::{Value, json};

  #[test]
  fn test_mutation_patterns_nothing_configured() -> Result<(), Report> {
    let analysis = analyze("ACGTACGTAC", "ACGTGCGTAC", None, None)?;
    assert!(analysis.results.is_empty());
    assert!(analysis.qc_clusters.is_empty());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_no_pattern_output_when_only_qc_configured() -> Result<(), Report> {
    #[rustfmt::skip]
    //             0         1         2
    //             0123456789012345678901234
    let ref_seq = "ACGTACGTACGTACGTACGTACGTA";
    //             ||||.||.||.||||||||||||||
    let qry_seq = "ACGTGCGCACCTACGTACGTACGTA";
    //                 *  *  *
    //
    //  Match:  |  identical  .  substitution
    //  *  private substitution, all 3 within one window of 10
    let analysis = analyze(ref_seq, qry_seq, None, Some(&qc(10, 2)))?;
    assert!(analysis.results.is_empty());
    // 3 substitutions in positions 4..=10 exceed cutoff 2
    let expected = vec![ClusteredSnp {
      start: 4,
      end: 10,
      number_of_snps: 3,
    }];
    assert_eq!(expected, analysis.qc_clusters);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_qc_disabled() -> Result<(), Report> {
    let mut qc_config = qc(10, 2);
    qc_config.enabled = false;
    let analysis = analyze("ACGTACGTACGTA", "ACGTGCGCACCTA", None, Some(&qc_config))?;
    assert!(analysis.qc_clusters.is_empty());
    Ok(())
  }

  // Expected values follow the released `qc.snpClusters` rule: a window with more than `clusterCutOff` substitutions
  // is a cluster, so cutoff 0 flags every substitution
  #[rustfmt::skip]
  #[rstest]
  #[case::cutoff_zero_flags_every_substitution(0, vec![(4, 4, 1), (12, 12, 1)])]
  #[case::cutoff_one_needs_two_in_window(      1, vec![])]
  #[trace]
  fn test_mutation_patterns_qc_cutoff(
    #[case] cluster_cut_off: usize,
    #[case] expected: Vec<ClusterRange>,
  ) -> Result<(), Report> {
    //             0         1
    //             0123456789012345
    let ref_seq = "ACGTACGTACGTACGT";
    //             ||||.|||||||.|||
    let qry_seq = "ACGTGCGTACGTGCGT";
    //                 *       *
    //
    //  Match:  |  identical  .  substitution
    //  *  private substitution; the two are 8 apart, beyond window 5
    let analysis = analyze(ref_seq, qry_seq, None, Some(&qc(5, cluster_cut_off)))?;
    let actual = analysis.qc_clusters.iter().map(|c| (c.start, c.end, c.number_of_snps)).collect::<Vec<_>>();
    assert_eq!(expected, actual);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_qc_counts_pattern_matches_and_non_matches() -> Result<(), Report> {
    // Patterns are reported only: QC clusters use all private substitutions
    let config = config(&json!([{
      "id": "tc", "name": "T>C",
      "events": [{ "type": "nucSubstitution", "ref": ["T"], "qry": ["C"] }],
      "cluster": { "windowSize": 100, "cutoff": 1 }
    }]))?;
    // A>G at 0, 4, 8: none match T>C
    let analysis = analyze("ACGTACGTACGTA", "GCGTGCGTGCGTA", Some(&config), Some(&qc(100, 2)))?;
    assert_eq!(0, analysis.results.results[0].counts.matches);
    let expected = vec![ClusteredSnp {
      start: 0,
      end: 8,
      number_of_snps: 3,
    }];
    assert_eq!(expected, analysis.qc_clusters);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_event_type_counts() -> Result<(), Report> {
    #[rustfmt::skip]
    //             0         1
    //             012345678901
    let ref_seq = "ACGTACGTACGT";
    //             .||.|||.|.||
    let qry_seq = "GCGCACGCATGT";
    //             a  t   t c
    //
    //  Match:  |  identical  .  substitution
    //  a  A>G   t  T>C   c  C>T
    let config = config(&json!([{ "id": "all", "name": "All" }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    let result = &analysis.results.results[0];
    // Counted from the fixture; sorted by `Nuc` order, in which T precedes A and C
    let expected = vec![
      type_count(Nuc::T, Nuc::C, 2),
      type_count(Nuc::A, Nuc::G, 1),
      type_count(Nuc::C, Nuc::T, 1),
    ];
    assert_eq!(expected, result.event_type_counts);
    assert_eq!(4, result.counts.matches);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_type_filter() -> Result<(), Report> {
    #[rustfmt::skip]
    //             0         1
    //             0123456789012345
    let ref_seq = "ACGTACGTACGTACGT";
    //             .||..||.|||.||||
    let qry_seq = "GCGCGCGCACGCACGT";
    //             *  +*  +   +
    //
    //  Match:  |  identical  .  substitution
    //  *  A>G, not selected   +  T>C, selected
    let config = config(&json!([{
      "id": "tc", "name": "T>C",
      "events": [{ "type": "nucSubstitution", "ref": ["T"], "qry": ["C"] }]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    let result = &analysis.results.results[0];
    assert_eq!(vec![3, 7, 11], matched_positions(result));
    assert_eq!(vec![type_count(Nuc::T, Nuc::C, 3)], result.event_type_counts);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_events_select_one_type_each() -> Result<(), Report> {
    #[rustfmt::skip]
    //             01234567
    let ref_seq = "AAAATTTT";
    //             ..||..||
    let qry_seq = "GCAACGTT";
    //             +*  +*
    //
    //  Match:  |  identical  .  substitution
    //  +  A>G or T>C, selected   *  A>C or T>G, not selected
    let config = config(&json!([{
      "id": "adar", "name": "ADAR",
      "events": [
        { "type": "nucSubstitution", "ref": ["A"], "qry": ["G"] },
        { "type": "nucSubstitution", "ref": ["T"], "qry": ["C"] }
      ]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    assert_eq!(vec![0, 4], matched_positions(&analysis.results.results[0]));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_event_lists_combine_independently() -> Result<(), Report> {
    // Same fixture as above, one event with both lists: A>C and T>G also match
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["A", "T"], "qry": ["G", "C"] }]
    }]))?;
    let analysis = analyze("AAAATTTT", "GCAACGTT", Some(&config), None)?;
    assert_eq!(vec![0, 1, 4, 5], matched_positions(&analysis.results.results[0]));
    Ok(())
  }

  // IUPAC codes match when their base sets overlap
  #[rustfmt::skip]
  #[rstest]
  #[case::ambiguous_filter_matches_member(  ("R", "N"), ("A", "G"), 1)]
  #[case::ambiguous_filter_rejects_other(   ("R", "N"), ("C", "G"), 0)]
  #[case::exact_filter(                     ("A", "G"), ("A", "G"), 1)]
  #[case::exact_filter_rejects_other_qry(   ("A", "G"), ("A", "T"), 0)]
  #[case::exact_filter_matches_ambiguous_qry(("A", "G"), ("A", "R"), 1)]
  #[trace]
  fn test_mutation_patterns_iupac_filters(
    #[case] (filter_ref, filter_qry): (&str, &str),
    #[case] (ref_seq, qry_seq): (&str, &str),
    #[case] expected_matches: usize,
  ) -> Result<(), Report> {
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": [filter_ref], "qry": [filter_qry] }]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    assert_eq!(expected_matches, analysis.results.results[0].counts.matches);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_filter() -> Result<(), Report> {
    #[rustfmt::skip]
    //             0         1         2
    //             0123456789012345678901234
    let ref_seq = "ATCAGGACGTTCTAGGTCAGGACGT";
    //             ||.||||||||.|||||.|||||||
    let qry_seq = "ATTAGGACGTTTTAGGTTAGGACGT";
    //              ###       ###   ###
    //               *          *     *
    //
    //  Match:  |  identical  .  substitution
    //  #  site of motif TC[AT]   *  C>T substitution
    let config = config(&json!([{
      "id": "apobec", "name": "APOBEC-like",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["TC[AT]"] }]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    let result = &analysis.results.results[0];
    assert_eq!(vec![2, 11, 17], matched_positions(result));
    assert_eq!(vec![vec![(1, 4)], vec![(10, 13)], vec![(16, 19)]], motif_sites(result));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_rejects_other_context() -> Result<(), Report> {
    #[rustfmt::skip]
    //             0         1
    //             0123456789012
    let ref_seq = "ATCAGGACCGTTC";
    //             ||||||||.||||
    let qry_seq = "ATCAGGACTGTTC";
    //              ###     *
    //
    //  Match:  |  identical  .  substitution
    //  #  only site of motif TC[AT]   *  C>T substitution outside of it
    let config = config(&json!([{
      "id": "apobec", "name": "APOBEC-like",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["TC[AT]"] }]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    assert_eq!(0, analysis.results.results[0].counts.matches);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_sites_overlap() -> Result<(), Report> {
    #[rustfmt::skip]
    //             01234
    let ref_seq = "TGCGA";
    //             |||.|
    let qry_seq = "TGCAA";
    //             ###
    //               ###
    //                *
    //
    //  Match:  |  identical  .  substitution
    //  #  sites of motif [CT]G[ACT]; the second site overlaps the first
    //  *  G>A substitution, inside the second site only
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["G"], "qry": ["A"], "motifs": ["[CT]G[ACT]"] }]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    let result = &analysis.results.results[0];
    assert_eq!(vec![3], matched_positions(result));
    assert_eq!(vec![vec![(2, 5)]], motif_sites(result));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_sites_overlap_in_repeat() -> Result<(), Report> {
    #[rustfmt::skip]
    //             0123456789
    let ref_seq = "ACACAAAAAA";
    //             |.|.||||||
    let qry_seq = "ATATAAAAAA";
    //             ###
    //               ###
    //              * *
    //
    //  Match:  |  identical  .  substitution
    //  #  sites of motif [ACGT]C[ACGT]   *  C>T substitution
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["[ACGT]C[ACGT]"] }]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    let result = &analysis.results.results[0];
    assert_eq!(vec![1, 3], matched_positions(result));
    assert_eq!(vec![vec![(0, 3)], vec![(2, 5)]], motif_sites(result));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_variable_length() -> Result<(), Report> {
    #[rustfmt::skip]
    //             01234567
    let ref_seq = "GGTTCAGG";
    //             ||||.|||
    let qry_seq = "GGTTTAGG";
    //               ###
    //                ##
    //                 *
    //
    //  Match:  |  identical  .  substitution
    //  #  sites of motif T+C, one per start position   *  C>T substitution
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T+C"] }]
    }]))?;
    let analysis = analyze(ref_seq, qry_seq, Some(&config), None)?;
    assert_eq!(vec![vec![(2, 5), (3, 5)]], motif_sites(&analysis.results.results[0]));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_motif_iupac_letter_is_literal() -> Result<(), Report> {
    // `W` in a motif is the letter W, which does not occur in the reference: `TC[AT]` is the working form
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["TCW"] }]
    }]))?;
    let analysis = analyze("GTCAG", "GTTAG", Some(&config), None)?;
    assert_eq!(0, analysis.results.results[0].counts.matches);
    Ok(())
  }

  // A>G at 0, 4, 8 within window 10: a cluster needs more than `cutoff` events
  #[rustfmt::skip]
  #[rstest]
  #[case::cutoff_not_exceeded(3, ((0, 0), vec![]))]
  #[case::cutoff_exceeded(    2, ((1, 3), vec![(0, 8, 3)]))]
  #[case::cutoff_zero(        0, ((1, 3), vec![(0, 8, 3)]))]
  #[trace]
  fn test_mutation_patterns_cluster_cutoff(
    #[case] cutoff: usize,
    #[case] ((expected_clusters, expected_clustered), expected_ranges): ((usize, usize), Vec<ClusterRange>),
  ) -> Result<(), Report> {
    let config = config(&json!([{ "id": "all", "name": "All", "cluster": { "windowSize": 10, "cutoff": cutoff } }]))?;
    let analysis = analyze("ACGTACGTACGTA", "GCGTGCGTGCGTA", Some(&config), None)?;
    let result = &analysis.results.results[0];
    assert_eq!(expected_clusters, result.counts.clusters);
    assert_eq!(expected_clustered, result.counts.clustered);
    assert_eq!(expected_ranges, cluster_ranges(result));
    Ok(())
  }

  // A>G at 0 and 8 are 8 nucleotides apart: the window includes both ends
  #[rustfmt::skip]
  #[rstest]
  #[case::events_window_size_apart(8, 1)]
  #[case::events_beyond_window(    7, 0)]
  #[trace]
  fn test_mutation_patterns_cluster_window_is_inclusive(
    #[case] window_size: usize,
    #[case] expected_clusters: usize,
  ) -> Result<(), Report> {
    let config = config(&json!([{ "id": "all", "name": "All", "cluster": { "windowSize": window_size, "cutoff": 1 } }]))?;
    let analysis = analyze("ACGTACGTACGT", "GCGTACGTGCGT", Some(&config), None)?;
    assert_eq!(expected_clusters, analysis.results.results[0].counts.clusters);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_clustered_counts_shared_events_once() -> Result<(), Report> {
    let ref_seq = "A".repeat(120);
    let qry_seq = ref_seq
      .char_indices()
      .map(|(pos, nuc)| if [0, 10, 20, 115, 118].contains(&pos) { 'G' } else { nuc })
      .collect::<String>();
    let config = config(&json!([{ "id": "all", "name": "All", "cluster": { "windowSize": 100, "cutoff": 2 } }]))?;
    let analysis = analyze(&ref_seq, &qry_seq, Some(&config), None)?;
    let result = &analysis.results.results[0];
    // Window 100, cutoff 2: {0, 10, 20} forms at 20. At 118 the window is {20, 115, 118}, and the previous event 115 is
    // not in the last cluster, so a new cluster starts with the whole window and shares position 20
    assert_eq!(vec![(0, 20, 3), (20, 118, 3)], cluster_ranges(result));
    assert_eq!(5, result.counts.clustered);
    assert_eq!(5, result.counts.matches);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_no_clusters_without_cluster_config() -> Result<(), Report> {
    let config = config(&json!([{ "id": "all", "name": "All" }]))?;
    let analysis = analyze("ACGTACGTACGTA", "GCGTGCGTGCGTA", Some(&config), None)?;
    let result = &analysis.results.results[0];
    assert_eq!(3, result.counts.matches);
    assert!(result.clusters.is_empty());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_multiple_patterns_in_config_order() -> Result<(), Report> {
    let config = config(&json!([
      { "id": "tc", "name": "T>C", "events": [{ "type": "nucSubstitution", "ref": ["T"], "qry": ["C"] }] },
      { "id": "ag", "name": "A>G", "events": [{ "type": "nucSubstitution", "ref": ["A"], "qry": ["G"] }] }
    ]))?;
    // A>G at 0, T>C at 3
    let analysis = analyze("ACGTACGT", "GCGCACGT", Some(&config), None)?;
    let results = &analysis.results.results;
    assert_eq!(
      vec!["tc", "ag"],
      results.iter().map(|r| r.id.as_str()).collect::<Vec<_>>()
    );
    assert_eq!(vec![3], matched_positions(&results[0]));
    assert_eq!(vec![0], matched_positions(&results[1]));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_output_json() -> Result<(), Report> {
    let config = config(&json!([{
      "id": "tc", "name": "T>C",
      "events": [{ "type": "nucSubstitution", "ref": ["T"], "qry": ["C"] }],
      "cluster": { "windowSize": 10, "cutoff": 1 }
    }]))?;
    // T>C at 3 and at the last position 7, where the downstream context is a gap
    let analysis = analyze("ACGTACGT", "ACGCACGC", Some(&config), None)?;
    let actual = json_parse::<Value>(&json_stringify(&analysis.results, JsonPretty(false))?)?;
    let events = json!([
      { "type": "nucSubstitution", "pos": 3, "refNuc": "T", "qryNuc": "C", "refContext": ["G", "T", "A"], "motifMatches": [] },
      { "type": "nucSubstitution", "pos": 7, "refNuc": "T", "qryNuc": "C", "refContext": ["G", "T", "-"], "motifMatches": [] }
    ]);
    let type_counts = json!([{ "type": "nucSubstitution", "refNuc": "T", "qryNuc": "C", "count": 2 }]);
    let expected = json!({
      "results": [{
        "id": "tc",
        "name": "T>C",
        "matches": events,
        "eventTypeCounts": type_counts,
        "clusters": [{ "start": 3, "end": 7, "count": 2, "events": events, "eventTypeCounts": type_counts }],
        "counts": { "matches": 2, "clustered": 2, "clusters": 1 }
      }]
    });
    assert_eq!(expected, actual);
    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::duplicate_id(
    json!([{ "id": "a", "name": "A" }, { "id": "a", "name": "B" }]),
    "Mutation pattern id 'a' is used more than once",
  )]
  #[case::empty_id(
    json!([{ "id": "", "name": "A" }]),
    "When preparing mutation pattern '': Mutation pattern id cannot be empty",
  )]
  #[case::quote_in_id(
    json!([{ "id": "a'b", "name": "A" }]),
    "When preparing mutation pattern 'a'b': Mutation pattern id 'a'b' contains the character ''', which is not allowed",
  )]
  #[case::empty_ref(
    json!([{ "id": "a", "name": "A", "events": [{ "type": "nucSubstitution", "ref": [], "qry": ["G"] }] }]),
    "When preparing mutation pattern 'a': Mutation pattern event `ref` must list at least one nucleotide",
  )]
  #[case::empty_qry(
    json!([{ "id": "a", "name": "A", "events": [{ "type": "nucSubstitution", "ref": ["A"], "qry": [] }] }]),
    "When preparing mutation pattern 'a': Mutation pattern event `qry` must list at least one nucleotide",
  )]
  #[case::empty_motif(
    json!([{ "id": "a", "name": "A", "events": [{ "type": "nucSubstitution", "ref": ["A"], "qry": ["G"], "motifs": [""] }] }]),
    "When preparing mutation pattern 'a': Mutation pattern motif cannot be empty",
  )]
  #[case::zero_window(
    json!([{ "id": "a", "name": "A", "cluster": { "windowSize": 0, "cutoff": 1 } }]),
    "When preparing mutation pattern 'a': Mutation pattern cluster `windowSize` must be at least 1",
  )]
  #[trace]
  fn test_mutation_patterns_invalid_config(#[case] patterns: Value, #[case] expected: &str) -> Result<(), Report> {
    let config = config(&patterns)?;
    assert_error!(MutationPatterns::new(Some(&config), &[]), expected);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_invalid_motif_regex() -> Result<(), Report> {
    let config = config(&json!([{
      "id": "a", "name": "A",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["TC("] }]
    }]))?;
    // The message after the context is produced by the `regex-automata` parser
    let expected = indoc! {r#"
      When preparing mutation pattern 'a': When compiling mutation pattern motif 'TC(': error parsing pattern 0: regex parse error:
          TC(
            ^
      error: unclosed group"#};
    assert_error!(MutationPatterns::new(Some(&config), &[]), expected);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_schema_example_is_valid() -> Result<(), Report> {
    let patterns = MutationPatterns::new(Some(&MutationPatternsConfig::example()), &[])?;
    assert!(!patterns.is_empty());
    Ok(())
  }

  pub mod helpers {
    use crate::alphabet::nuc::{Nuc, to_nuc_seq};
    use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
    use crate::analyze::mutation_patterns::{
      MutationPatternAnalysis, MutationPatternEventMatch, MutationPatternEventTypeCount,
      MutationPatternNucSubstitutionTypeCount, MutationPatternResults, MutationPatterns, analyze_mutation_patterns,
    };
    use crate::analyze::nuc_sub::NucSub;
    use crate::analyze::virus_properties::MutationPatternsConfig;
    use crate::coord::position::{NucRefGlobalPosition, PositionLike};
    use crate::io::json::json_parse;
    use crate::qc::qc_config::QcRulesConfigSnpClusters;
    use eyre::Report;
    use itertools::{Itertools, izip};
    use ordered_float::OrderedFloat;
    use serde_json::{Value, json};

    /// Cluster `(start, end, count)`
    pub type ClusterRange = (usize, usize, usize);

    pub fn config(patterns: &Value) -> Result<MutationPatternsConfig, Report> {
      json_parse(json!({ "patterns": patterns }).to_string())
    }

    pub const fn qc(window_size: usize, cluster_cut_off: usize) -> QcRulesConfigSnpClusters {
      QcRulesConfigSnpClusters {
        enabled: true,
        window_size,
        cluster_cut_off,
        score_weight: OrderedFloat(50.0),
      }
    }

    /// Analyze the substitutions between two equal-length sequences, as private substitutions against the reference
    pub fn analyze(
      ref_seq: &str,
      qry_seq: &str,
      config: Option<&MutationPatternsConfig>,
      qc: Option<&QcRulesConfigSnpClusters>,
    ) -> Result<MutationPatternAnalysis, Report> {
      let ref_seq = to_nuc_seq(ref_seq)?;
      let qry_seq = to_nuc_seq(qry_seq)?;
      assert_eq!(ref_seq.len(), qry_seq.len());
      let subs = izip!(0.., &ref_seq, &qry_seq)
        .filter(|(_, r, q)| r != q)
        .map(|(pos, &ref_nuc, &qry_nuc)| NucSub {
          pos: NucRefGlobalPosition::from(pos),
          ref_nuc,
          qry_nuc,
        })
        .collect_vec();
      let patterns = MutationPatterns::new(config, &ref_seq)?;
      Ok(analyze_mutation_patterns(&private_muts(subs), &ref_seq, &patterns, qc))
    }

    pub fn private_muts(private_substitutions: Vec<NucSub>) -> PrivateNucMutations {
      PrivateNucMutations {
        total_private_substitutions: private_substitutions.len(),
        private_substitutions,
        ..PrivateNucMutations::default()
      }
    }

    pub const fn type_count(ref_nuc: Nuc, qry_nuc: Nuc, count: usize) -> MutationPatternEventTypeCount {
      MutationPatternEventTypeCount::NucSubstitution(MutationPatternNucSubstitutionTypeCount {
        ref_nuc,
        qry_nuc,
        count,
      })
    }

    pub fn event_positions(events: &[MutationPatternEventMatch]) -> Vec<usize> {
      events
        .iter()
        .map(|event| match event {
          MutationPatternEventMatch::NucSubstitution(event) => event.substitution.sub.pos.as_usize(),
        })
        .collect_vec()
    }

    pub fn matched_positions(result: &MutationPatternResults) -> Vec<usize> {
      event_positions(&result.matches)
    }

    /// Motif sites `(start, end)` of each matched event
    pub fn motif_sites(result: &MutationPatternResults) -> Vec<Vec<(usize, usize)>> {
      result
        .matches
        .iter()
        .map(|event| match event {
          MutationPatternEventMatch::NucSubstitution(event) => {
            event.motif_matches.iter().map(|m| (m.start, m.end)).collect_vec()
          }
        })
        .collect_vec()
    }

    pub fn cluster_ranges(result: &MutationPatternResults) -> Vec<ClusterRange> {
      result.clusters.iter().map(|c| (c.start, c.end, c.count)).collect_vec()
    }
  }
}
