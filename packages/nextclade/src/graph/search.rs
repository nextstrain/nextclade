use crate::graph::edge::GraphEdge;
use crate::graph::graph::Graph;
use crate::graph::node::{GraphNode, GraphNodeKey, Node};
use crate::utils::collections::take_exactly_one;
use eyre::{Report, WrapErr};

/// Starting from a given node, traverse the graph backwards (against direction of edges) and find the first node
/// which fulfills a given predicate condition, if any
pub fn graph_find_backwards_first<N, E, D, F, R>(
  graph: &Graph<N, E, D>,
  start: GraphNodeKey,
  mut predicate: F,
) -> Result<Option<R>, Report>
where
  N: GraphNode,
  E: GraphEdge,
  F: FnMut(&Node<N>) -> Option<R>,
{
  let current = graph
    .get_node(start)
    .wrap_err("In graph_search_backwards(): When retrieving starting node")?;

  loop {
    let edge_keys = current.inbound();
    if edge_keys.is_empty() {
      return Ok(None);
    }

    let edge = take_exactly_one(edge_keys)
      .wrap_err("In graph_search_backwards(): multiple parent nodes are not currently supported")?;

    let parent_key = graph.get_edge(*edge)?.source();
    let parent = graph
      .get_node(parent_key)
      .wrap_err("In graph_search_backwards(): When retrieving parent node")?;

    let result = predicate(parent);
    if let Some(result) = result {
      return Ok(Some(result));
    }
  }
}

/// Starting from a given node, traverse the graph backwards (against direction of edges) until reaching the root,
/// and return the last node which fulfills a given predicate condition, if any
pub fn graph_find_backwards_last<N, E, D, F, R>(
  graph: &Graph<N, E, D>,
  start: GraphNodeKey,
  mut predicate: F,
) -> Result<Option<R>, Report>
where
  N: GraphNode,
  E: GraphEdge,
  F: FnMut(&Node<N>) -> Option<R>,
{
  let current = graph
    .get_node(start)
    .wrap_err("In graph_search_backwards(): When retrieving starting node")?;

  let mut found = None;

  loop {
    let edge_keys = current.inbound();
    if edge_keys.is_empty() {
      break;
    }

    let edge = take_exactly_one(edge_keys)
      .wrap_err("In graph_search_backwards(): multiple parent nodes are not currently supported")?;

    let parent_key = graph.get_edge(*edge)?.source();
    let parent = graph
      .get_node(parent_key)
      .wrap_err("In graph_search_backwards(): When retrieving parent node")?;

    let result = predicate(parent);
    if let Some(result) = result {
      found = Some(result);
    }
  }

  Ok(found)
}
