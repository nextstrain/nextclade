#[cfg(test)]
mod tests {
  use crate::tree::tree::{AuspiceGraph, AuspiceGraphEdgePayload, AuspiceGraphMeta, AuspiceGraphNodePayload};
  use pretty_assertions::assert_eq;

  #[test]
  fn test_graph_iter_ancestor_keys_inclusive_chain() {
    let mut graph = AuspiceGraph::new(AuspiceGraphMeta::default());
    let root = graph.add_node(AuspiceGraphNodePayload::new("root"));
    let parent = graph.add_node(AuspiceGraphNodePayload::new("parent"));
    let leaf = graph.add_node(AuspiceGraphNodePayload::new("leaf"));
    graph.add_edge(root, parent, AuspiceGraphEdgePayload::new()).unwrap();
    graph.add_edge(parent, leaf, AuspiceGraphEdgePayload::new()).unwrap();

    let actual = graph.iter_ancestor_keys_inclusive(leaf).collect::<Vec<_>>();
    let expected = vec![leaf, parent, root];

    assert_eq!(expected, actual);
  }

  #[test]
  fn test_graph_iter_ancestor_keys_inclusive_root() {
    let mut graph = AuspiceGraph::new(AuspiceGraphMeta::default());
    let root = graph.add_node(AuspiceGraphNodePayload::new("root"));

    let actual = graph.iter_ancestor_keys_inclusive(root).collect::<Vec<_>>();
    let expected = vec![root];

    assert_eq!(expected, actual);
  }
}
