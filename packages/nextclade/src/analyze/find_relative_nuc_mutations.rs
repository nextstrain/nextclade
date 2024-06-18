use crate::analyze::aa_changes_find_for_cds::AaChangesParams;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_private_aa_mutations::{find_private_aa_mutations, PrivateAaMutations};
use crate::analyze::find_private_nuc_mutations::{
  find_private_nuc_mutations, FindPrivateNucMutationsParams, PrivateNucMutations,
};
use crate::analyze::letter_ranges::CdsAaRange;
use crate::analyze::nuc_alignment::NucAlignment;
use crate::coord::range::AaRefRange;
use crate::gene::gene_map::GeneMap;
use crate::translate::translate_genes::Translation;
use crate::tree::tree::{AuspiceGraph, AuspiceRefNode, AuspiceRefNodeSearchCriteria};
use crate::tree::tree_find_ancestors_of_interest::{
  AncestralSearchMatch, AncestralSearchResult, AncestralSearchResultForCriteria,
};
use eyre::{eyre, Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeNucMutations {
  pub search: AncestralSearchResult,
  pub result: Option<RelativeNucMutationsResult>,
}

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

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeAaMutations {
  pub ref_node: AuspiceRefNode,
  pub muts: BTreeMap<String, PrivateAaMutations>,
}

pub fn find_relative_aa_mutations(
  graph: &AuspiceGraph,
  clade: &Option<String>,
  clade_node_attrs: &BTreeMap<String, String>,
  aa_substitutions: &[AaSub],
  aa_deletions: &[AaDel],
  aa_unknowns: &[CdsAaRange],
  aa_unsequenced_ranges: &BTreeMap<String, Vec<AaRefRange>>,
  ref_peptides: &Translation,
  qry_peptides: &Translation,
  gene_map: &GeneMap,
  aln: &NucAlignment,
  params: &AaChangesParams,
) -> Result<Vec<RelativeAaMutations>, Report> {
  let ref_nodes = filter_ref_nodes(graph, clade, clade_node_attrs);

  ref_nodes
    .iter()
    .map(|&ref_node| -> Result<_, Report> {
      let node = graph
        .iter_nodes()
        .find(|node| node.payload().name == ref_node.name)
        .ok_or_else(|| eyre!("Unable to find reference node on the tree: '{}'", &ref_node.name))?;

      let muts = find_private_aa_mutations(
        node.payload(),
        aa_substitutions,
        aa_deletions,
        aa_unknowns,
        aa_unsequenced_ranges,
        ref_peptides,
        qry_peptides,
        gene_map,
        aln,
        params,
      )?;

      Ok(RelativeAaMutations {
        ref_node: ref_node.to_owned(),
        muts,
      })
    })
    .collect::<Result<Vec<RelativeAaMutations>, Report>>()
    .wrap_err("When calling amino acid mutations relative to a reference node")
}

/// Take only ref nodes which are relevant for this sample, according to the node's include list
pub fn filter_ref_nodes<'a>(
  graph: &'a AuspiceGraph,
  clade: &Option<String>,
  clade_node_attrs: &BTreeMap<String, String>,
) -> Vec<&'a AuspiceRefNode> {
  graph
    .data
    .meta
    .extensions
    .nextclade
    .reference_nodes
    .iter()
    .filter(|node| {
      node.include.iter().all(|(key, includes)| {
        let curr_value = if key == "clade" {
          clade.as_deref().unwrap_or("")
        } else {
          clade_node_attrs.get(key).map_or("", String::as_str)
        };
        includes.iter().any(|include_value| include_value == curr_value)
      })
    })
    .collect()
}
