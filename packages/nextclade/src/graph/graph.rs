use crate::graph::edge::{Edge, GraphEdge, GraphEdgeKey};
use crate::graph::node::{GraphNode, GraphNodeKey, Node};
use crate::graph::traits::HasDivergence;
use crate::io::json::is_json_value_null;
use crate::tree::tree::{
  AuspiceGraph, AuspiceGraphEdgePayload, AuspiceGraphMeta, AuspiceGraphNodePayload, AuspiceTree, AuspiceTreeNode,
  DivergenceUnits, GraphTempData,
};
use crate::{make_error, make_internal_error, make_internal_report};
use eyre::{eyre, ContextCompat, Report, WrapErr};
use itertools::Itertools;
use num_traits::Float;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashMap};

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[allow(clippy::partial_pub_fields)]
pub struct Graph<N, E, D>
where
  N: GraphNode,
  E: GraphEdge,
{
  nodes: Vec<Node<N>>,
  edges: Vec<Edge<E>>,
  #[serde(skip)]
  roots: Vec<GraphNodeKey>,
  #[serde(skip)]
  leaves: Vec<GraphNodeKey>,
  #[serde(skip_serializing_if = "is_json_value_null")]
  pub data: D,
  #[serde(flatten)]
  other: serde_json::Value,
}

