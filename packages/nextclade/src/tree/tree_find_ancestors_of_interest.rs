use crate::graph::node::{GraphNodeKey, Node};
use crate::graph::search::{graph_find_backwards_first, graph_find_backwards_last};
use crate::io::json::{json_stringify, JsonPretty};
use crate::tree::tree::{
  AuspiceGraph, AuspiceGraphNodePayload, AuspiceNodeCriterion, AuspiceNodeSearchAlgo, AuspiceRefNodeCriterion,
  AuspiceRefNodeSearchCriteria, AuspiceRefNodeSearchDesc, AuspiceRefNodesDesc,
};
use crate::utils::string::{format_list, Indent};
use eyre::Report;
use itertools::Itertools;
use log::warn;
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
  pub result: Option<AncestralSearchResultForCriteria>,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
pub struct AncestralSearchResultForCriteria {
  pub criterion: AuspiceRefNodeSearchCriteria,

  #[serde(rename = "match")]
  #[schemars(rename = "match")]
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub r#match: Option<AncestralSearchMatch>,
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
        .map(|criterion| {
          let qry_node = graph.get_node(nearest_node_key)?;

          // Proceed only if at least ONE OF the query criteria is met
          let qry_is_ok = criterion
            .qry
            .iter()
            .any(|criteria_qry| is_qry_match(qry_node, criteria_qry));

          if !qry_is_ok {
            return Ok(AncestralSearchResultForCriteria {
              criterion: criterion.clone(),
              r#match: None,
            });
          }

          let results = criterion
            .node
            .iter()
            .filter_map(|criteria_node| find_node(graph, nearest_node_key, criteria_node).transpose())
            .collect::<Result<Vec<AncestralSearchMatch>, Report>>()?;

          if results.len() > 1 {
            let msg_items = results
              .iter()
              .map(|result| {
                Ok(format!(
                  "match: '{}', criteria: '{}'",
                  json_stringify(result, JsonPretty(false))?,
                  json_stringify(criterion, JsonPretty(false))?
                ))
              })
              .collect::<Result<Vec<String>, Report>>()?
              .into_iter();

            warn!(
              "Found multiple matches for ref nodes of interest for the same criteria:\n{}\n\
              This might mean that the dataset is configured incorrectly. \
              Will take only the first match into account.\n",
              format_list(Indent::default(), msg_items)
            );
          }

          Ok(AncestralSearchResultForCriteria {
            criterion: criterion.clone(),
            r#match: results.first().cloned(),
          })
        })
        .collect::<Result<Vec<AncestralSearchResultForCriteria>, Report>>()?;

      let non_empty_results = results.into_iter().filter(|res| res.r#match.is_some()).collect_vec();

      if non_empty_results.len() > 1 {
        let msg_items = non_empty_results
          .iter()
          .filter_map(|r| r.r#match.as_ref().map(|r#match| (r#match, &r.criterion)))
          .map(|(r#match, criteria)| {
            Ok(format!(
              "match: '{}', criteria: '{}'",
              json_stringify(r#match, JsonPretty(false))?,
              json_stringify(criteria, JsonPretty(false))?
            ))
          })
          .collect::<Result<Vec<String>, Report>>()?
          .into_iter();

        warn!(
          "Found multiple matches for ref nodes of interest for different criteria:\n{}\n\
          This might mean that the dataset is configured incorrectly. \
          Will take only the first match into account.\n",
          format_list(Indent::default(), msg_items)
        );
      }

      Ok(AncestralSearchResult {
        search: search.clone(),
        result: non_empty_results.first().cloned(),
      })
    })
    .collect()
}

fn find_node(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  ref_criterion: &AuspiceRefNodeCriterion,
) -> Result<Option<AncestralSearchMatch>, Report> {
  let criterion = &ref_criterion.criterion;
  match ref_criterion.search_algo {
    AuspiceNodeSearchAlgo::AncestorNearest => {
      graph_find_backwards_first(graph, nearest_node_key, |node| node_matches(node, criterion))
    }
    AuspiceNodeSearchAlgo::AncestorEarliest => {
      graph_find_backwards_last(graph, nearest_node_key, |node| node_matches(node, criterion))
    }
    AuspiceNodeSearchAlgo::Full => Ok(graph.iter_nodes().find_map(|node| node_matches(node, criterion))),
  }
}

fn is_qry_match(node: &Node<AuspiceGraphNodePayload>, criteria: &AuspiceNodeCriterion) -> bool {
  let node = node.payload();

  let res = [
    find_matching_clade(&node.clade(), &criteria.clade).is_some(),
    find_matching_clade_like_attrs(node, &criteria.clade_node_attrs).is_some(),
  ]
  .iter()
  .any(|c| *c);

  res
}

fn node_matches(node: &Node<AuspiceGraphNodePayload>, criteria: &AuspiceNodeCriterion) -> Option<AncestralSearchMatch> {
  let node_key = node.key();
  let node = node.payload();

  // In order to be "found", the ancestral node need to fulfill ONE OR MORE of the following requirements:

  // 1. Name of the candidate node matches at least ONE OF criteria names
  let name = criteria.name.iter().find(|&name| name == &node.name).cloned();

  // 2. Candidate clade matches at least ONE OF the clades in the criteria
  let clade = find_matching_clade(&node.clade(), &criteria.clade);

  // 3. ALL clade-like attribute keys in the criteria are also defined in the candidate node,
  //    AND
  //    for each key, query value matches at least ONE OF the values in the criteria
  let clade_like_attrs = find_matching_clade_like_attrs(node, &criteria.clade_node_attrs);

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

  if result.is_empty() {
    return None;
  }

  // NOTE: Here we chose to treat any missing attributes as a complete mismatch
  (result.len() == anc_attrs.len()).then_some(result)
}
