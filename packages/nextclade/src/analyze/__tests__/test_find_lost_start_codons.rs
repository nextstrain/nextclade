#[cfg(test)]
mod tests {
  use crate::analyze::find_lost_start_codons::LostStartCodon;
  use crate::types::outputs::PeptideWarning;
  use eyre::Report;
  use helpers::{FORWARD, NOT_START, POLYPROTEIN, POLYPROTEIN_REVERSE, REVERSE, STOP_BETWEEN, cdses, gff, lost, run};
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::collections::BTreeSet;

  // Reference and query are aligned. `FORWARD` and `NOT_START` share the reference `TTTCCATGAAACCCGGGTAAGGTT`;
  // `REVERSE` has the reverse complement of the same CDS. Expected results are (CDS, reference codon, query codon), both
  // codons in the reading direction of the CDS.
  #[rstest]
  #[rustfmt::skip]
  //                                               0         1         2
  //                                               012345678901234567890123
  //                                                    [----CDS1-----]          forward
  //                                                   [----CDS1-----]           reverse
  #[case::forward_intact(              FORWARD,   "TTTCCATGAAACCCGGGTAAGGTT", vec![]                         )]
  #[case::forward_first_base_deleted(  FORWARD,   "TTTCC-TGAAACCCGGGTAAGGTT", vec![("CDS1", "ATG", "-TG")]   )]
  #[case::forward_codon_deleted(       FORWARD,   "TTTCC---AAACCCGGGTAAGGTT", vec![("CDS1", "ATG", "---")]   )]
  #[case::forward_substitution(        FORWARD,   "TTTCCATAAAACCCGGGTAAGGTT", vec![("CDS1", "ATG", "ATA")]   )]
  #[case::forward_unknown(             FORWARD,   "TTTCCNTGAAACCCGGGTAAGGTT", vec![]                         )]
  #[case::forward_ambiguous(           FORWARD,   "TTTCCATRAAACCCGGGTAAGGTT", vec![]                         )]
  #[case::forward_unsequenced(         FORWARD,   "-------GAAACCCGGGTAAGGTT", vec![]                         )]
  #[case::not_start_codon(             NOT_START, "TTTCCATGAAGCCCGGGTAAGGTT", vec![]                         )]
  #[case::reverse_intact(              REVERSE,   "AACCTTACCCGGGTTTCATGGAAA", vec![]                         )]
  #[case::reverse_first_base_deleted(  REVERSE,   "AACCTTACCCGGGTTTCA-GGAAA", vec![("CDS1", "ATG", "-TG")]   )]
  #[case::reverse_substitution(        REVERSE,   "AACCTTACCCGGGTTTCTTGGAAA", vec![("CDS1", "ATG", "AAG")]   )]
  #[trace]
  fn test_find_lost_start_codons(
    #[case] (ref_seq, gff): (&str, &str),
    #[case] qry_aln: &str,
    #[case] expected: Vec<(&str, &str, &str)>,
  ) -> Result<(), Report> {
    let expected = expected.into_iter().map(lost).collect::<Result<Vec<_>, Report>>()?;
    let actual = run(ref_seq, qry_aln, gff)?;
    assert_eq!(expected, actual);
    Ok(())
  }

  // Two mature peptides of a polyprotein, as for HIV-1 `p2` and `p7`: `CDS2` continues the reading frame of `CDS1`, so
  // its first codon `ATG` is not a start codon, and a change there is an ordinary amino acid substitution.
  #[rstest]
  #[rustfmt::skip]
  //                                                     0         1         2
  //                                                     012345678901234567890123
  //                                                       [CDS1][---CDS2---]
  #[case::first_cds_substitution(    "TTATAGCAATGAAACCCTAAGGTT", vec![("CDS1", "ATG", "ATA")]   )]
  #[case::continuation_substitution( "TTATGGCATGGAAACCCTAAGGTT", vec![]                         )]
  #[case::continuation_deletion(     "TTATGGCA---AAACCCTAAGGTT", vec![]                         )]
  #[trace]
  fn test_find_lost_start_codons_polyprotein(
    #[case] qry_aln: &str,
    #[case] expected: Vec<(&str, &str, &str)>,
  ) -> Result<(), Report> {
    let features = [("CDS1", 3, 8, '+'), ("CDS2", 9, 20, '+')];
    let expected = expected.into_iter().map(lost).collect::<Result<Vec<_>, Report>>()?;
    let actual = run(POLYPROTEIN, qry_aln, &gff(&features))?;
    assert_eq!(expected, actual);
    Ok(())
  }