impl<N, E, D> Graph<N, E, D>
where
  N: GraphNode,
  E: GraphEdge,
{
  pub fn new(meta: D) -> Self {
    Self {
      nodes: Vec::new(),
      edges: Vec::new(),
      roots: vec![],
      leaves: vec![],
      data: meta,
      other: serde_json::Value::default(),
    }
  }

  pub fn get_exactly_one_root(&self) -> Result<&Node<N>, Report> {
    if let &[one] = self.roots.as_slice() {
      self.get_node(one)
    } else {
      make_internal_error!(
        "Only trees with exactly one root are currently supported, but found '{}'",
        self.roots.len()
      )
    }
  }

  pub fn get_exactly_one_root_mut(&mut self) -> Result<&mut Node<N>, Report> {
    if let &[one] = self.roots.as_slice() {
      self.get_node_mut(one)
    } else {
      make_internal_error!(
        "Only trees with exactly one root are currently supported, but found '{}'",
        self.roots.len()
      )
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
    let node = self.get_node(node_key).unwrap(); // FIXME
    self.parent_key_of(node)
  }

  /// Retrieve parent of a given node
  ///
  /// Assumes there is always only 0 or 1 parents
  pub fn parent_of<'n>(&'n self, node: &'n Node<N>) -> Option<&Node<N>> {
    self
      .parent_key_of(node)
      .map(|parent_key| self.get_node_or_crash(parent_key))
  }

  /// Retrieve parent node of a node given its ID
  ///
  /// Assumes there is always only 0 or 1 parents
  pub fn parent_of_by_key(&self, node_key: GraphNodeKey) -> Option<&Node<N>> {
    self
      .parent_key_of_by_key(node_key)
      .map(|parent_key| self.get_node_or_crash(parent_key))
  }

  /// Retrieve keys of parent nodes of a given node.
  pub fn iter_parent_keys_of<'n>(&'n self, node: &'n Node<N>) -> impl DoubleEndedIterator<Item = GraphNodeKey> + '_ {
    // Parents are the source nodes of inbound edges
    node
      .inbound()
      .iter()
      .filter_map(
        |edge_key| self.get_edge(*edge_key).ok(), // FIXME: ignores errors
      )
      .map(Edge::source)
  }

  /// Retrieve keys of child nodes of a given node.
  pub fn iter_child_keys_of<'n>(&'n self, node: &'n Node<N>) -> impl DoubleEndedIterator<Item = GraphNodeKey> + '_ {
    // Children are the target nodes of outbound edges
    node
      .outbound()
      .iter()
      .filter_map(
        |edge_key| self.get_edge(*edge_key).ok(), // FIXME: ignores errors
      )
      .map(Edge::target)
  }

  pub fn iter_child_keys_of_by_key(
    &self,
    node_key: GraphNodeKey,
  ) -> impl DoubleEndedIterator<Item = GraphNodeKey> + '_ {
    let node = self.get_node(node_key).unwrap();
    self.iter_child_keys_of(node)
  }

  /// Retrieve child nodes of a given node.
  pub fn iter_children_of<'n>(&'n self, node: &'n Node<N>) -> impl DoubleEndedIterator<Item = &Node<N>> {
    self
      .iter_child_keys_of(node)
      .map(|child_key| self.get_node_or_crash(child_key))
  }

  /// Retrieve child nodes of a node, given its key
  pub fn iter_children_of_by_key(&self, node_key: GraphNodeKey) -> impl DoubleEndedIterator<Item = &Node<N>> {
    self
      .iter_child_keys_of_by_key(node_key)
      .map(|child_key| self.get_node_or_crash(child_key))
  }

  pub fn get_node(&self, node_key: GraphNodeKey) -> Result<&Node<N>, Report> {
    self
      .nodes
      .get(node_key.as_usize())
      .ok_or_else(|| make_internal_report!("Node with id '{node_key}' expected to exist, but not found"))
  }

  fn get_node_or_crash(&self, node_key: GraphNodeKey) -> &Node<N> {
    self.get_node(node_key).unwrap()
  }

  pub fn get_node_mut(&mut self, node_key: GraphNodeKey) -> Result<&mut Node<N>, Report> {
    self
      .nodes
      .get_mut(node_key.as_usize())
      .ok_or_else(|| make_internal_report!("Node with id '{node_key}' expected to exist, but not found"))
  }

  pub fn get_edge(&self, edge_key: GraphEdgeKey) -> Result<&Edge<E>, Report> {
    self
      .edges
      .get(edge_key.as_usize())
      .ok_or_else(|| make_internal_report!("Edge with id '{edge_key}' expected to exist, but not found"))
  }

  pub fn get_edge_mut(&mut self, edge_key: GraphEdgeKey) -> Result<&mut Edge<E>, Report> {
    self
      .edges
      .get_mut(edge_key.as_usize())
      .ok_or_else(|| make_internal_report!("Edge with id '{edge_key}' expected to exist, but not found"))
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

  /// Iterate nodes in unspecified order
  #[inline]
  pub fn iter_nodes(&self) -> impl Iterator<Item = &Node<N>> + '_ {
    self.nodes.iter()
  }

  /// Iterate nodes in unspecified order. Mutable version.
  #[inline]
  pub fn iter_nodes_mut(&mut self) -> impl Iterator<Item = &mut Node<N>> + '_ {
    self.nodes.iter_mut()
  }

  /// Iterate node payloads in unspecified order.
  #[inline]
  pub fn iter_node_payloads(&self) -> impl Iterator<Item = &N> + '_ {
    self.nodes.iter().map(Node::payload)
  }

  /// Iterate node payloads in unspecified order. Mutable version.
  #[inline]
  pub fn iter_node_payloads_mut(&mut self) -> impl Iterator<Item = &mut N> + '_ {
    self.nodes.iter_mut().map(Node::payload_mut)
  }

  // /// Iterate nodes in depth-first preorder fashion.
  // #[inline]
  // pub fn iter_depth_first_preorder(&self) -> Result<GraphDepthFirstPreorderIterator<'_, N, E, D>, Report> {
  //   GraphDepthFirstPreorderIterator::new(self)
  // }

  #[inline]
  pub fn iter_roots(&self) -> impl Iterator<Item = &Node<N>> + '_ {
    self.roots.iter().filter_map(
      |idx| self.get_node(*idx).ok(), // FIXME: ignores errors
    )
  }

  #[inline]
  pub fn iter_root_keys(&self) -> impl Iterator<Item = GraphNodeKey> + '_ {
    self.roots.iter().copied()
  }

  // FIXME
  //
  // #[inline]
  // pub fn iter_roots_mut(&mut self) -> impl Iterator<Item = &mut Node<N>> + '_ {
  //   self.roots.iter_mut().filter_map(|idx| self.get_node_mut(*idx))
  // }

  #[inline]
  pub fn iter_leaves(&self) -> impl Iterator<Item = &Node<N>> + '_ {
    self.leaves.iter().filter_map(
      |idx| self.get_node(*idx).ok(), // FIXME: ignores errors
    )
  }

  pub fn is_leaf_key(&self, key: GraphNodeKey) -> bool {
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
        .wrap_err_with(|| format!("When adding a graph edge {source_key}->{target_key}"))?;

      let already_connected = source
        .outbound()
        .iter()
        .any(|edge| self.get_edge(*edge).unwrap().target() == target_key);

      if already_connected {
        return make_error!("When adding a graph edge {source_key}->{target_key}: Nodes {source_key} and {target_key} are already connected.");
      }

      self.edges.push(new_edge);
    }

    // Check if source is a leaf, if so remove from leaves
    if self.is_leaf_key(source_key) {
      self.leaves.retain(|&x| x != source_key);
    }

    {
      let source = self
        .get_node_mut(source_key)
        .wrap_err_with(|| format!("When adding a graph edge {source_key}->{target_key}"))?;
      source.outbound_mut().push(edge_key);
    }
    {
      let target = self
        .get_node_mut(target_key)
        .wrap_err_with(|| format!("When adding a graph edge {source_key}->{target_key}"))?;
      target.inbound_mut().push(edge_key);
    }
    Ok(())
  }

  pub fn remove_edge(&mut self, edge_key: GraphEdgeKey) -> Result<&Edge<E>, Report> {
    // Remove edge from source.outbound_edges
    {
      let source_key = self
        .get_edge(edge_key)
        .wrap_err_with(|| format!("When removing edge {edge_key}"))?
        .source();

      let source = self
        .get_node_mut(source_key)
        .wrap_err_with(|| format!("When removing edge {edge_key}"))?;

      source.outbound_mut().retain(|&x| x != edge_key);
    }

    // Remove edge from target.inbound_edges
    {
      let target_key = self
        .get_edge(edge_key)
        .wrap_err_with(|| format!("When removing edge {edge_key}"))?
        .target();

      let target = self
        .get_node_mut(target_key)
        .wrap_err_with(|| format!("When removing edge {edge_key}"))?;

      target.inbound_mut().retain(|&x| x != edge_key);
    }

    self
      .get_edge(edge_key)
      .wrap_err_with(|| format!("When removing edge {edge_key}"))
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
      .wrap_err_with(|| format!("When inserting a graph node {new_node_key} before node {target_node_key}"))?;

    match insert_before.inbound() {
      [] => {
        // This was a root node. It has no inbound edges, so no edges need to be removed.
        // The newly inserted node becomes a new root
        self.add_edge(new_node_key, target_node_key, edge_payload_right)?;
        Ok(())
      }
      [edge_key] => {
        // This was an internal or leaf node. First we remove inbound edge.
        let edge = self.remove_edge(*edge_key)?;

        // Add left edge: from parent to new node
        let parent_node_key = edge.source();
        self.add_edge(parent_node_key, new_node_key, edge_payload_left)?;

        // Add right edge: from new node to the insertion target node
        self.add_edge(new_node_key, target_node_key, edge_payload_right)?;

        Ok(())
      }
      _ => make_internal_error!("Multiple parent nodes are not supported")
        .wrap_err_with(|| format!("When inserting a graph node {new_node_key} before node {target_node_key}")),
    }?;

    self.build_ref()?;

    Ok(new_node_key)
  }

  pub fn build_ref(&mut self) -> Result<(), Report> {
    self.roots = self
      .nodes
      .iter()
      .filter(|node| node.is_root())
      .map(Node::key)
      .collect_vec();

    self.leaves = self
      .nodes
      .iter()
      .filter(|node| node.is_leaf())
      .map(Node::key)
      .collect_vec();

    Ok(())
  }

  pub fn build(mut self) -> Result<Graph<N, E, D>, Report> {
    self.build_ref()?;
    Ok(self)
  }

  pub fn get_ladderize_map(&self) -> Result<HashMap<GraphNodeKey, Vec<GraphEdgeKey>>, Report> {
    let root = self.get_exactly_one_root()?;
    let mut terminal_count_map = HashMap::<GraphNodeKey, usize>::new();
    self.get_terminal_number_map_recursive(root.key(), &mut terminal_count_map)?;
    let mut new_edge_order_map = HashMap::<GraphNodeKey, Vec<GraphEdgeKey>>::new();
    self.get_ladderize_map_recursive(root.key(), &terminal_count_map, &mut new_edge_order_map)?;
    Ok(new_edge_order_map)
  }

  pub fn get_terminal_number_map_recursive(
    &self,
    node_key: GraphNodeKey,
    terminal_count_map: &mut HashMap<GraphNodeKey, usize>,
  ) -> Result<(), Report> {
    let node = self.get_node(node_key).wrap_err("When preparing terminal number map")?;

    for child in self.iter_child_keys_of(node) {
      self.get_terminal_number_map_recursive(child, terminal_count_map)?;
    }

    if self.is_leaf_key(node_key) {
      terminal_count_map.insert(node_key, 1);
    } else {
      let mut num_terminals = 0;
      for child in self.iter_child_keys_of(node) {
        let child_terminals = terminal_count_map.get(&child).unwrap();
        num_terminals += child_terminals;
      }
      terminal_count_map.insert(node_key, num_terminals);
    }

    Ok(())
  }

  pub fn get_ladderize_map_recursive(
    &self,
    node_key: GraphNodeKey,
    terminal_count_map: &HashMap<GraphNodeKey, usize>,
    new_edge_order_map: &mut HashMap<GraphNodeKey, Vec<GraphEdgeKey>>,
  ) -> Result<(), Report> {
    let node = self.get_node(node_key).wrap_err("When preparing ladderize map")?;

    let pre_outbound_order = node.outbound().iter().copied().collect_vec();
    let order_outbound_nodes = pre_outbound_order
      .iter()
      .map(|edge_key| self.get_edge(*edge_key).expect("Node not found").target())
      .map(|node_key| terminal_count_map.get(&node_key).expect("Node not found"))
      .collect_vec();

    let mut zipped = pre_outbound_order
      .into_iter()
      .zip(order_outbound_nodes)
      .collect::<Vec<_>>();
    zipped.sort_by(|&(_, a), &(_, b)| a.cmp(b));

    let sorted_outbound: Vec<GraphEdgeKey> = zipped.into_iter().map(|(a, _)| a).collect();
    new_edge_order_map.insert(node_key, sorted_outbound);

    for child in self.iter_child_keys_of(node) {
      self.get_ladderize_map_recursive(child, terminal_count_map, new_edge_order_map)?;
    }

    Ok(())
  }

  pub fn ladderize_tree(&mut self) -> Result<(), Report> {
    let new_edge_order_map = self.get_ladderize_map()?;
    let node_key = self.roots[0];
    self.ladderize_tree_recursive(node_key, &new_edge_order_map)
  }

  fn ladderize_tree_recursive(
    &mut self,
    node_key: GraphNodeKey,
    new_edge_order_map: &HashMap<GraphNodeKey, Vec<GraphEdgeKey>>,
  ) -> Result<(), Report> {
    let node = self
      .get_node_mut(node_key)
      .wrap_err_with(|| eyre!("Node with key {node_key} not found in graph"))?;

    let new_edge_order = new_edge_order_map
      .get(&node_key)
      .wrap_err_with(|| eyre!("Node with key {node_key} not found in edge order map"))?;

    node.outbound_mut().clear();
    for edge_key in new_edge_order {
      node.outbound_mut().push(*edge_key);
    }
    for edge_key in new_edge_order {
      self.ladderize_tree_recursive(
        self.get_edge(*edge_key).expect("Edge not found").target(),
        new_edge_order_map,
      )?;
    }

    Ok(())
  }
}

