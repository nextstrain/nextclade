use crate::graph::node::GraphNodeKey;
use crate::graph::search::graph_find_backwards_last;
use crate::tree::tree::AuspiceGraph;
use eyre::Report;

/// For a given node, find founder of its clade
pub fn graph_find_clade_founder(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  clade: impl AsRef<str>,
) -> Result<GraphNodeKey, Report> {
  let clade = clade.as_ref();
  // Search the earliest ancestor with the same clade
  graph_find_backwards_last(graph, nearest_node_key, |anc_node| {
    let anc_clade = anc_node.payload().clade()?;
    (anc_clade == clade).then_some(anc_node.key())
  })
  .transpose()
  // If no ancestor found, then the node itself is clade founder
  .unwrap_or(Ok(nearest_node_key))
}

/// For a given node, and clade-like attribute, find founder node of its attribute
pub fn graph_find_node_attr_founder(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  attr_key: impl AsRef<str>,
  attr_val: impl AsRef<str>,
) -> Result<GraphNodeKey, Report> {
  // Search the earliest ancestor with the same clade
  graph_find_backwards_last(graph, nearest_node_key, |anc_node| {
    let anc_val = anc_node.payload().get_clade_node_attr(attr_key.as_ref())?;
    (anc_val == attr_val.as_ref()).then_some(anc_node.key())
  })
  .transpose()
  // If no ancestor found, then the node itself is attribute founder
  .unwrap_or(Ok(nearest_node_key))
}
