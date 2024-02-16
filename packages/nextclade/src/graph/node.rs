use crate::graph::edge::GraphEdgeKey;
use crate::io::json::is_json_value_null;
use core::fmt::{Debug};
use derive_more::Display;
use schemars::gen::SchemaGenerator;
use schemars::schema::Schema;
use schemars::JsonSchema;
use serde::{Deserialize, Deserializer, Serialize, Serializer};

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

impl<'de> Deserialize<'de> for GraphNodeKey {
  fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
    let i = u64::deserialize(deserializer)?;
    Ok(GraphNodeKey::new(i as usize))
  }
}

impl Serialize for GraphNodeKey {
  fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
  where
    Ser: Serializer,
  {
    serializer.serialize_u64(self.0 as u64)
  }
}

impl JsonSchema for GraphNodeKey {
  fn schema_name() -> String {
    "GraphNodeKey".to_owned()
  }

  fn json_schema(gen: &mut SchemaGenerator) -> Schema {
    gen.subschema_for::<usize>()
  }
}

/// Internal representation of a node in a graph
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
pub struct Node<N: GraphNode> {
  key: GraphNodeKey,
  #[serde(skip_serializing_if = "is_json_value_null")]
  data: N,
  outbound_edges: Vec<GraphEdgeKey>,
  inbound_edges: Vec<GraphEdgeKey>,
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
}