impl Graph<AuspiceGraphNodePayload, AuspiceGraphEdgePayload, AuspiceGraphMeta> {
  pub fn to_auspice_tree(&self) -> Result<AuspiceTree, Report> {
    convert_graph_to_auspice_tree(self)
  }

  pub fn from_auspice_tree(tree: AuspiceTree) -> Result<AuspiceGraph, Report> {
    convert_auspice_tree_to_graph(tree)
  }
}

pub fn convert_graph_to_auspice_tree(graph: &AuspiceGraph) -> Result<AuspiceTree, Report> {
  // Convert all graph nodes to Auspice format in advance, and map graph keys to corresponding Auspice nodes.
  // At this point we leave `children` arrays empty and we will fill them during traversal.
  let mut new_nodes: BTreeMap<GraphNodeKey, AuspiceTreeNode> = graph
    .nodes
    .iter()
    .map(|node| {
      (
        node.key(),
        AuspiceTreeNode::from_graph_node_payload(node.payload(), vec![]),
      )
    })
    .collect();

  // Traverse post-order
  let root = graph.get_exactly_one_root()?;
  let mut stack = vec![(root.key(), false)];
  while let Some((node_key, visited)) = stack.pop() {
    if visited {
      // We are done with child nodes and are going backwards.
      // Finalize this node: move child nodes from the map into new node's `children` array.
      let child_keys = graph.iter_child_keys_of_by_key(node_key).collect_vec();
      for child_key in child_keys {
        let new_child = new_nodes
          .remove(&child_key)
          .ok_or_else(|| make_internal_report!("Node '{child_key}' is expected, but not found"))?;

        let new_node = new_nodes
          .get_mut(&node_key)
          .ok_or_else(|| make_internal_report!("Node '{node_key}' is expected, but not found"))?;

        new_node.children.push(new_child);
      }
    } else {
      // We are going forward, exploring child nodes
      stack.push((node_key, true));
      let child_keys = graph.iter_child_keys_of_by_key(node_key).map(||).collect_vec();
      stack.extend()

      for child_key in child_keys {
        stack.push((child_key, false));
      }
    }
  }

  let tree = new_nodes
    .remove(&root.key())
    .ok_or_else(|| make_internal_report!("Root node not found"))?;

  Ok(AuspiceTree {
    version: graph.data.auspice_tree_version.clone(),
    meta: graph.data.meta.clone(),
    tree,
    root_sequence: None,
    other: graph.data.other.clone(),
  })
}

