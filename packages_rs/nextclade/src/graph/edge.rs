use crate::graph::node::GraphNodeKey;
use core::fmt::Debug;
use core::fmt::{Display, Formatter};
use derive_more::Display;

pub trait GraphEdge: Clone + Debug {}

#[derive(Copy, Clone, Debug, Display, Eq, PartialEq, Ord, PartialOrd, Hash)]
pub struct GraphEdgeKey(usize);

impl GraphEdgeKey {
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

/// Edge representing a connection between two nodes. Relevant data can be
/// stored in the edge atomically. Edge's target and source node's are
/// weak references and can't outlive the nodes they represent.
#[derive(Debug)]
pub struct Edge<E: GraphEdge> {
  key: GraphEdgeKey,
  source: GraphNodeKey,
  target: GraphNodeKey,
  data: E,
}

impl<E: GraphEdge> Edge<E> {
  /// Creates a new edge.
  pub const fn new(key: GraphEdgeKey, source: GraphNodeKey, target: GraphNodeKey, data: E) -> Edge<E> {
    Edge {
      key,
      source,
      target,
      data,
    }
  }

  #[inline]
  pub const fn key(&self) -> GraphEdgeKey {
    self.key
  }

  #[inline]
  pub const fn source(&self) -> GraphNodeKey {
    self.source
  }

  #[inline]
  pub const fn target(&self) -> GraphNodeKey {
    self.target
  }

  #[inline]
  pub const fn payload(&self) -> &E {
    &self.data
  }

  #[inline]
  pub fn payload_mut(&mut self) -> &mut E {
    &mut self.data
  }
}

impl<E: GraphEdge> Display for Edge<E> {
  fn fmt(&self, fmt: &mut Formatter<'_>) -> core::fmt::Result {
    write!(fmt, "{} -> {}", self.source(), self.target())
  }
}