  // Each CDS is (name, start, end, strand), with 1-based inclusive coordinates as in GFF3. Features with the same name
  // are segments of one CDS.
  #[rstest]
  #[rustfmt::skip]
  #[case::polyprotein(                 POLYPROTEIN,         vec![("CDS1", 3, 8, '+'),   ("CDS2", 9, 20, '+')],                        vec!["CDS1"]          )]
  #[case::polyprotein_reverse(         POLYPROTEIN_REVERSE, vec![("CDS1", 17, 22, '-'), ("CDS2", 5, 16, '-')],                        vec!["CDS1"]          )]
  #[case::previous_cds_two_segments(   POLYPROTEIN,         vec![("CDS1", 3, 5, '+'),   ("CDS1", 6, 8, '+'), ("CDS2", 9, 20, '+')],   vec!["CDS1"]          )]
  #[case::previous_cds_ends_with_stop( STOP_BETWEEN,        vec![("CDS1", 3, 8, '+'),   ("CDS2", 9, 20, '+')],                        vec!["CDS1", "CDS2"]  )]
  #[case::previous_cds_not_adjacent(   POLYPROTEIN,         vec![("CDS1", 3, 5, '+'),   ("CDS2", 9, 20, '+')],                        vec!["CDS1", "CDS2"]  )]
  #[case::nested_alternative_start(    POLYPROTEIN,         vec![("CDS1", 3, 20, '+'),  ("CDS2", 9, 20, '+')],                        vec!["CDS1", "CDS2"]  )]
  #[case::previous_cds_other_strand(   POLYPROTEIN,         vec![("CDS1", 3, 8, '+'),   ("CDS2", 4, 9, '-')],                         vec!["CDS1"]          )]
  #[case::previous_cds_not_annotated(  POLYPROTEIN,         vec![("CDS2", 9, 20, '+')],                                               vec!["CDS2"]          )]
  #[case::not_start_codon(             POLYPROTEIN,         vec![("CDS2", 12, 20, '+')],                                              vec![]                )]
  #[trace]
  fn test_find_cdses_with_start_codon(
    #[case] ref_seq: &str,
    #[case] features: Vec<(&str, usize, usize, char)>,
    #[case] expected: Vec<&str>,
  ) -> Result<(), Report> {
    let expected: BTreeSet<String> = expected.into_iter().map(str::to_owned).collect();
    let actual = cdses(ref_seq, &gff(&features))?;
    assert_eq!(expected, actual);
    Ok(())
  }

  #[test]
  fn test_find_lost_start_codons_warning_deletion() -> Result<(), Report> {
    let expected = PeptideWarning {
      cds_name: "VP4".to_owned(),
      warning: "In CDS 'VP4': The start codon is lost: the first codon is 'ATG' in the reference and '-TG' in the query. A deletion removes all or part of the start codon. If the deletion has an equally good placement outside of the CDS, the alignment parameter 'penaltyGapEnterCds' moves it there.".to_owned(),
    };
    let actual = LostStartCodon::to_warning(&lost(("VP4", "ATG", "-TG"))?);
    assert_eq!(expected, actual);
    Ok(())
  }

  #[test]
  fn test_find_lost_start_codons_warning_substitution() -> Result<(), Report> {
    let expected = PeptideWarning {
      cds_name: "VP4".to_owned(),
      warning:
        "In CDS 'VP4': The start codon is lost: the first codon is 'ATG' in the reference and 'ATA' in the query."
          .to_owned(),
    };
    let actual = LostStartCodon::to_warning(&lost(("VP4", "ATG", "ATA"))?);
    assert_eq!(expected, actual);
    Ok(())
  }

