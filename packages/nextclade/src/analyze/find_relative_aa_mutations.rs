use crate::analyze::find_private_aa_mutations::{
  FindPrivateAaMutationsParams, PrivateAaMutations, find_private_aa_mutations,
};
use crate::tree::tree::AuspiceRefNodeSearchCriteria;
use crate::tree::tree_find_ancestors_of_interest::{
  AncestralSearchMatch, AncestralSearchResult, AncestralSearchResultForCriteria,
};
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Amino acid mutations relative to a reference ancestor node found by an ancestral search.
#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeAaMutations {
  /// The ancestral node search configuration and match result
  pub search: AncestralSearchResult,
  /// Amino acid mutations relative to the matched ancestor, absent if no ancestor was found
  #[serde(skip_serializing_if = "Option::is_none")]
  pub result: Option<RelativeAaMutationsResult>,
}

/// Amino acid mutations computed relative to a matched ancestor node, keyed by CDS name.
#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeAaMutationsResult {
  /// The search criterion that matched this ancestor
  pub criterion: AuspiceRefNodeSearchCriteria,
  /// The matched ancestor node
  pub r#match: AncestralSearchMatch,
  /// Private amino acid mutations relative to the ancestor, keyed by CDS name
  pub muts: BTreeMap<String, PrivateAaMutations>,
}

pub fn find_relative_aa_mutations(
  search_results: &[AncestralSearchResult],
  params: &FindPrivateAaMutationsParams,
) -> Result<Vec<RelativeAaMutations>, Report> {
  search_results
    .iter()
    .map(|result| find_relative_aa_mutations_for_one_node(result, params))
    .collect()
}

fn find_relative_aa_mutations_for_one_node(
  search: &AncestralSearchResult,
  params: &FindPrivateAaMutationsParams,
) -> Result<RelativeAaMutations, Report> {
  let result = search
    .result
    .as_ref()
    .and_then(|result| find_relative_aa_mutations_for_one_criterion(result, params).transpose())
    .transpose()?;
  Ok(RelativeAaMutations {
    search: search.to_owned(),
    result,
  })
}

fn find_relative_aa_mutations_for_one_criterion(
  result: &AncestralSearchResultForCriteria,
  params: &FindPrivateAaMutationsParams,
) -> Result<Option<RelativeAaMutationsResult>, Report> {
  result
    .r#match
    .as_ref()
    .map(|r#match| {
      let node = params.graph.get_node(r#match.node_key)?;
      let muts = find_private_aa_mutations(node.payload(), params)?;
      Ok(RelativeAaMutationsResult {
        criterion: result.criterion.clone(),
        r#match: r#match.to_owned(),
        muts,
      })
    })
    .transpose()
}
