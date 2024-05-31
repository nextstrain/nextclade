use crate::graph::edge::GraphEdge;
use crate::graph::graph::Graph;
use crate::graph::node::{GraphNode, GraphNodeKey};
use crate::graph::traits::HasDivergence;
use crate::tree::tree::{
  AuspiceGraph, AuspiceGraphEdgePayload, AuspiceGraphMeta, AuspiceTree, AuspiceTreeNode, DivergenceUnits, GraphTempData,
};
use eyre::Report;
use num_traits::Float;

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
