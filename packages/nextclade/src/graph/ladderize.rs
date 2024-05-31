use crate::graph::edge::{GraphEdge, GraphEdgeKey};
use crate::graph::graph::Graph;
use crate::graph::node::{GraphNode, GraphNodeKey};
use crate::make_internal_report;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use std::collections::HashMap;

pub fn graph_ladderize<N, E, D>(graph: &mut Graph<N, E, D>) -> Result<(), Report>
where
  N: GraphNode,
  E: GraphEdge,
{
  let new_edge_order_map = get_ladderize_map(graph)?;
  let node_key = graph.get_exactly_one_root()?.key();
  ladderize_graph_recursive(graph, node_key, &new_edge_order_map)
}

fn ladderize_graph_recursive<N, E, D>(
  graph: &mut Graph<N, E, D>,
  node_key: GraphNodeKey,
  new_edge_order_map: &HashMap<GraphNodeKey, Vec<GraphEdgeKey>>,
) -> Result<(), Report>
where
  N: GraphNode,
  E: GraphEdge,
{
  let node = graph
    .get_node_mut(node_key)
    .wrap_err_with(|| make_internal_report!("Node with key {node_key} not found in graph"))?;

  let new_edge_order = new_edge_order_map
    .get(&node_key)
    .ok_or_else(|| make_internal_report!("Node with key {node_key} not found in edge order map"))?;

  node.outbound_mut().clear();
  for edge_key in new_edge_order {
    node.outbound_mut().push(*edge_key);
  }

  for edge_key in new_edge_order {
    ladderize_graph_recursive(
      graph,
      graph.get_edge(*edge_key).expect("Edge not found").target(),
      new_edge_order_map,
    )?;
  }

  Ok(())
}

fn get_ladderize_map<N, E, D>(graph: &Graph<N, E, D>) -> Result<HashMap<GraphNodeKey, Vec<GraphEdgeKey>>, Report>
where
  N: GraphNode,
  E: GraphEdge,
{
  let root = graph.get_exactly_one_root()?;

  let mut terminal_count_map = HashMap::<GraphNodeKey, usize>::new();
  get_terminal_number_map_recursive(graph, root.key(), &mut terminal_count_map)?;

  let mut new_edge_order_map = HashMap::<GraphNodeKey, Vec<GraphEdgeKey>>::new();
  get_ladderize_map_recursive(graph, root.key(), &terminal_count_map, &mut new_edge_order_map)?;

  Ok(new_edge_order_map)
}

fn get_terminal_number_map_recursive<N, E, D>(
  graph: &Graph<N, E, D>,
  node_key: GraphNodeKey,
  terminal_count_map: &mut HashMap<GraphNodeKey, usize>,
) -> Result<(), Report>
where
  N: GraphNode,
  E: GraphEdge,
{
  let node = graph
    .get_node(node_key)
    .wrap_err("When preparing terminal number map")?;

  for child in graph.iter_child_keys_of(node) {
    get_terminal_number_map_recursive(graph, child, terminal_count_map)?;
  }

  if graph.is_leaf_key(node_key) {
    terminal_count_map.insert(node_key, 1);
  } else {
    let mut num_terminals = 0;
    for child in graph.iter_child_keys_of(node) {
      let child_terminals = terminal_count_map.get(&child).unwrap();
      num_terminals += child_terminals;
    }
    terminal_count_map.insert(node_key, num_terminals);
  }

  Ok(())
}

fn get_ladderize_map_recursive<N, E, D>(
  graph: &Graph<N, E, D>,
  node_key: GraphNodeKey,
  terminal_count_map: &HashMap<GraphNodeKey, usize>,
  new_edge_order_map: &mut HashMap<GraphNodeKey, Vec<GraphEdgeKey>>,
) -> Result<(), Report>
where
  N: GraphNode,
  E: GraphEdge,
{
  let node = graph.get_node(node_key).wrap_err("When preparing ladderize map")?;

  let pre_outbound_order = node.outbound().iter().copied().collect_vec();
  let order_outbound_nodes = pre_outbound_order
    .iter()
    .map(|edge_key| graph.get_edge(*edge_key).expect("Node not found").target())
    .map(|node_key| terminal_count_map.get(&node_key).expect("Node not found"))
    .collect_vec();

  let mut zipped = pre_outbound_order
    .into_iter()
    .zip(order_outbound_nodes)
    .collect::<Vec<_>>();
  zipped.sort_by(|&(_, a), &(_, b)| a.cmp(b));

  let sorted_outbound: Vec<GraphEdgeKey> = zipped.into_iter().map(|(a, _)| a).collect();
  new_edge_order_map.insert(node_key, sorted_outbound);

  for child in graph.iter_child_keys_of(node) {
    get_ladderize_map_recursive(graph, child, terminal_count_map, new_edge_order_map)?;
  }

  Ok(())
}
