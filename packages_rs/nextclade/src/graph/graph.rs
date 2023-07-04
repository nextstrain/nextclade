use std::collections::HashMap;

use crate::graph::edge::{Edge, GraphEdge, GraphEdgeKey};
use crate::graph::node::{GraphNode, GraphNodeKey, Node};
use crate::tree::tree::{AuspiceGraph, AuspiceTreeEdge, AuspiceTreeNode};
use crate::{make_error, make_internal_error, make_internal_report};
use eyre::{eyre, Report};
use itertools::Itertools;

pub type NodeEdgePair<N, E> = (Node<N>, Edge<E>);
pub type NodeEdgePayloadPair<N, E> = (N, E);

#[derive(Debug)]
pub struct Graph<N, E>
where
  N: GraphNode,
  E: GraphEdge,
{
  nodes: Vec<Node<N>>,
  edges: Vec<Edge<E>>,
  roots: Vec<GraphNodeKey>,
  leaves: Vec<GraphNodeKey>,
}

impl<N, E> Graph<N, E>
where
  N: GraphNode,
  E: GraphEdge,
{
  pub const fn new() -> Self {
    Self {
      nodes: Vec::new(),
      edges: Vec::new(),
      roots: vec![],
      leaves: vec![],
    }
  }

  /// Retrieve ID of parent node, of a given node
  ///
  /// Assumes there is always only 0 or 1 parents
  pub fn parent_key_of<'n>(&'n self, node: &'n Node<N>) -> Option<GraphNodeKey> {
    self.iter_parent_keys_of(node).next()
  }

  /// Retrieve ID of parent node, of a node given its ID
  ///
  /// Assumes there is always only 0 or 1 parents
  pub fn parent_key_of_by_key(&self, node_key: GraphNodeKey) -> Option<GraphNodeKey> {
    let node = self
      .get_node(node_key)
      .ok_or_else(|| make_internal_report!("Node with id '{node_key}' expected to exist, but not found"))
      .unwrap();
    self.parent_key_of(node)
  }

  /// Retrieve keys of parent nodes of a given node.
  pub fn iter_parent_keys_of<'n>(&'n self, node: &'n Node<N>) -> impl Iterator<Item = GraphNodeKey> + '_ {
    // Parents are the source nodes of inbound edges
    node
      .inbound()
      .iter()
      .filter_map(|edge_key| self.get_edge(*edge_key))
      .map(Edge::source)
  }

  /// Retrieve keys of child nodes of a given node.
  pub fn iter_child_keys_of<'n>(&'n self, node: &'n Node<N>) -> impl Iterator<Item = GraphNodeKey> + '_ {
    // Children are the target nodes of outbound edges
    node
      .outbound()
      .iter()
      .filter_map(|edge_key| self.get_edge(*edge_key))
      .map(Edge::target)
  }

  pub fn iter_child_keys_of_by_key(&self, node_key: GraphNodeKey) -> impl Iterator<Item = GraphNodeKey> + '_ {
    let node = self
      .get_node(node_key)
      .ok_or_else(|| make_internal_report!("Node with id '{node_key}' expected to exist, but not found"))
      .unwrap();
    self.iter_child_keys_of(node)
  }

  pub fn get_node(&self, index: GraphNodeKey) -> Option<&Node<N>> {
    self.nodes.get(index.as_usize())
  }

  pub fn get_node_mut(&mut self, index: GraphNodeKey) -> Option<&mut Node<N>> {
    self.nodes.get_mut(index.as_usize())
  }

  pub fn get_edge(&self, index: GraphEdgeKey) -> Option<&Edge<E>> {
    self.edges.get(index.as_usize())
  }

  pub fn get_edge_mut(&mut self, index: GraphEdgeKey) -> Option<&mut Edge<E>> {
    self.edges.get_mut(index.as_usize())
  }

  #[inline]
  pub fn num_nodes(&self) -> usize {
    self.nodes.len()
  }

  #[inline]
  pub fn num_roots(&self) -> usize {
    self.roots.len()
  }

  #[inline]
  pub fn num_leaves(&self) -> usize {
    self.leaves.len()
  }

  #[inline]
  pub fn iter_nodes(&self) -> impl Iterator<Item = &Node<N>> + '_ {
    self.nodes.iter()
  }

  #[inline]
  pub fn iter_nodes_mut(&mut self) -> impl Iterator<Item = &mut Node<N>> + '_ {
    self.nodes.iter_mut()
  }

  #[inline]
  pub fn iter_node_payloads(&self) -> impl Iterator<Item = &N> + '_ {
    self.nodes.iter().map(Node::payload)
  }

  #[inline]
  pub fn iter_node_payloads_mut(&mut self) -> impl Iterator<Item = &mut N> + '_ {
    self.nodes.iter_mut().map(Node::payload_mut)
  }

  #[inline]
  pub fn iter_roots(&self) -> impl Iterator<Item = &Node<N>> + '_ {
    self.roots.iter().filter_map(|idx| self.get_node(*idx))
  }

  // FIXME
  //
  // #[inline]
  // pub fn iter_roots_mut(&mut self) -> impl Iterator<Item = &mut Node<N>> + '_ {
  //   self.roots.iter_mut().filter_map(|idx| self.get_node_mut(*idx))
  // }

  #[inline]
  pub fn iter_leaves(&self) -> impl Iterator<Item = &Node<N>> + '_ {
    self.leaves.iter().filter_map(|idx| self.get_node(*idx))
  }

  pub fn key_in_leaves(&self, key: GraphNodeKey) -> bool {
    self.leaves.contains(&key)
  }

  // FIXME
  //
  // #[inline]
  // pub fn iter_leaves_mut(&mut self) -> impl Iterator<Item = &mut Node<N>> + '_ {
  //   self.leaves.iter_mut().filter_map(|idx| self.get_node_mut(*idx))
  // }

  #[inline]
  pub fn iter_edges(&self) -> impl Iterator<Item = &Edge<E>> + '_ {
    self.edges.iter()
  }

  #[inline]
  pub fn iter_edges_mut(&mut self) -> impl Iterator<Item = &mut Edge<E>> + '_ {
    self.edges.iter_mut()
  }

  pub fn add_node(&mut self, node_payload: N) -> GraphNodeKey {
    let node_key = GraphNodeKey::new(self.nodes.len());
    let node = Node::new(node_key, node_payload);
    //add to leaves if has no outgoing edges
    if node.outbound().is_empty() {
      self.leaves.push(node_key);
    }
    self.nodes.push(node);
    node_key
  }

  /// Add a new edge to the graph.
  pub fn add_edge(
    &mut self,
    source_key: GraphNodeKey,
    target_key: GraphNodeKey,
    edge_payload: E,
  ) -> Result<(), Report> {
    if source_key == target_key {
      return make_error!(
        "When adding a graph edge {source_key}->{target_key}: Attempted to connect node {source_key} to itself."
      );
    }

    let edge_key = GraphEdgeKey::new(self.edges.len());
    let new_edge = Edge::new(edge_key, source_key, target_key, edge_payload);

    {
      let source = self
        .get_node(source_key)
        .ok_or_else(|| eyre!("When adding a graph edge {source_key}->{target_key}: Node {source_key} not found."))?;

      let already_connected = source
        .outbound()
        .iter()
        .any(|edge| self.get_edge(*edge).unwrap().target() == target_key);

      if already_connected {
        return make_error!("When adding a graph edge {source_key}->{target_key}: Nodes {source_key} and {target_key} are already connected.");
      }

      self.edges.push(new_edge);
    }
    //check if source is a leaf, if so remove from leaves
    if self.key_in_leaves(source_key) {
      self.leaves.retain(|&x| x != source_key);
    }

    {
      let source = self
        .get_node_mut(source_key)
        .ok_or_else(|| eyre!("When adding a graph edge {source_key}->{target_key}: Node {source_key} not found."))?;
      source.outbound_mut().push(edge_key);
    }
    {
      let target = self
        .get_node_mut(target_key)
        .ok_or_else(|| eyre!("When adding a graph edge {source_key}->{target_key}: Node {target_key} not found."))?;
      target.inbound_mut().push(edge_key);
    }
    Ok(())
  }

  pub fn remove_edge(&mut self, edge_key: GraphEdgeKey) -> Result<&Edge<E>, Report> {
    //remove edge from source.outbound_edges
    let source_key = self.get_edge(edge_key).unwrap().source();
    let source = self
      .get_node_mut(source_key)
      .ok_or_else(|| eyre!("Error when adding a graph edge {edge_key} "))?;
    source.outbound_mut().retain(|&x| x != edge_key);
    //remove edge from target.inbound_edges
    let target_key = self.get_edge(edge_key).unwrap().target();
    let target = self
      .get_node_mut(target_key)
      .ok_or_else(|| eyre!("Error when adding a graph edge {edge_key} "))?;
    target.inbound_mut().retain(|&x| x != edge_key);

    self
      .get_edge(edge_key)
      .ok_or_else(|| eyre!("Error when removing a graph edge {edge_key} "))
  }

  /// Given a new node ID and insertion target ID, insert a new node between target and the parent of the target
  ///
  /// Assumes there is always 0 or 1 parents.
  ///
  /// Assumes the new node ID points to an existing node. Use `.add_node()` to create a node.
  pub fn insert_node_before(
    &mut self,
    new_node_key: GraphNodeKey,    // New node being inserted.
    target_node_key: GraphNodeKey, // Target of the insertion. New node will be inserted BEFORE this node.
    edge_payload_left: E,
    edge_payload_right: E,
  ) -> Result<GraphNodeKey, Report> {
    let insert_before = self
      .get_node(target_node_key)
      .ok_or_else(|| eyre!("When inserting a graph node: the target node '{target_node_key}' not found."))?;

    match insert_before.inbound() {
      [] => {
        // This was a root node. It has no inbound edges, so no edges need to be removed.
        // The newly inserted node becomes a new root
        self.add_edge(new_node_key, target_node_key, edge_payload_right)?;
        Ok(())
      }
      [edge_key] => {
        // This was an internal or leaf node. First we remove inbound edge.
        let edge = self.remove_edge(*edge_key);
        let parent_node_key = match edge {
          Ok(edge) => edge.source(),
          Err(e) => panic!("Cannot find nearest node: {e:?}"),
        };

        // Add left edge: from parent to new node
        self.add_edge(parent_node_key, new_node_key, edge_payload_left)?;

        // Add right edge: from new node to the insertion target node
        self.add_edge(new_node_key, target_node_key, edge_payload_right)?;

        Ok(())
      }
      _ => make_internal_error!("Multiple parent nodes are not supported"),
    }?;

    self.build_ref()?;

    Ok(new_node_key)
  }

  pub fn build_ref(&mut self) -> Result<(), Report> {
    self.roots = self
      .nodes
      .iter()
      .filter_map(|node| {
        let node = node;
        node.is_root().then(|| node.key())
      })
      .collect_vec();

    self.leaves = self
      .nodes
      .iter()
      .filter_map(|node| {
        let node = node;
        node.is_leaf().then(|| node.key())
      })
      .collect_vec();

    Ok(())
  }

  pub fn build(mut self) -> Result<Graph<N, E>, Report> {
    self.build_ref()?;
    Ok(self)
  }

  pub fn get_ladderize_map(&self) -> Result<HashMap<GraphNodeKey, Vec<GraphEdgeKey>>, Report> {
    let roots = self.iter_roots().collect_vec();
    if roots.len() != 1 {
      return make_internal_error!(
        "Only trees with exactly one root are supported, but found '{}'",
        roots.len()
      );
    }
    let root_index = self.roots[0];
    let mut terminal_count_map = HashMap::<GraphNodeKey, usize>::new();
    self.get_terminal_number_map_recursive(root_index, &mut terminal_count_map);
    let mut new_edge_order_map = HashMap::<GraphNodeKey, Vec<GraphEdgeKey>>::new();
    self.get_ladderize_map_recursive(root_index, &terminal_count_map, &mut new_edge_order_map);
    Ok(new_edge_order_map)
  }

  pub fn get_terminal_number_map_recursive(
    &self,
    node_key: GraphNodeKey,
    terminal_count_map: &mut HashMap<GraphNodeKey, usize>,
  ) {
    let node = self.get_node(node_key).unwrap();
    for child in self.iter_child_keys_of(node) {
      self.get_terminal_number_map_recursive(child, terminal_count_map);
    }
    if self.key_in_leaves(node_key) {
      terminal_count_map.insert(node_key, 1);
    } else {
      let mut num_terminals = 0;
      for child in self.iter_child_keys_of(node) {
        let child_terminals = terminal_count_map.get(&child).unwrap();
        num_terminals += child_terminals;
      }
      terminal_count_map.insert(node_key, num_terminals);
    }
  }

  pub fn get_ladderize_map_recursive(
    &self,
    node_key: GraphNodeKey,
    terminal_count_map: &HashMap<GraphNodeKey, usize>,
    new_edge_order_map: &mut HashMap<GraphNodeKey, Vec<GraphEdgeKey>>,
  ) {
    let node = self.get_node(node_key).unwrap();
    let pre_outbound_order = node.outbound().iter().map(std::clone::Clone::clone).collect_vec();
    let order_outbound_nodes = pre_outbound_order
      .iter()
      .map(|edge_key| self.get_edge(*edge_key).expect("Node not found").target())
      .map(|node_key| terminal_count_map.get(&node_key).expect("Node not found"))
      .collect_vec();
    let mut zipped = pre_outbound_order
      .into_iter()
      .zip(order_outbound_nodes.into_iter())
      .collect::<Vec<_>>();
    zipped.sort_by(|&(_, a), &(_, b)| a.cmp(b));
    let sorted_outbound: Vec<GraphEdgeKey> = zipped.into_iter().map(|(a, _)| a).collect();
    new_edge_order_map.insert(node_key, sorted_outbound);
    for child in self.iter_child_keys_of(node) {
      self.get_ladderize_map_recursive(child, terminal_count_map, new_edge_order_map);
    }
  }

  pub fn ladderize_tree(&mut self) -> Result<(), Report> {
    let new_edge_order_map = self.get_ladderize_map()?;
    let node_key = self.roots[0];
    self.ladderize_tree_recursive(node_key, &new_edge_order_map)?;

    Ok(())
  }

  pub fn ladderize_tree_recursive(
    &mut self,
    node_key: GraphNodeKey,
    new_edge_order_map: &HashMap<GraphNodeKey, Vec<GraphEdgeKey>>,
  ) -> Result<(), Report> {
    let node = self.get_node_mut(node_key).unwrap();
    match new_edge_order_map.get(&node_key) {
      Some(new_edge_order) => {
        node.outbound_mut().clear();
        for edge_key in new_edge_order {
          node.outbound_mut().push(*edge_key);
        }
        for edge_key in new_edge_order {
          self.ladderize_tree_recursive(self.get_edge(*edge_key).unwrap().target(), new_edge_order_map)?;
        }
      }
      None => println!("error in ladderizing tree."),
    }
    Ok(())
  }
}

pub fn convert_graph_to_auspice_tree(graph: &AuspiceGraph) -> Result<AuspiceTreeNode, Report> {
  let roots = graph.iter_roots().collect_vec();
  if roots.len() != 1 {
    return make_internal_error!(
      "Only trees with exactly one root are supported, but found '{}'",
      roots.len()
    );
  }
  let root = roots[0];

  convert_graph_to_auspice_tree_recursive(graph, root)
}

fn convert_graph_to_auspice_tree_recursive(
  graph: &AuspiceGraph,
  node: &Node<AuspiceTreeNode>,
) -> Result<AuspiceTreeNode, Report> {
  let mut payload = node.payload().clone();

  let children = graph
    .iter_child_keys_of(node)
    .map(|child_key| graph.get_node(child_key).expect("Node not found"));

  payload.children = children
    .map(|child| convert_graph_to_auspice_tree_recursive(graph, child))
    .collect::<Result<Vec<AuspiceTreeNode>, Report>>()?;

  Ok(payload)
}