use crate::graph::node::GraphNodeKey;
use crate::make_internal_report;
use crate::tree::tree::{AuspiceGraph, AuspiceTree, AuspiceTreeNode};
use eyre::Report;
use std::collections::BTreeMap;

pub fn convert_graph_to_auspice_tree(graph: &AuspiceGraph) -> Result<AuspiceTree, Report> {
  // Convert all graph nodes to Auspice format in advance, and map graph keys to corresponding Auspice nodes.
  // At this point we leave `children` arrays empty and we will fill them during traversal.
  let mut new_nodes: BTreeMap<GraphNodeKey, AuspiceTreeNode> = graph
    .iter_nodes()
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
    if !visited {
      // Not visited yet: we are going forward. Explore child nodes.

      stack.push((node_key, true));

      let children = graph
        .iter_child_keys_of_by_key(node_key)
        .map(|child_key| (child_key, false));

      stack.extend(children);
    } else {
      // Already visited before: we are done with child nodes and are returning back.
      // Finalize this node: move child nodes from the map into new node's `children` array.
      let new_children = graph
        .iter_child_keys_of_by_key(node_key)
        .map(|child_key| {
          new_nodes
            .remove(&child_key)
            .ok_or_else(|| make_internal_report!("Node '{child_key}' is expected, but not found"))
        })
        .collect::<Result<Vec<AuspiceTreeNode>, Report>>()?;

      let new_node = new_nodes
        .get_mut(&node_key)
        .ok_or_else(|| make_internal_report!("Node '{node_key}' is expected, but not found"))?;

      new_node.children = new_children;
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

#[cfg(test)]
mod tests {
  use super::*;
  use crate::io::json::{JsonPretty, json_stringify};
  use crate::o;
  use crate::tree::tree::{
    AuspiceGraphEdgePayload, AuspiceGraphMeta, AuspiceGraphNodePayload, AuspiceTreeMeta, TreeBranchAttrs, TreeNodeAttrs,
  };
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
