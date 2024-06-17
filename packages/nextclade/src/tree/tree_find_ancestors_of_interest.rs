use crate::graph::node::{GraphNodeKey, Node};
use crate::graph::search::{graph_find_backwards_first, graph_find_backwards_last};
use crate::tree::tree::{
  AuspiceGraph, AuspiceGraphNodePayload, AuspiceQryCriterion, AuspiceRefNodeCriterion, AuspiceRefNodeSearchCriteria,
  AuspiceRefNodeSearchDesc, AuspiceRefNodeSearchType, AuspiceRefNodesDesc,
};
use eyre::Report;
use itertools::Itertools;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
pub struct AttrPair {
  pub key: String,
  pub value: String,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
pub struct AncestralSearchResult {
  pub search: AuspiceRefNodeSearchDesc,
  pub results: Vec<AncestralSearchResultForCriteria>,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
pub struct AncestralSearchResultForCriteria {
  pub criteria: AuspiceRefNodeSearchCriteria,
  pub result: Option<AncestralSearchMatch>,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
pub struct AncestralSearchMatch {
  pub node_key: GraphNodeKey,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub name: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub clade: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub clade_like_attrs: Option<Vec<AttrPair>>,
}

/// For a given query sample, find ancestral nodes of interest, as specified by the config
pub fn graph_find_ancestors_of_interest(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  ancestral_search_descs: &AuspiceRefNodesDesc,
) -> Result<Vec<AncestralSearchResult>, Report> {
  ancestral_search_descs
    .search
    .iter()
    .map(|search| {
      let results = search
        .criteria
        .iter()
        .map(|criteria| {
          let qry_node = graph.get_node(nearest_node_key)?.payload();
          let result = is_qry_match(qry_node, &criteria.qry)
            .then(|| find_node(graph, nearest_node_key, &criteria.node))
            .transpose()?
            .flatten();
          Ok(AncestralSearchResultForCriteria {
            criteria: criteria.clone(),
            result,
          })
        })
        .collect::<Result<_, Report>>()?;
      Ok(AncestralSearchResult {
        search: search.clone(),
        results,
      })
    })
    .collect()
}

fn find_node(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  criterion: &AuspiceRefNodeCriterion,
) -> Result<Option<AncestralSearchMatch>, Report> {
  match criterion.search_type {
    AuspiceRefNodeSearchType::AncestorNearest => {
      graph_find_backwards_first(graph, nearest_node_key, |node| node_matches(node, criterion))
    }
    AuspiceRefNodeSearchType::AncestorEarliest => {
      graph_find_backwards_last(graph, nearest_node_key, |node| node_matches(node, criterion))
    }
    AuspiceRefNodeSearchType::Full => Ok(graph.iter_nodes().find_map(|node| node_matches(node, criterion))),
  }
}

const fn is_qry_match(_node: &AuspiceGraphNodePayload, _criterion: &AuspiceQryCriterion) -> bool {
  true
}

fn node_matches(
  node: &Node<AuspiceGraphNodePayload>,
  criteria: &AuspiceRefNodeCriterion,
) -> Option<AncestralSearchMatch> {
  let node_key = node.key();
  let node = node.payload();

  // In order to be "found", the ancestral node need to fulfill ONE OR MORE of the following requirements:

  // 1. Name of the candidate node matches at least ONE OF criteria names
  let name = criteria.names.iter().find(|&name| name == &node.name).cloned();

  // 2. Candidate clade matches at least ONE OF the clades in the criteria
  let clade = find_matching_clade(&node.clade(), &criteria.clades);

  // 3. ALL clade-like attribute keys in the criteria are also defined in the candidate node,
  //    AND
  //    for each key, query value matches at least ONE OF the values in the criteria
  let clade_like_attrs = find_matching_clade_like_attrs(node, &criteria.clade_like_attrs);

  match (name, clade, clade_like_attrs) {
    // Nothing matched
    (None, None, None) => None,

    // At least one matched
    (name, clade, clade_like_attrs) => Some(AncestralSearchMatch {
      node_key,
      name,
      clade,
      clade_like_attrs,
    }),
  }
}

fn find_matching_clade(qry_clade: &Option<String>, anc_clades: &[String]) -> Option<String> {
  if anc_clades.is_empty() {
    return None;
  }

  qry_clade
    .as_ref()
    .and_then(|clade| anc_clades.iter().find(|anc_clade| *anc_clade == clade))
    .map(String::to_owned)
}

fn find_matching_clade_like_attrs(
  node: &AuspiceGraphNodePayload,
  anc_attrs: &BTreeMap<String, Vec<String>>,
) -> Option<Vec<AttrPair>> {
  // ALL given ancestral attribute keys must have...
  let result = anc_attrs
    .iter()
    .filter_map(|(key, anc_vals)| {
      // ... at least ONE OF the values matching in query.
      node
        .get_clade_node_attr(key)
        .and_then(|qry_val| anc_vals.iter().find(|anc_val| *anc_val == qry_val))
        .map(|value| AttrPair {
          key: key.to_owned(),
          value: value.to_owned(),
        })
    })
    .collect_vec();

  // NOTE: Here we chose to treat any missing attributes as a complete mismatch
  (result.len() == anc_attrs.len()).then_some(result)
}
