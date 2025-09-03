use crate::graph::edge::GraphEdge;
use crate::graph::graph::Graph;
use crate::graph::node::{GraphNode, GraphNodeKey};
use crate::graph::traits::{HasDivergence, HasName};
use crate::io::file::create_file_or_stdout;
use eyre::{Report, WrapErr};
use std::io::Write;
use std::path::Path;

pub fn nwk_write_to_file<N, E, D>(filepath: impl AsRef<Path>, graph: &Graph<N, E, D>) -> Result<(), Report>
where
  N: GraphNode + HasDivergence + HasName,
  E: GraphEdge,
{
  let filepath = filepath.as_ref();
  let file = create_file_or_stdout(filepath)?;
  nwk_write_to_writer(file, graph).wrap_err_with(|| format!("When writing graph to Newick file: {filepath:#?}"))
}

pub fn nwk_write_to_writer<W, N, E, D>(mut writer: W, graph: &Graph<N, E, D>) -> Result<(), Report>
where
  W: Write,
  N: GraphNode + HasDivergence + HasName,
  E: GraphEdge,
{
  Ok(writeln!(writer, "{};", convert_graph_to_nwk_string(graph)?)?)
}

pub fn convert_graph_to_nwk_string<N, E, D>(graph: &Graph<N, E, D>) -> Result<String, Report>
where
  N: GraphNode + HasDivergence + HasName,
  E: GraphEdge,
{
  let root_node_key = graph.get_exactly_one_root()?.key();
  let parent_div = 0.0;
  convert_graph_to_nwk_recursive(graph, root_node_key, parent_div).wrap_err("When converting graph to Newick string")
}

fn convert_graph_to_nwk_recursive<N, E, D>(
  graph: &Graph<N, E, D>,
  node_key: GraphNodeKey,
  parent_div: f64,
) -> Result<String, Report>
where
  N: GraphNode + HasDivergence + HasName,
  E: GraphEdge,
{
  let node = graph.get_node(node_key)?.payload();
  let branch_length = node.divergence() - parent_div;

  Ok(if graph.is_leaf_key(node_key) {
    let name = node.name();
    format!("{name}:{branch_length}")
  } else {
    let children = graph
      .iter_child_keys_of_by_key(node_key)
      .map(|child_key| convert_graph_to_nwk_recursive(graph, child_key, node.divergence()))
      .collect::<Result<Vec<String>, Report>>()?
      .join(",");
    format!("({children}):{branch_length}")
  })
}
