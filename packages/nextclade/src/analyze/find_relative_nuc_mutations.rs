use crate::analyze::find_private_nuc_mutations::{
  FindPrivateNucMutationsParams, PrivateNucMutations, find_private_nuc_mutations,
};
use crate::tree::tree::AuspiceRefNodeSearchCriteria;
use crate::tree::tree_find_ancestors_of_interest::{
  AncestralSearchMatch, AncestralSearchResult, AncestralSearchResultForCriteria,
};
use eyre::Report;
use serde::{Deserialize, Serialize};

/// Result for a single sequence in the inputs, containing relative nucleotide mutations
#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeNucMutations {
  pub search: AncestralSearchResult,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub result: Option<RelativeNucMutationsResult>,
}

/// Result for a single criterion in the search, containing relative nucleotide mutations
#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeNucMutationsResult {
  pub criterion: AuspiceRefNodeSearchCriteria,
  pub r#match: AncestralSearchMatch,
  pub muts: PrivateNucMutations,
}

pub fn find_relative_nuc_mutations(
  search_results: &[AncestralSearchResult],
  params: &FindPrivateNucMutationsParams,
) -> Result<Vec<RelativeNucMutations>, Report> {
  search_results
    .iter()
    .map(|result| find_relative_nuc_mutations_for_one_node(result, params))
    .collect()
}

fn find_relative_nuc_mutations_for_one_node(
  search: &AncestralSearchResult,
  params: &FindPrivateNucMutationsParams,
) -> Result<RelativeNucMutations, Report> {
  let result = search
    .result
    .as_ref()
    .and_then(|result| find_relative_nuc_mutations_for_one_criterion(result, params).transpose())
    .transpose()?;
  Ok(RelativeNucMutations {
    search: search.to_owned(),
    result,
  })
}

fn find_relative_nuc_mutations_for_one_criterion(
  result: &AncestralSearchResultForCriteria,
  params: &FindPrivateNucMutationsParams,
) -> Result<Option<RelativeNucMutationsResult>, Report> {
  result
    .r#match
    .as_ref()
    .map(|r#match| {
      let node = params.graph.get_node(r#match.node_key)?;
      let muts = find_private_nuc_mutations(node.payload(), params);
      Ok(RelativeNucMutationsResult {
        criterion: result.criterion.clone(),
        r#match: r#match.to_owned(),
        muts,
      })
    })
    .transpose()
}
