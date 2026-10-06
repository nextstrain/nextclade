#[cfg(test)]
mod tests {
  use crate::analyze::find_lost_start_codons::LostStartCodon;
  use crate::types::outputs::PeptideWarning;
  use eyre::Report;
  use helpers::{FORWARD, NOT_START, REVERSE, lost, run};
  use pretty_assertions::assert_eq;
  use rstest::rstest;

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
    use crate::analyze::find_lost_start_codons::{LostStartCodon, find_lost_start_codons};
    use crate::analyze::nuc_alignment::NucAlignment;
    use crate::analyze::nuc_changes::find_nuc_changes;
    use crate::gene::gene_map::GeneMap;
    use eyre::Report;
    use itertools::Itertools;

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

    pub fn lost((cds_name, ref_codon, qry_codon): (&str, &str, &str)) -> Result<LostStartCodon, Report> {
      Ok(LostStartCodon {
        cds_name: cds_name.to_owned(),
        ref_codon: to_nuc_seq(ref_codon)?,
        qry_codon: to_nuc_seq(qry_codon)?,
      })
    }

    pub fn run(ref_seq: &str, qry_aln: &str, gff: &str) -> Result<Vec<LostStartCodon>, Report> {
      let ref_seq = to_nuc_seq(ref_seq)?;
      let qry_seq = to_nuc_seq(qry_aln)?;
      let gene_map = GeneMap::from_str(gff)?;
      let alignment_range = find_nuc_changes(&qry_seq, &ref_seq).alignment_range;
      let aln = NucAlignment::new(&ref_seq, &qry_seq, &alignment_range);
      Ok(find_lost_start_codons(&gene_map.iter_cdses().collect_vec(), &aln))
    }
  }
}
