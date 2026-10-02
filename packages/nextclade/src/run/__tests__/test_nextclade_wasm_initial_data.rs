#[cfg(test)]
mod tests {
  use crate::run::nextclade_wasm::{Nextclade, NextcladeParams, NextcladeParamsRaw, NextcladeParamsRawDir};
  use crate::run::params::NextcladeInputParamsOptional;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  const REFERENCE_FASTA: &str = ">reference\nATGACCTTCAAGGTTACCGTTAACCGGATCGAACCTTAG\n";

  const PATHOGEN_JSON: &str = r#"{ "schemaVersion": "3.0.0" }"#;

  const TREE_JSON: &str = r#"{
    "version": "v2",
    "meta": {},
    "tree": { "name": "root", "node_attrs": {}, "branch_attrs": { "mutations": {} } }
  }"#;

  #[rustfmt::skip]
  #[rstest]
  #[case::without_tree (None,            false)]
  #[case::with_tree    (Some(TREE_JSON), true )]
  #[trace]
  fn test_nextclade_wasm_initial_data_has_tree(
    #[case] tree_json: Option<&str>,
    #[case] expected: bool,
  ) -> Result<(), Report> {
    let nextclade = create_nextclade(tree_json)?;
    // The analysis outputs a tree if and only if the dataset provides a reference tree
    assert_eq!(expected, nextclade.get_initial_data().has_tree);
    Ok(())
  }

  mod helpers {
    use super::*;
    use crate::o;

    pub fn create_nextclade(tree_json: Option<&str>) -> Result<Nextclade, Report> {
      let raw = NextcladeParamsRaw::Dir(vec![NextcladeParamsRawDir {
        dataset_name: o!("test"),
        reference: o!(REFERENCE_FASTA),
        genome_annotation: None,
        tree_json: tree_json.map(ToOwned::to_owned),
        pathogen_json: o!(PATHOGEN_JSON),
      }]);
      let params = NextcladeParams::from_raw(raw)?.remove(0);
      Nextclade::new(params, vec![], &NextcladeInputParamsOptional::default())
    }
  }

  use helpers::create_nextclade;
}
