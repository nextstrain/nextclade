#[cfg(test)]
mod tests {
  use crate::analyze::find_aa_motifs::AaMotif;
  use crate::{assert_error, o};
  use eyre::Report;
  use helpers::create_nextclade_with_aa_motifs;
  use indoc::indoc;
  use maplit::btreemap;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use serde_json::json;

  #[rustfmt::skip]
  #[rstest]
  #[case::without_annotation(None)]
  #[case::absent_cds(        Some(json!([{ "cds": "absent" }])))]
  #[trace]
  fn test_nextclade_wasm_aa_motifs_invalid_regex_fails_initialization(
    #[case] include_cdses: Option<serde_json::Value>,
  ) -> Result<(), Report> {
    let has_annotation = include_cdses.is_some();
    let aa_motifs = json!([{
      "name": "bad", "nameShort": "B", "nameFriendly": "Bad", "description": "d",
      "includeCdses": include_cdses.unwrap_or_else(|| json!([])),
      "motifs": ["N[^P"],
    }]);
    let expected = indoc! {"
      When compiling regular expression 'N[^P' of 'aaMotifs' entry 'bad': regex parse error:
          N[^P
           ^^
      error: unclosed character class"};
    assert_error!(create_nextclade_with_aa_motifs(Some(&aa_motifs), has_annotation).map(|_| ()), expected);
    Ok(())
  }

  #[test]
  fn test_nextclade_wasm_aa_motifs_absent_initializes() -> Result<(), Report> {
    let nextclade = create_nextclade_with_aa_motifs(None, true)?;
    assert_eq!(Vec::<String>::new(), nextclade.get_initial_data().aa_motif_keys);
    Ok(())
  }

  #[test]
  fn test_nextclade_wasm_aa_motifs_searches_reference() -> Result<(), Report> {
    let aa_motifs = json!([{
      "name": "vt", "nameShort": "VT", "nameFriendly": "VT", "description": "d", "motifs": ["VT"],
    }]);
    let nextclade = create_nextclade_with_aa_motifs(Some(&aa_motifs), true)?;
    // Reference peptide of CDS 'A' is MTFKVTVNRIEP*: 'VT' starts at codon 4
    let expected = btreemap! {
      o!("vt") => vec![AaMotif { name: o!("vt"), cds: o!("A"), position: 4.into(), seq: o!("VT") }],
    };
    assert_eq!(expected, nextclade.aa_motifs_ref);
    Ok(())
  }

  mod helpers {
    use super::*;
    use crate::io::json::{JsonPretty, json_stringify};
    use crate::run::__tests__::test_nextclade_wasm_initial_data::tests::helpers::{TestDataset, create_nextclade};
    use crate::run::nextclade_wasm::Nextclade;
    use serde_json::Value;

    /// CDS `A` over the whole default reference of `TestDataset`
    const GENOME_ANNOTATION: &str = "##gff-version 3\nreference\tsource\tCDS\t1\t39\t.\t+\t0\tName=A\n";

    /// Nextclade state for the default test dataset with the given `aaMotifs` in pathogen.json
    pub fn create_nextclade_with_aa_motifs(
      aa_motifs: Option<&Value>,
      has_annotation: bool,
    ) -> Result<Nextclade, Report> {
      let mut pathogen_json = json!({ "schemaVersion": "3.0.0" });
      if let Some(aa_motifs) = aa_motifs {
        pathogen_json["aaMotifs"] = aa_motifs.clone();
      }
      create_nextclade(TestDataset {
        genome_annotation: has_annotation.then(|| o!(GENOME_ANNOTATION)),
        pathogen_json: json_stringify(&pathogen_json, JsonPretty(false))?,
        ..TestDataset::default()
      })
    }
  }
}