  mod helpers {
    use crate::alphabet::nuc::to_nuc_seq;
    use crate::analyze::find_lost_start_codons::{LostStartCodon, find_cdses_with_start_codon, find_lost_start_codons};
    use crate::analyze::nuc_alignment::NucAlignment;
    use crate::analyze::nuc_changes::find_nuc_changes;
    use crate::gene::gene_map::GeneMap;
    use eyre::Report;
    use itertools::Itertools;
    use std::collections::BTreeSet;

    /// Forward-strand CDS `ATGAAACCCGGGTAA` at 6..20
    pub const FORWARD: (&str, &str) = (
      "TTTCCATGAAACCCGGGTAAGGTT",
      "##gff-version 3\nref\t.\tCDS\t6\t20\t.\t+\t0\tName=CDS1\n",
    );

    /// Forward-strand CDS that starts with `AAA` at 9..20, as for a mature peptide
    pub const NOT_START: (&str, &str) = (
      "TTTCCATGAAACCCGGGTAAGGTT",
      "##gff-version 3\nref\t.\tCDS\t9\t20\t.\t+\t0\tName=CDS1\n",
    );

    /// Reverse-strand CDS at 5..19: reverse complement `ATGAAACCCGGGTAA` of `TTACCCGGGTTTCAT`
    pub const REVERSE: (&str, &str) = (
      "AACCTTACCCGGGTTTCATGGAAA",
      "##gff-version 3\nref\t.\tCDS\t5\t19\t.\t-\t0\tName=CDS1\n",
    );

    /// Forward-strand polyprotein `ATGGCA ATGAAACCCTAA` at 3..20
    pub const POLYPROTEIN: &str = "TTATGGCAATGAAACCCTAAGGTT";

    /// Reverse complement of `POLYPROTEIN`, with the polyprotein at 5..22 on the reverse strand
    pub const POLYPROTEIN_REVERSE: &str = "AACCTTAGGGTTTCATTGCCATAA";

    /// Adjacent genes `ATGTAA` at 3..8 and `ATGAAACCCTAA` at 9..20, with the stop codon `TAA` at the end of the first
    pub const STOP_BETWEEN: &str = "TTATGTAAATGAAACCCTAAGGTT";

    /// GFF3 annotation with one CDS feature per (name, start, end, strand)
    pub fn gff(features: &[(&str, usize, usize, char)]) -> String {
      let lines = features
        .iter()
        .map(|(name, start, end, strand)| {
          format!("ref\t.\tCDS\t{start}\t{end}\t.\t{strand}\t0\tID={name};Name={name}\n")
        })
        .join("");
      format!("##gff-version 3\n{lines}")
    }

    pub fn lost((cds_name, ref_codon, qry_codon): (&str, &str, &str)) -> Result<LostStartCodon, Report> {
      Ok(LostStartCodon {
        cds_name: cds_name.to_owned(),
        ref_codon: to_nuc_seq(ref_codon)?,
        qry_codon: to_nuc_seq(qry_codon)?,
      })
    }

    pub fn cdses(ref_seq: &str, gff: &str) -> Result<BTreeSet<String>, Report> {
      let ref_seq = to_nuc_seq(ref_seq)?;
      let gene_map = GeneMap::from_str(gff)?;
      Ok(find_cdses_with_start_codon(&gene_map, &ref_seq))
    }

    pub fn run(ref_seq: &str, qry_aln: &str, gff: &str) -> Result<Vec<LostStartCodon>, Report> {
      let ref_seq = to_nuc_seq(ref_seq)?;
      let qry_seq = to_nuc_seq(qry_aln)?;
      let gene_map = GeneMap::from_str(gff)?;
      let cdses_with_start_codon = find_cdses_with_start_codon(&gene_map, &ref_seq);
      let alignment_range = find_nuc_changes(&qry_seq, &ref_seq).alignment_range;
      let aln = NucAlignment::new(&ref_seq, &qry_seq, &alignment_range);
      Ok(find_lost_start_codons(
        &gene_map.iter_cdses().collect_vec(),
        &cdses_with_start_codon,
        &aln,
      ))
    }
  }
}
