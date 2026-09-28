#[cfg(test)]
pub mod tests {
  use crate::alphabet::nuc::{Nuc, to_nuc_seq};
  use crate::analyze::mutation_patterns::{MutationPatternEventMatch, MutationPatterns, opposite_strand_motif};
  use crate::analyze::virus_properties::MutationPatternsConfig;
  use crate::assert_error;
  use crate::io::json::{JsonPretty, json_parse, json_stringify};
  use eyre::Report;
  use helpers::{
    ClusterRange, analyze, analyze_with_node, cluster_ranges, config, matched_positions, motif_sites, motif_texts,
    type_count,
  };
  use indoc::indoc;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use serde_json::{Value, json};

  #[test]
  fn test_mutation_patterns_nothing_configured() -> Result<(), Report> {
    let results = analyze("ACGTACGTAC", "ACGTGCGTAC", None)?;
    assert!(results.is_empty());
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
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
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
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
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
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    assert_eq!(vec![0, 4], matched_positions(&results.results[0]));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_event_lists_combine_independently() -> Result<(), Report> {
    // Same fixture as above, one event with both lists: A>C and T>G also match
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["A", "T"], "qry": ["G", "C"] }]
    }]))?;
    let results = analyze("AAAATTTT", "GCAACGTT", Some(&config))?;
    assert_eq!(vec![0, 1, 4, 5], matched_positions(&results.results[0]));
    Ok(())
  }

  // A nucleotide matches a filter code when all of its bases are bases of the code
  #[rustfmt::skip]
  #[rstest]
  #[case::ambiguous_filter_matches_member(      ("R", "N"), ("A", "G"), 1)]
  #[case::ambiguous_filter_rejects_other(       ("R", "N"), ("C", "G"), 0)]
  #[case::exact_filter(                         ("A", "G"), ("A", "G"), 1)]
  #[case::exact_filter_rejects_other_qry(       ("A", "G"), ("A", "T"), 0)]
  #[case::exact_filter_rejects_ambiguous_qry(   ("A", "G"), ("A", "R"), 0)]
  #[case::ambiguous_filter_matches_ambiguous(   ("A", "R"), ("A", "R"), 1)]
  #[case::ambiguous_filter_rejects_wider_qry(   ("A", "R"), ("A", "D"), 0)]
  #[case::n_filter_matches_ambiguous_qry(       ("A", "N"), ("A", "R"), 1)]
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
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    assert_eq!(expected_matches, results.results[0].counts.matches);
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
    //  #  site of motif T(C)W   *  C>T substitution
    let config = config(&json!([{
      "id": "apobec", "name": "APOBEC-like",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T(C)W"] }]
    }]))?;
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
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
    //  #  only site of motif T(C)W   *  C>T substitution outside of it
    let config = config(&json!([{
      "id": "apobec", "name": "APOBEC-like",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T(C)W"] }]
    }]))?;
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    assert_eq!(0, results.results[0].counts.matches);
    Ok(())
  }

  // C>T at position 2 of a 5-nucleotide context. Motif letters are IUPAC codes: a code matches every code whose bases
  // are a subset of its bases, and `[..]` and `.` combine bases in the same way
  #[rustfmt::skip]
  #[rstest]
  #[case::code_matches_first_base(      "T(C)W",    "GTCAG", 1)]
  #[case::code_matches_second_base(     "T(C)W",    "GTCTG", 1)]
  #[case::code_rejects_other_base(      "T(C)W",    "GTCCG", 0)]
  #[case::code_matches_same_code(       "T(C)W",    "GTCWG", 1)]
  #[case::code_rejects_wider_code(      "T(C)W",    "GTCNG", 0)]
  #[case::lower_case(                   "t(c)w",    "GTCAG", 1)]
  #[case::class_equals_code(            "T(C)[AT]", "GTCWG", 1)]
  #[case::negated_class_rejects_base(   "[^A](C)W", "GACAG", 0)]
  #[case::negated_class_matches_other(  "[^A](C)W", "GTCAG", 1)]
  #[case::negated_class_rejects_code(   "[^A](C)W", "GRCAG", 0)]
  #[case::negated_code_matches_subset(  "[^W](C)W", "GSCAG", 1)]
  #[case::dot_matches_any_code(         ".(C)W",    "GNCAG", 1)]
  #[trace]
  fn test_mutation_patterns_motif_letters(
    #[case] motif: &str,
    #[case] ref_seq: &str,
    #[case] expected_matches: usize,
  ) -> Result<(), Report> {
    let qry_seq = ref_seq
      .char_indices()
      .map(|(pos, nuc)| if pos == 2 { 'T' } else { nuc })
      .collect::<String>();
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": [motif] }]
    }]))?;
    let results = analyze(ref_seq, &qry_seq, Some(&config))?;
    assert_eq!(expected_matches, results.results[0].counts.matches);
    Ok(())
  }

  // Motif WAG has one site in CAAGC. The group in parentheses decides which position of the site the substitution must be
  // at. Without the group, an A>G at position 1 would also count, although its next base is A, not G
  #[rustfmt::skip]
  #[rstest]
  #[case::group_on_first_base( "(W)AG", vec![1])]
  #[case::group_on_second_base("W(A)G", vec![2])]
  #[case::group_on_third_base( "WA(G)", vec![3])]
  #[trace]
  fn test_mutation_patterns_motif_group_position(
    #[case] motif: &str,
    #[case] expected_positions: Vec<usize>,
  ) -> Result<(), Report> {
    #[rustfmt::skip]
    //             01234
    let ref_seq = "CAAGC";
    //             .....
    let qry_seq = "GTTCG";
    //              ###
    //
    //  Match:  |  identical  .  substitution
    //  #  the only site of motif WAG
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["N"], "qry": ["N"], "motifs": [motif] }]
    }]))?;
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
    assert_eq!(expected_positions, matched_positions(result));
    assert_eq!(vec![vec![(1, 4)]], motif_sites(result));
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
    //  #  sites of motif N(C)N   *  C>T substitution
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["N(C)N"] }]
    }]))?;
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
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
    //  #  sites of motif T+(C), one per start position   *  C>T substitution
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T+(C)"] }]
    }]))?;
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    assert_eq!(vec![vec![(2, 5), (3, 5)]], motif_sites(&results.results[0]));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_union_of_events() -> Result<(), Report> {
    #[rustfmt::skip]
    //             01234
    let ref_seq = "GTCAG";
    //             ||.||
    let qry_seq = "GTTAG";
    //              ##
    //               ##
    //               *
    //
    //  Match:  |  identical  .  substitution
    //  #  sites of motifs T(C) and (C)W   *  C>T substitution
    let events = json!([
      { "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T(C)"] },
      { "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["(C)W"] }
    ]);
    let reversed_events = json!([events[1], events[0]]);
    let config_with_events = |events: &Value| config(&json!([{ "id": "p", "name": "P", "events": events }]));
    let reversed_config = config_with_events(&reversed_events)?;
    let config = config_with_events(&events)?;

    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
    assert_eq!(vec![2], matched_positions(result));
    assert_eq!(vec![vec![(1, 3), (2, 4)]], motif_sites(result));

    let reversed_results = analyze(ref_seq, qry_seq, Some(&reversed_config))?;
    assert_eq!(
      json_stringify(&results, JsonPretty(false))?,
      json_stringify(&reversed_results, JsonPretty(false))?
    );
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_union_with_event_without_motifs() -> Result<(), Report> {
    // A>G at 1 in the site of `T(A)`, and A>G at 3 outside of it. The event without motifs accepts both, and the event
    // with the motif adds its site to the first one
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [
        { "type": "nucSubstitution", "ref": ["A"], "qry": ["G"], "motifs": ["T(A)"] },
        { "type": "nucSubstitution", "ref": ["A"], "qry": ["G"] }
      ]
    }]))?;
    let results = analyze("TACAC", "TGCGC", Some(&config))?;
    let result = &results.results[0];
    assert_eq!(vec![1, 3], matched_positions(result));
    assert_eq!(vec![vec![(0, 2)], vec![]], motif_sites(result));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_both_strands() -> Result<(), Report> {
    #[rustfmt::skip]
    //             0123456789
    let ref_seq = "GTCAGCTGAC";
    //             ||.|.||.||
    let qry_seq = "GTTAACTAAC";
    //              ###   ###
    //               *  x  +
    //
    //  Match:  |  identical  .  substitution
    //  #  sites of T(C)W and of the derived W(G)A
    //  *  C>T in TCW   +  G>A in WGA   x  G>A in AGC, not selected
    let config = config(&json!([{
      "id": "apobec", "name": "APOBEC3-like",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["t(c)w"], "bothStrands": true }]
    }]))?;
    let results = analyze(ref_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
    assert_eq!(vec![2, 7], matched_positions(result));
    assert_eq!(vec![vec![(1, 4)], vec![(6, 9)]], motif_sites(result));
    assert_eq!(vec![vec!["t(c)w"], vec!["W(G)A"]], motif_texts(result));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_both_strands_and_listed_event_count_once() -> Result<(), Report> {
    // G>A at 7 is matched by the listed event and by the event derived from C>T
    let config = config(&json!([{
      "id": "apobec", "name": "APOBEC3-like",
      "events": [
        { "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T(C)W"], "bothStrands": true },
        { "type": "nucSubstitution", "ref": ["G"], "qry": ["A"], "motifs": ["W(G)A"] }
      ]
    }]))?;
    let results = analyze("GTCAGCTGAC", "GTCAGCTAAC", Some(&config))?;
    let result = &results.results[0];
    assert_eq!(vec![7], matched_positions(result));
    assert_eq!(vec![vec!["W(G)A"]], motif_texts(result));
    Ok(())
  }

  // Reverse the order, complement every nucleotide code, keep the group, the classes, the repetitions and the
  // alternatives
  #[rustfmt::skip]
  #[rstest]
  #[case::literals(    "T(C)W",       "W(G)A")]
  #[case::lower_case(  "t(c)w",       "W(G)A")]
  #[case::classes(     "[CT](G)[^C]", "[^G](C)[GA]")]
  #[case::repetition(  "T+(C)N{2}",   "N{2}(G)A+")]
  #[case::alternation( "(C)(?:AG|T)", "(?:CT|A)(G)")]
  #[case::dot(         ".(C)",        "(G).")]
  #[trace]
  fn test_mutation_patterns_opposite_strand_motif(#[case] motif: &str, #[case] expected: &str) -> Result<(), Report> {
    assert_eq!(expected, opposite_strand_motif(motif)?);
    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::assertion(  "^T(C)W",            "Assertions such as '^', '$' or '\\b' cannot be used with `bothStrands`")]
  #[case::flags(      "(?i)T(C)W",         "Inline flags such as '(?i)' cannot be used with `bothStrands`")]
  #[case::perl_class( "\\w(C)W",           "Named classes such as '\\w' or '\\pL' cannot be used with `bothStrands`")]
  #[case::ascii_class("[[:upper:]](C)W",   "Named classes such as '[:alpha:]', '\\w' or '\\pL' cannot be used with `bothStrands`")]
  #[trace]
  fn test_mutation_patterns_both_strands_rejects_motif(
    #[case] motif: &str,
    #[case] expected: &str,
  ) -> Result<(), Report> {
    let config = config(&json!([{
      "id": "a", "name": "A",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": [motif], "bothStrands": true }]
    }]))?;
    let expected = format!(
      "When preparing mutation pattern 'a': When preparing the opposite-strand event of `bothStrands`: When reverse-complementing motif '{motif}': {expected}"
    );
    assert_error!(MutationPatterns::new(Some(&config)), expected);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_context_from_nearest_node() -> Result<(), Report> {
    #[rustfmt::skip]
    //              0         1
    //              0123456789
    let ref_seq  = "ACGTACGTAC";
    //              ||||.|||||
    let node_seq = "ACGTGCGTAC";
    //              ||||.|||||
    let qry_seq = "ACGTACGTAC";
    //                  r
    //
    //  Match:  |  identical  .  substitution (ref vs node, node vs query)
    //  r  reversion: the node has G, the query has the reference A
    let config = config(&json!([{ "id": "all", "name": "All" }]))?;
    let results = analyze_with_node(ref_seq, node_seq, qry_seq, Some(&config))?;
    let MutationPatternEventMatch::NucSubstitution(event) = &results.results[0].matches[0];
    assert_eq!(Nuc::G, event.substitution.sub.ref_nuc);
    assert_eq!(Nuc::A, event.substitution.sub.qry_nuc);
    assert_eq!(to_nuc_seq("TGC")?, event.substitution.ref_context);
    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::node_substitution_creates_site(("GTCCG", "GTCAG", "GTTAG"), (vec![2], vec![vec![(1, 4)]]))]
  #[case::node_substitution_removes_site(("GTCAG", "GTCCG", "GTTCG"), (vec![],  vec![]))]
  #[case::node_deletion_removes_site(    ("GTCAG", "GTC-G", "GTT-G"), (vec![],  vec![]))]
  #[trace]
  fn test_mutation_patterns_motif_on_nearest_node(
    #[case] (ref_seq, node_seq, qry_seq): (&str, &str, &str),
    #[case] (expected_positions, expected_sites): (Vec<usize>, Vec<Vec<(usize, usize)>>),
  ) -> Result<(), Report> {
    let config = config(&json!([{
      "id": "p", "name": "P",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T(C)W"] }]
    }]))?;
    let results = analyze_with_node(ref_seq, node_seq, qry_seq, Some(&config))?;
    let result = &results.results[0];
    assert_eq!(expected_positions, matched_positions(result));
    assert_eq!(expected_sites, motif_sites(result));
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
    let results = analyze("ACGTACGTACGTA", "GCGTGCGTGCGTA", Some(&config))?;
    let result = &results.results[0];
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
    let results = analyze("ACGTACGTACGT", "GCGTACGTGCGT", Some(&config))?;
    assert_eq!(expected_clusters, results.results[0].counts.clusters);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_cluster_largest_window_size() -> Result<(), Report> {
    // The window end is computed without overflow, so all events are in one window
    let config =
      config(&json!([{ "id": "all", "name": "All", "cluster": { "windowSize": usize::MAX, "cutoff": 1 } }]))?;
    let results = analyze("ACGTACGTACGTA", "GCGTGCGTGCGTA", Some(&config))?;
    assert_eq!(vec![(0, 8, 3)], cluster_ranges(&results.results[0]));
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
    let results = analyze(&ref_seq, &qry_seq, Some(&config))?;
    let result = &results.results[0];
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
    let results = analyze("ACGTACGTACGTA", "GCGTGCGTGCGTA", Some(&config))?;
    let result = &results.results[0];
    assert_eq!(3, result.counts.matches);
    assert!(result.clusters.is_empty());
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_empty_results_without_substitutions() -> Result<(), Report> {
    let config = config(&json!([{ "id": "all", "name": "All", "cluster": { "windowSize": 10, "cutoff": 0 } }]))?;
    let results = analyze("ACGT", "ACGT", Some(&config))?;
    let result = &results.results[0];
    assert_eq!("all", result.id);
    assert_eq!(
      (0, 0, 0),
      (result.counts.matches, result.counts.clustered, result.counts.clusters)
    );
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_multiple_patterns_in_config_order() -> Result<(), Report> {
    let config = config(&json!([
      { "id": "tc", "name": "T>C", "events": [{ "type": "nucSubstitution", "ref": ["T"], "qry": ["C"] }] },
      { "id": "ag", "name": "A>G", "events": [{ "type": "nucSubstitution", "ref": ["A"], "qry": ["G"] }] }
    ]))?;
    // A>G at 0, T>C at 3
    let results = analyze("ACGTACGT", "GCGCACGT", Some(&config))?;
    let results = &results.results;
    assert_eq!(
      vec!["tc", "ag"],
      results.iter().map(|r| r.id.as_str()).collect::<Vec<_>>()
    );
    assert_eq!(vec![3], matched_positions(&results[0]));
    assert_eq!(vec![0], matched_positions(&results[1]));
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_ids_in_config_order() -> Result<(), Report> {
    let config = config(&json!([{ "id": "tc", "name": "T>C" }, { "id": "ag", "name": "A>G" }]))?;
    let patterns = MutationPatterns::new(Some(&config))?;
    assert_eq!(vec!["tc", "ag"], patterns.ids().collect::<Vec<_>>());
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
    let results = analyze("ACGTACGT", "ACGCACGC", Some(&config))?;
    let actual = json_parse::<Value>(&json_stringify(&results, JsonPretty(false))?)?;
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
    "When preparing mutation pattern 'a': Mutation pattern id 'a' is used more than once",
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
  #[case::zero_window(
    json!([{ "id": "a", "name": "A", "cluster": { "windowSize": 0, "cutoff": 1 } }]),
    "When preparing mutation pattern 'a': Mutation pattern cluster `windowSize` must be at least 1",
  )]
  #[trace]
  fn test_mutation_patterns_invalid_config(#[case] patterns: Value, #[case] expected: &str) -> Result<(), Report> {
    let config = config(&patterns)?;
    assert_error!(MutationPatterns::new(Some(&config)), expected);
    Ok(())
  }

  // Motifs of an A>G event
  #[rustfmt::skip]
  #[rstest]
  #[case::empty(              "",         "Mutation pattern motif cannot be empty")]
  #[case::no_group(           "WAG",      "The motif must contain exactly one group in parentheses, which marks the mutated nucleotide, for example 'T(C)W'")]
  #[case::two_groups(         "(W)(A)G",  "The motif must contain exactly one group in parentheses, which marks the mutated nucleotide, for example 'T(C)W'")]
  #[case::optional_group(     "W(A)?G",   "The motif must contain exactly one group in parentheses, which marks the mutated nucleotide, for example 'T(C)W'")]
  #[case::group_in_one_branch("W(A)G|WG", "The motif must contain exactly one group in parentheses, which marks the mutated nucleotide, for example 'T(C)W'")]
  #[case::long_group(         "W(AG)",    "The group in parentheses must match exactly one nucleotide")]
  #[case::repeated_group(     "W(A+)G",   "The group in parentheses must match exactly one nucleotide")]
  #[case::group_not_ref(      "T(C)W",    "The group in parentheses matches none of the event `ref` nucleotides: A")]
  #[case::letter_not_code(    "U(A)G",    "The character 'U' is not a nucleotide code")]
  #[case::lower_not_code(     "u(A)G",    "The character 'u' is not a nucleotide code")]
  #[case::gap(                "-(A)G",    "The character '-' is not a nucleotide code")]
  #[case::class_letter(       "[AU](A)G", "The character 'U' is not a nucleotide code")]
  #[case::range(              "[A-C](A)", "Character ranges such as 'A-C' are not supported. List the nucleotides instead, for example '[ACG]'")]
  #[trace]
  fn test_mutation_patterns_invalid_motif(#[case] motif: &str, #[case] expected: &str) -> Result<(), Report> {
    let config = config(&json!([{
      "id": "a", "name": "A",
      "events": [{ "type": "nucSubstitution", "ref": ["A"], "qry": ["G"], "motifs": [motif] }]
    }]))?;
    let expected = format!("When preparing mutation pattern 'a': When preparing motif '{motif}': {expected}");
    assert_error!(MutationPatterns::new(Some(&config)), expected);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_invalid_motif_regex() -> Result<(), Report> {
    let config = config(&json!([{
      "id": "a", "name": "A",
      "events": [{ "type": "nucSubstitution", "ref": ["C"], "qry": ["T"], "motifs": ["T(C"] }]
    }]))?;
    // The message after the context is produced by the `regex-syntax` parser
    let expected = indoc! {r#"
      When preparing mutation pattern 'a': When preparing motif 'T(C': When parsing motif: regex parse error:
          T(C
           ^
      error: unclosed group"#};
    assert_error!(MutationPatterns::new(Some(&config)), expected);
    Ok(())
  }

  #[test]
  fn test_mutation_patterns_schema_example_is_valid() -> Result<(), Report> {
    let patterns = MutationPatterns::new(Some(&MutationPatternsConfig::example()))?;
    assert_eq!(vec!["adar", "apobec"], patterns.ids().collect::<Vec<_>>());
    Ok(())
  }

  pub mod helpers {
    use crate::alphabet::letter::Letter;
    use crate::alphabet::nuc::{Nuc, to_nuc_seq};
    use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
    use crate::analyze::mutation_patterns::{
      MutationPatternEventMatch, MutationPatternEventTypeCount, MutationPatternNucSubstitutionTypeCount,
      MutationPatternResults, MutationPatterns, MutationPatternsResults, analyze_mutation_patterns,
    };
    use crate::analyze::nuc_sub::NucSub;
    use crate::analyze::virus_properties::MutationPatternsConfig;
    use crate::coord::position::{NucRefGlobalPosition, PositionLike};
    use crate::io::json::json_parse;
    use eyre::Report;
    use itertools::{Itertools, izip};
    use serde_json::{Value, json};
    use std::collections::BTreeMap;

    /// Cluster `(start, end, count)`
    pub type ClusterRange = (usize, usize, usize);

    pub fn config(patterns: &Value) -> Result<MutationPatternsConfig, Report> {
      json_parse(json!({ "patterns": patterns }).to_string())
    }

    /// Analyze the substitutions between two equal-length sequences, with the reference as the nearest node
    pub fn analyze(
      ref_seq: &str,
      qry_seq: &str,
      config: Option<&MutationPatternsConfig>,
    ) -> Result<MutationPatternsResults, Report> {
      analyze_with_node(ref_seq, ref_seq, qry_seq, config)
    }

    /// Analyze the private substitutions of a query against a nearest node, as private substitutions are found in the
    /// analysis: node mutations are the differences between reference and node, and private substitutions are the
    /// differences between node and query, outside of gaps
    pub fn analyze_with_node(
      ref_seq: &str,
      node_seq: &str,
      qry_seq: &str,
      config: Option<&MutationPatternsConfig>,
    ) -> Result<MutationPatternsResults, Report> {
      let ref_seq = to_nuc_seq(ref_seq)?;
      let node_seq = to_nuc_seq(node_seq)?;
      let qry_seq = to_nuc_seq(qry_seq)?;
      assert_eq!(ref_seq.len(), node_seq.len());
      assert_eq!(ref_seq.len(), qry_seq.len());
      let node_mutations = izip!(0.., &ref_seq, &node_seq)
        .filter(|(_, r, n)| r != n)
        .map(|(pos, _, &nuc)| (NucRefGlobalPosition::from(pos), nuc))
        .collect::<BTreeMap<_, _>>();
      let subs = izip!(0.., &node_seq, &qry_seq)
        .filter(|(_, n, q)| n != q && !n.is_gap() && !q.is_gap())
        .map(|(pos, &ref_nuc, &qry_nuc)| NucSub {
          pos: NucRefGlobalPosition::from(pos),
          ref_nuc,
          qry_nuc,
        })
        .collect_vec();
      let patterns = MutationPatterns::new(config)?;
      Ok(analyze_mutation_patterns(
        &private_muts(subs),
        &ref_seq,
        Some(&node_mutations),
        &patterns,
      ))
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

    /// Motif text of the sites of each matched event
    pub fn motif_texts(result: &MutationPatternResults) -> Vec<Vec<String>> {
      result
        .matches
        .iter()
        .map(|event| match event {
          MutationPatternEventMatch::NucSubstitution(event) => {
            event.motif_matches.iter().map(|m| m.motif.clone()).collect_vec()
          }
        })
        .collect_vec()
    }

    pub fn cluster_ranges(result: &MutationPatternResults) -> Vec<ClusterRange> {
      result.clusters.iter().map(|c| (c.start, c.end, c.count)).collect_vec()
    }
  }
}
