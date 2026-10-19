#[cfg(test)]
mod tests {
  use crate::analyze::find_aa_motifs::{AaMotif, AaMotifsSearch, find_aa_motifs};
  use crate::analyze::find_aa_motifs_changes::AaMotifsMap;
  use crate::assert_error;
  use eyre::Report;
  use helpers::{CdsFixture, aa_motifs_descs, aa_motifs_search, motifs, translation};
  use indoc::indoc;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use serde_json::json;

  #[test]
  fn test_find_aa_motifs_invalid_regex() -> Result<(), Report> {
    let result = AaMotifsSearch::new(&aa_motifs_descs(&json!([
      { "name": "good", "motifs": ["N[^P][ST]"] },
      { "name": "bad", "motifs": ["N", "N[^P"] },
    ]))?);
    let expected = indoc! {"
      When compiling regular expression 'N[^P' of 'aaMotifs' entry 'bad': regex parse error:
          N[^P
           ^^
      error: unclosed character class"};
    assert_error!(result, expected);
    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::range_nonzero(
    json!([{ "name": "glyc", "motifs": ["N[^P][ST]"], "includeCdses": [{ "cds": "A", "ranges": [{ "begin": 4, "end": 12 }] }] }]),
    vec![("A", "NASKNATQNVSL", vec![(0, 12)])],
    vec![("glyc", "A", 4, "NAT"), ("glyc", "A", 8, "NVS")],
  )]
  #[case::range_clipped_by_alignment(
    json!([{ "name": "glyc", "motifs": ["N[^P][ST]"] }]),
    vec![("A", "NASKNATQNVSL", vec![(2, 10)])],
    vec![("glyc", "A", 4, "NAT")],
  )]
  #[case::anchor_relative_to_range(
    json!([{ "name": "start", "motifs": ["^N"], "includeCdses": [{ "cds": "A", "ranges": [{ "begin": 1, "end": 4 }] }] }]),
    vec![("A", "ANST", vec![(0, 4)])],
    vec![("start", "A", 1, "N")],
  )]
  #[case::selection_empty(
    json!([{ "name": "glyc", "motifs": ["N"], "includeCdses": [{ "cds": "absent" }] }]),
    vec![("A", "NST", vec![(0, 3)])],
    vec![],
  )]
  #[case::all_cdses_when_selection_omitted(
    json!([{ "name": "glyc", "motifs": ["N[^P][ST]"] }]),
    vec![("A", "NST", vec![(0, 3)]), ("B", "KNAS", vec![(0, 4)])],
    vec![("glyc", "A", 0, "NST"), ("glyc", "B", 1, "NAS")],
  )]
  #[case::two_patterns_both_match(
    json!([{ "name": "n", "motifs": ["N", "NS"] }]),
    vec![("A", "NST", vec![(0, 3)])],
    vec![("n", "A", 0, "N"), ("n", "A", 0, "NS")],
  )]
  #[case::two_entries(
    json!([{ "name": "b", "motifs": ["S"] }, { "name": "a", "motifs": ["N"] }]),
    vec![("A", "NST", vec![(0, 3)])],
    vec![("a", "A", 0, "N"), ("b", "A", 1, "S")],
  )]
  #[case::capture_group_reports_full_match(
    json!([{ "name": "glyc", "motifs": ["N([^P])[ST]"] }]),
    vec![("A", "ANST", vec![(0, 4)])],
    vec![("glyc", "A", 1, "NST")],
  )]
  #[case::no_match(
    json!([{ "name": "glyc", "motifs": ["W"] }]),
    vec![("A", "NST", vec![(0, 3)])],
    vec![],
  )]
  #[trace]
  fn test_find_aa_motifs_positions(
    #[case] descs: serde_json::Value,
    #[case] cdses: Vec<CdsFixture>,
    #[case] expected: Vec<(&str, &str, isize, &str)>,
  ) -> Result<(), Report> {
    let actual = find_aa_motifs(&aa_motifs_search(&descs)?, &translation(&cdses)?);
    assert_eq!(motifs(&expected), actual);
    Ok(())
  }

  mod helpers {
    use super::*;
    use crate::alphabet::aa::to_aa_seq;
    use crate::analyze::virus_properties::AaMotifsDesc;
    use crate::coord::range::{AaRefRange, NucRefGlobalRange};
    use crate::gene::gene::Gene;
    use crate::o;
    use crate::translate::translate_genes::{CdsTranslation, GeneTranslation, Translation};
    use indexmap::IndexMap;
    use itertools::Itertools;
    use serde_json::Value;

    /// Parse `aaMotifs` entries, filling the display fields that the search does not use.
    pub fn aa_motifs_descs(descs: &Value) -> Result<Vec<AaMotifsDesc>, Report> {
      let descs = descs
        .as_array()
        .into_iter()
        .flatten()
        .map(|desc| {
          let mut desc = desc.clone();
          for key in ["nameShort", "nameFriendly", "description"] {
            desc[key] = json!("");
          }
          desc
        })
        .collect_vec();
      Ok(serde_json::from_value(Value::Array(descs))?)
    }

    pub fn aa_motifs_search(descs: &Value) -> Result<AaMotifsSearch, Report> {
      AaMotifsSearch::new(&aa_motifs_descs(descs)?)
    }

    /// CDS translation as (name, peptide, alignment ranges as (begin, end))
    pub type CdsFixture = (&'static str, &'static str, Vec<(usize, usize)>);

    /// Translation with one gene that holds the given CDSes.
    pub fn translation(cdses: &[CdsFixture]) -> Result<Translation, Report> {
      let cdses = cdses
        .iter()
        .map(|(name, seq, alignment_ranges)| {
          let cds = CdsTranslation {
            name: (*name).to_owned(),
            seq: to_aa_seq(seq)?,
            insertions: vec![],
            frame_shifts: vec![],
            alignment_ranges: alignment_ranges
              .iter()
              .map(|&(begin, end)| AaRefRange::from_usize(begin, end))
              .collect(),
            unsequenced_ranges: vec![],
          };
          Ok(((*name).to_owned(), cds))
        })
        .collect::<Result<IndexMap<_, _>, Report>>()?;

      let gene = Gene {
        index: 0,
        id: o!("gene"),
        name: o!("gene"),
        range: NucRefGlobalRange::from_usize(0, 0),
        cdses: vec![],
        exceptions: vec![],
        attributes: IndexMap::new(),
        source_record: None,
        compat_is_cds: false,
        color: None,
        gff_seqid: None,
        gff_source: None,
        gff_feature_type: None,
      };

      let gene_translation = GeneTranslation {
        gene,
        cdses,
        warnings: vec![],
      };

      Ok(Translation {
        genes: IndexMap::from([(o!("gene"), gene_translation)]),
      })
    }

    /// Expected motifs as (name, CDS, position, matched sequence), grouped by name.
    pub fn motifs(motifs: &[(&str, &str, isize, &str)]) -> AaMotifsMap {
      let mut map = AaMotifsMap::new();
      for &(name, cds, position, seq) in motifs {
        map.entry(name.to_owned()).or_default().push(AaMotif {
          name: name.to_owned(),
          cds: cds.to_owned(),
          position: position.into(),
          seq: seq.to_owned(),
        });
      }
      map
    }
  }
}
