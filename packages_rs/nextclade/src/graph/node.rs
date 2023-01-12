use crate::graph::edge::GraphEdgeKey;
use core::fmt::{Debug, Display};
use derive_more::Display;

pub trait GraphNode: Clone + Debug {}

#[derive(Copy, Clone, Debug, Default, Display, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct GraphNodeKey(usize);

impl GraphNodeKey {
  #[inline]
  #[must_use]
  pub const fn new(key: usize) -> Self {
    Self(key)
  }

  #[inline]
  #[must_use]
  pub const fn as_usize(self) -> usize {
    self.0
  }
}

/// Internal representation of a node in a graph
#[derive(Debug)]
pub struct Node<N: GraphNode> {
  key: GraphNodeKey,
  data: N,
  outbound_edges: Vec<GraphEdgeKey>,
  inbound_edges: Vec<GraphEdgeKey>,
  is_visited: bool,
}

impl<N> PartialEq<Self> for Node<N>
where
  N: GraphNode,
{
  fn eq(&self, other: &Self) -> bool {
    self.key == other.key
  }
}

impl<N> Node<N>
where
  N: GraphNode,
{
  /// Create a new node.
  #[inline]
  #[must_use]
  pub const fn new(key: GraphNodeKey, data: N) -> Node<N> {
    Self {
      key,
      data,
      outbound_edges: Vec::new(),
      inbound_edges: Vec::new(),
      is_visited: false,
    }
  }

  #[inline]
  #[must_use]
  pub const fn payload(&self) -> &N {
    &self.data
  }

  #[inline]
  #[must_use]
  pub fn payload_mut(&mut self) -> &mut N {
    &mut self.data
  }

  /// Get node key.
  #[inline]
  #[must_use]
  pub const fn key(&self) -> GraphNodeKey {
    self.key
  }

  /// Get node degree i.e. number of outbound edges.
  #[inline]
  #[must_use]
  pub fn degree(&self) -> usize {
    self.outbound().len()
  }

  /// Check if node is a leaf node, i.e. has no outbound edges.
  #[inline]
  #[must_use]
  pub fn is_leaf(&self) -> bool {
    self.outbound().is_empty()
  }

  /// Check if node is a root node, i.e. has no inbound edges.
  #[inline]
  #[must_use]
  pub fn is_root(&self) -> bool {
    self.inbound().is_empty()
  }

  #[inline]
  #[must_use]
  pub fn outbound(&self) -> &[GraphEdgeKey] {
    self.outbound_edges.as_slice()
  }

  #[inline]
  #[must_use]
  pub fn outbound_mut(&mut self) -> &mut Vec<GraphEdgeKey> {
    &mut self.outbound_edges
  }

  #[inline]
  #[must_use]
  pub fn inbound(&self) -> &[GraphEdgeKey] {
    self.inbound_edges.as_slice()
  }

  #[inline]
  #[must_use]
  pub fn inbound_mut(&mut self) -> &mut Vec<GraphEdgeKey> {
    &mut self.inbound_edges
  }

  #[inline]
  #[must_use]
  pub const fn is_visited(&self) -> bool {
    self.is_visited
  }

  #[inline]
  pub fn mark_as_visited(&mut self) {
    self.is_visited = true;
  }

  #[inline]
  pub fn mark_as_not_visited(&mut self) {
    self.is_visited = false;
  }
}