pub fn convert_auspice_tree_to_graph(tree: AuspiceTree) -> Result<AuspiceGraph, Report> {
  let mut graph = AuspiceGraph::new(AuspiceGraphMeta {
    auspice_tree_version: tree.version,
    meta: tree.meta,
    tmp: GraphTempData::default(),
    other: tree.other,
  });

  convert_auspice_tree_to_graph_recursive(&tree.tree, &mut graph)?;
  let mut graph = graph.build()?;

  {
    let max_divergence = get_max_divergence(&graph);
    graph.data.tmp.max_divergence = max_divergence;
    graph.data.tmp.divergence_units = DivergenceUnits::guess_from_max_divergence(max_divergence);
  }

  Ok(graph)
}

fn convert_auspice_tree_to_graph_recursive(
  node: &AuspiceTreeNode,
  graph: &mut AuspiceGraph,
) -> Result<GraphNodeKey, Report> {
  let graph_node_key = graph.add_node(node.into());

  for child in &node.children {
    let graph_child_key = convert_auspice_tree_to_graph_recursive(child, graph)?;
    graph.add_edge(graph_node_key, graph_child_key, AuspiceGraphEdgePayload::new())?;
  }

  Ok(graph_node_key)
}

fn get_max_divergence<N: GraphNode + HasDivergence, E: GraphEdge, D>(graph: &Graph<N, E, D>) -> f64 {
  graph
    .iter_nodes()
    .map(|node| node.payload().divergence())
    .max_by(f64::total_cmp)
    .unwrap_or_else(f64::infinity)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::io::json::{json_stringify, JsonPretty};
  use crate::o;
  use crate::tree::tree::{AuspiceTreeMeta, TreeBranchAttrs, TreeNodeAttrs};
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use serde_json::Value::Null;

  #[test]
  #[allow(clippy::many_single_char_names)]
  fn test_convert_graph_to_auspice_tree() -> Result<(), Report> {
    let graph = {
      let mut graph = AuspiceGraph::new(AuspiceGraphMeta::default());

      //          root
      //           |
      //     a-----+----- b
      //    / \           |
      //   c   d    +-----+-----+
      //   |        |     |     |
      //   h        e     f     g
      //            |     |     |
      //            i     j     k
      //           / \    |
      //          l   m   n

      let root = graph.add_node(AuspiceGraphNodePayload::new("root"));
      let a = graph.add_node(AuspiceGraphNodePayload::new("a"));
      let b = graph.add_node(AuspiceGraphNodePayload::new("b"));
      let c = graph.add_node(AuspiceGraphNodePayload::new("c"));
      let d = graph.add_node(AuspiceGraphNodePayload::new("d"));
      let e = graph.add_node(AuspiceGraphNodePayload::new("e"));
      let f = graph.add_node(AuspiceGraphNodePayload::new("f"));
      let g = graph.add_node(AuspiceGraphNodePayload::new("g"));
      let h = graph.add_node(AuspiceGraphNodePayload::new("h"));
      let i = graph.add_node(AuspiceGraphNodePayload::new("i"));
      let j = graph.add_node(AuspiceGraphNodePayload::new("j"));
      let k = graph.add_node(AuspiceGraphNodePayload::new("k"));
      let l = graph.add_node(AuspiceGraphNodePayload::new("l"));
      let m = graph.add_node(AuspiceGraphNodePayload::new("m"));
      let n = graph.add_node(AuspiceGraphNodePayload::new("n"));

      graph.add_edge(root, a, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(root, b, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(a, c, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(a, d, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(c, h, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(b, e, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(b, f, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(b, g, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(e, i, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(f, j, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(g, k, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(i, l, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(i, m, AuspiceGraphEdgePayload::new())?;
      graph.add_edge(j, n, AuspiceGraphEdgePayload::new())?;

      graph.build()
    }?;

    let tree = convert_graph_to_auspice_tree(&graph)?;

    let expected = AuspiceTree {
      version: None,
      meta: AuspiceTreeMeta::default(),
      tree: AuspiceTreeNode {
        name: o!("root"),
        branch_attrs: TreeBranchAttrs::default(),
        node_attrs: TreeNodeAttrs::default(),
        children: vec![
          AuspiceTreeNode {
            name: o!("a"),
            branch_attrs: TreeBranchAttrs::default(),
            node_attrs: TreeNodeAttrs::default(),
            children: vec![
              AuspiceTreeNode {
                name: o!("c"),
                branch_attrs: TreeBranchAttrs::default(),
                node_attrs: TreeNodeAttrs::default(),
                children: vec![AuspiceTreeNode {
                  name: o!("h"),
                  branch_attrs: TreeBranchAttrs::default(),
                  node_attrs: TreeNodeAttrs::default(),
                  children: vec![],
                  other: Null,
                }],
                other: Null,
              },
              AuspiceTreeNode {
                name: o!("d"),
                branch_attrs: TreeBranchAttrs::default(),
                node_attrs: TreeNodeAttrs::default(),
                children: vec![],
                other: Null,
              },
            ],
            other: Null,
          },
          AuspiceTreeNode {
            name: o!("b"),
            branch_attrs: TreeBranchAttrs::default(),
            node_attrs: TreeNodeAttrs::default(),
            children: vec![
              AuspiceTreeNode {
                name: o!("e"),
                branch_attrs: TreeBranchAttrs::default(),
                node_attrs: TreeNodeAttrs::default(),
                children: vec![AuspiceTreeNode {
                  name: o!("i"),
                  branch_attrs: TreeBranchAttrs::default(),
                  node_attrs: TreeNodeAttrs::default(),
                  children: vec![
                    AuspiceTreeNode {
                      name: o!("l"),
                      branch_attrs: TreeBranchAttrs::default(),
                      node_attrs: TreeNodeAttrs::default(),
                      children: vec![],
                      other: Null,
                    },
                    AuspiceTreeNode {
                      name: o!("m"),
                      branch_attrs: TreeBranchAttrs::default(),
                      node_attrs: TreeNodeAttrs::default(),
                      children: vec![],
                      other: Null,
                    },
                  ],
                  other: Null,
                }],
                other: Null,
              },
              AuspiceTreeNode {
                name: o!("f"),
                branch_attrs: TreeBranchAttrs::default(),
                node_attrs: TreeNodeAttrs::default(),
                children: vec![AuspiceTreeNode {
                  name: o!("j"),
                  branch_attrs: TreeBranchAttrs::default(),
                  node_attrs: TreeNodeAttrs::default(),
                  children: vec![AuspiceTreeNode {
                    name: o!("n"),
                    branch_attrs: TreeBranchAttrs::default(),
                    node_attrs: TreeNodeAttrs::default(),
                    children: vec![],
                    other: Null,
                  }],
                  other: Null,
                }],
                other: Null,
              },
              AuspiceTreeNode {
                name: o!("g"),
                branch_attrs: TreeBranchAttrs::default(),
                node_attrs: TreeNodeAttrs::default(),
                children: vec![AuspiceTreeNode {
                  name: o!("k"),
                  branch_attrs: TreeBranchAttrs::default(),
                  node_attrs: TreeNodeAttrs::default(),
                  children: vec![],
                  other: Null,
                }],
                other: Null,
              },
            ],
            other: Null,
          },
        ],
        other: Null,
      },
      root_sequence: None,
      other: Null,
    };

    assert_eq!(
      json_stringify(&tree, JsonPretty(true))?,
      json_stringify(&expected, JsonPretty(true))?
    );

    Ok(())
  }
}
