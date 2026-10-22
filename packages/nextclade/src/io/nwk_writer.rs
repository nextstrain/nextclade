use crate::graph::edge::GraphEdge;
use crate::graph::graph::Graph;
use crate::graph::node::{GraphNode, GraphNodeKey};
use crate::graph::traits::{HasDivergence, HasName};
use crate::io::file::create_file_or_stdout;
use eyre::{Report, WrapErr};
use std::borrow::Cow;
use std::io::Write;
use std::path::Path;

pub fn nwk_write_to_file<N, E, D>(filepath: impl AsRef<Path>, graph: &Graph<N, E, D>) -> Result<(), Report>
where
  N: GraphNode + HasDivergence + HasName,
  E: GraphEdge,
{
  let mut file = create_file_or_stdout(filepath)?;
  nwk_write_to_writer(&mut file, graph).wrap_err("When writing graph in Newick format")?;
  file.finish()
}

pub fn nwk_write_to_string<N, E, D>(graph: &Graph<N, E, D>) -> Result<String, Report>
where
  N: GraphNode + HasDivergence + HasName,
  E: GraphEdge,
{
  let mut buffer = Vec::new();
  nwk_write_to_writer(&mut buffer, graph)?;
  Ok(String::from_utf8(buffer)?)
}

pub fn nwk_write_to_writer<W, N, E, D>(mut writer: W, graph: &Graph<N, E, D>) -> Result<(), Report>
where
  W: Write,
  N: GraphNode + HasDivergence + HasName,
  E: GraphEdge,
{
  Ok(writeln!(writer, "{};", convert_graph_to_nwk_string(graph)?)?)
}

fn convert_graph_to_nwk_string<N, E, D>(graph: &Graph<N, E, D>) -> Result<String, Report>
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
    let name = nwk_label(node.name());
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

/// Return a node name as a Newick label. Newick reads whitespace, brackets, quotes, colons, semicolons and commas in an
/// unquoted label as syntax, so a name containing them is written in single quotes, with its single quotes doubled
fn nwk_label(name: &str) -> Cow<'_, str> {
  if name.contains(|c: char| c.is_whitespace() || "()[]':;,".contains(c)) {
    Cow::Owned(format!("'{}'", name.replace('\'', "''")))
  } else {
    Cow::Borrowed(name)
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::plain(               "OY754687",                    "OY754687"                      )]
  #[case::slashes_and_dashes(  "USA/CA-LACPHL-AY03266/2023",  "USA/CA-LACPHL-AY03266/2023"    )]
  #[case::underscore(          "hCoV_19",                     "hCoV_19"                       )]
  #[case::space_and_brackets(  "OV950637 (XL)",               "'OV950637 (XL)'"               )]
  #[case::tab(                 "seq\t1",                      "'seq\t1'"                      )]
  #[case::square_brackets(     "seq[1]",                      "'seq[1]'"                      )]
  #[case::colon(               "seq:1",                       "'seq:1'"                       )]
  #[case::semicolon(           "seq;1",                       "'seq;1'"                       )]
  #[case::comma(               "seq,1",                       "'seq,1'"                       )]
  #[case::single_quote(        "O'Hara",                      "'O''Hara'"                     )]
  #[trace]
  fn test_nwk_write_quotes_tip_names_where_newick_requires(#[case] name: &str, #[case] expected_label: &str) {
    let graph = helpers::graph_with_one_tip(name);
    let actual = nwk_write_to_string(&graph).unwrap();
    assert_eq!(format!("({expected_label}:1.5):0;\n"), actual);
  }

  mod helpers {
    use super::*;

    pub fn graph_with_one_tip(tip_name: &str) -> Graph<TestNode, TestEdge, ()> {
      let mut graph = Graph::new(());
      let root = graph.add_node(TestNode {
        name: "root".to_owned(),
        div: 0.0,
      });
      let tip = graph.add_node(TestNode {
        name: tip_name.to_owned(),
        div: 1.5,
      });
      graph.add_edge(root, tip, TestEdge).unwrap();
      graph.build().unwrap()
    }

    #[derive(Clone, Debug)]
    pub struct TestNode {
      pub name: String,
      pub div: f64,
    }

    impl GraphNode for TestNode {}

    impl HasName for TestNode {
      fn name(&self) -> &str {
        &self.name
      }
    }

    impl HasDivergence for TestNode {
      fn divergence(&self) -> f64 {
        self.div
      }
    }

    #[derive(Clone, Debug)]
    pub struct TestEdge;

    impl GraphEdge for TestEdge {}
  }
}
