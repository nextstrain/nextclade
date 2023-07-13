use crate::graph::edge::GraphEdge;
use crate::graph::graph::Graph;
use crate::graph::node::{GraphNode, GraphNodeKey};
use eyre::Report;
use itertools::Itertools;
use maplit::hashset;
use std::collections::HashSet;
use std::iter::FusedIterator;

/// Depth-first preorder iterator
#[must_use]
#[derive(Clone)]
pub struct GraphDepthFirstPreorderIterator<'g, N, E, D>
where
  N: GraphNode,
  E: GraphEdge,
{
  graph: &'g Graph<N, E, D>,
  queue: Vec<GraphNodeKey>,
  visited: HashSet<GraphNodeKey>,
}

impl<'g, N, E, D> GraphDepthFirstPreorderIterator<'g, N, E, D>
where
  N: GraphNode,
  E: GraphEdge,
{
  #[inline]
  pub fn new(graph: &'g Graph<N, E, D>) -> Result<Self, Report> {
    Ok(Self {
      graph,
      queue: graph.iter_root_keys().collect_vec(),
      visited: hashset! {},
    })
  }
}

impl<'g, N, E, D> Iterator for GraphDepthFirstPreorderIterator<'g, N, E, D>
where
  N: GraphNode,
  E: GraphEdge,
{
  type Item = &'g N;

  #[inline]
  fn next(&mut self) -> Option<Self::Item> {
    // Skip nodes until a non-visited node is found
    let node_key = loop {
      match self.queue.pop() {
        Some(node_ley) => {
          if !self.visited.contains(&node_ley) {
            break Some(node_ley);
          }
        }
        None => break None,
      }
    };

    node_key.map(|node_key| {
      self.queue.extend(self.graph.iter_child_keys_of_by_key(node_key).rev());
      self.visited.insert(node_key);
      self.graph.get_node(node_key).unwrap().payload()
    })
  }
}

impl<'g, N, E, D> FusedIterator for GraphDepthFirstPreorderIterator<'g, N, E, D>
where
  N: GraphNode,
  E: GraphEdge,
{
}

#[cfg(test)]
mod tests {
  use super::*;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[derive(Clone, Debug)]
  struct Named {
    name: String,
  }

  impl GraphNode for Named {}

  impl GraphEdge for Named {}

  #[rstest]
  #[rustfmt::skip]
  fn traverses_dfs_pre() -> Result<(), Report> {
    let graph = {
      let mut graph = Graph::<Named, Named, ()>::new(());

      let a = graph.add_node(Named { name: "a".to_owned() });
      let b = graph.add_node(Named { name: "b".to_owned() });
      let c = graph.add_node(Named { name: "c".to_owned() });
      let d = graph.add_node(Named { name: "d".to_owned() });
      let e = graph.add_node(Named { name: "e".to_owned() });
      let f = graph.add_node(Named { name: "f".to_owned() });
      let g = graph.add_node(Named { name: "g".to_owned() });

      graph.add_edge(a, b, Named { name: "a -> b".to_owned() })?;
      graph.add_edge(a, c, Named { name: "a -> c".to_owned() })?;
      graph.add_edge(c, d, Named { name: "c -> d".to_owned() })?;
      graph.add_edge(c, e, Named { name: "c -> e".to_owned() })?;
      graph.add_edge(b, f, Named { name: "b -> f".to_owned() })?;
      graph.add_edge(b, g, Named { name: "b -> g".to_owned() })?;

      graph.build()?
    };

    let actual = graph.iter_depth_first_preorder()?.map(|Named{name}| name).collect_vec();
    let expected = vec!["a", "b", "f", "g", "c", "d", "e"];

    assert_eq!(expected, actual);

    Ok(())
  }
}
