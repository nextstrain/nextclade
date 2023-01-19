use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::find_private_aa_mutations::PrivateAaMutations;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::nuc_del::NucDelMinimal;
use crate::analyze::nuc_sub::NucSub;
use crate::graph::node::{GraphNodeKey, Node};
use crate::io::nextclade_csv::{
  format_failed_genes, format_missings, format_non_acgtns, format_nuc_deletions, format_pcr_primer_changes,
};
use crate::make_internal_report;
use crate::tree::tree::{
  AuspiceTree, AuspiceTreeEdge, AuspiceTreeNode, TreeBranchAttrs, TreeNodeAttr, TreeNodeAttrs, TreeNodeTempData,
  AUSPICE_UNKNOWN_VALUE,
};
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use assert2::__assert2_impl::print;
use itertools::Itertools;
use serde_json::json;
use std::collections::BTreeMap;

pub fn tree_attach_new_nodes_in_place(tree: &mut AuspiceTree, results: &[NextcladeOutputs]) {
  tree_attach_new_nodes_impl_in_place_recursive(&mut tree.tree, results);
}

pub fn create_new_auspice_node(result: &NextcladeOutputs) -> AuspiceTreeNode {
  let mutations = convert_mutations_to_node_branch_attrs(result);

  let alignment = format!(
    "start: {}, end: {} (score: {})",
    result.alignment_start, result.alignment_end, result.alignment_score
  );

  let (has_pcr_primer_changes, pcr_primer_changes) = if result.total_pcr_primer_changes > 0 {
    (Some(TreeNodeAttr::new("No")), None)
  } else {
    (
      Some(TreeNodeAttr::new("Yes")),
      Some(TreeNodeAttr::new(&format_pcr_primer_changes(
        &result.pcr_primer_changes,
        ", ",
      ))),
    )
  };

  #[allow(clippy::from_iter_instead_of_collect)]
  let other = serde_json::Value::from_iter(
    result
      .custom_node_attributes
      .clone()
      .into_iter()
      .map(|(key, val)| (key, json!({ "value": val }))),
  );

  AuspiceTreeNode {
    name: format!("{}_new", result.seq_name),
    branch_attrs: TreeBranchAttrs {
      mutations,
      other: serde_json::Value::default(),
    },
    node_attrs: TreeNodeAttrs {
      div: Some(result.divergence),
      clade_membership: TreeNodeAttr::new(&result.clade),
      node_type: Some(TreeNodeAttr::new("New")),
      region: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      country: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      division: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      alignment: Some(TreeNodeAttr::new(&alignment)),
      missing: Some(TreeNodeAttr::new(&format_missings(&result.missing, ", "))),
      gaps: Some(TreeNodeAttr::new(&format_nuc_deletions(&result.deletions, ", "))),
      non_acgtns: Some(TreeNodeAttr::new(&format_non_acgtns(&result.non_acgtns, ", "))),
      has_pcr_primer_changes,
      pcr_primer_changes,
      missing_genes: Some(TreeNodeAttr::new(&format_failed_genes(&result.missing_genes, ", "))),
      qc_status: Some(TreeNodeAttr::new(&result.qc.overall_status.to_string())),
      other,
    },
    children: vec![],
    tmp: TreeNodeTempData::default(),
    other: serde_json::Value::default(),
  }
}

use super::tree::AuspiceGraph;

fn join_nuc_sub(
  subst1: &Vec<NucSub>,
  subst2: &Vec<NucSub>
) -> Vec<NucSub> {
  let mut shared_substitutions = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < subst1.len()) && (j < subst2.len()) {
    if subst1[i].pos == subst2[j].pos {
      // position is also mutated in node
      if subst1[i].reff == subst2[j].reff && subst1[i].qry == subst2[j].qry {
        shared_substitutions.push(subst1[i].clone()); // the exact mutation is shared between node and seq
      }
      i += 1;
      j += 1;
    } else if subst1[i].pos < subst2[j].pos {
      i += 1;
    } else {
      j += 1;
    }
  }
  shared_substitutions
}

pub fn get_closest_child(graph: &AuspiceGraph, node_key: usize, result: &NextcladeOutputs) -> Option<(GraphNodeKey, Vec<NucSub>)> {
  let mut closest_child = None;
  let mut closest_child_dist = 0;
  let node = graph.get_node(GraphNodeKey::new(node_key)).expect("Node not found");
  for child_key in graph.iter_child_keys_of(node) {
    let child = graph.get_node(child_key).expect("Node not found");
    let child_mutations = child.payload().tmp.private_mutations.clone();
    let shared_substitutions = join_nuc_sub(&child_mutations, &result.private_nuc_mutations.private_substitutions);
    if shared_substitutions.len() > closest_child_dist {
      closest_child_dist = shared_substitutions.len();
      closest_child = Some((child_key, shared_substitutions));
    }
  }
  closest_child
}

pub fn graph_attach_new_nodes_in_place(graph: &mut AuspiceGraph, results: &[NextcladeOutputs]) {
  // Look for a query sample result for which this node was decided to be nearest
  for result in results {
    let id = result.nearest_node_id;
    //check node exists in tree
    let node = graph
      .get_node(GraphNodeKey::new(id))
      .ok_or_else(|| make_internal_report!("Node with id '{id}' expected to exist, but not found"));

    //check if new seq is in between nearest node and a child of nearest node
    let closest_child_results = get_closest_child(graph, id, result);

    match closest_child_results {
      Some((child_key, new_private_mutations)) => {
        let nearest_node = match node {
          Ok(n) => n.payload().clone(),
          Err(e) => panic!("Cannot find nearest node: {e:?}"),
        };
        let mut new_middle_node: AuspiceTreeNode = nearest_node;
        new_middle_node.tmp.private_mutations = new_private_mutations;
        println!("nearest node : {0}", new_middle_node.name);
        new_middle_node.name = format!("{}_internal", child_key);
        new_middle_node.tmp.id = graph.num_nodes();
        let new_middle_node_key = graph.add_node(new_middle_node);
        println!("Found closest child: {child_key:?}");
        graph.insert_node_before(
          new_middle_node_key,
          child_key,
          AuspiceTreeEdge::new(), // Edge payloads are currently dummy
          AuspiceTreeEdge::new(), // Edge payloads are currently dummy
        ).map_err(|err| println!("{err:?}"))
        .ok();
        println!("Added new node: {new_middle_node_key:?}");
        //middle_node.branch_attrs.mutations = new_private_mutations;
      }
      None => {
        //check if node is terminal
        let (is_terminal, nearest_node) = match node {
          Ok(n) => (n.is_leaf(), n.payload().clone()),
          Err(e) => panic!("Cannot find nearest node: {e:?}"),
        };
        //if nearest_node is terminal create dummy empty terminal node with nearest_node's name (so that nearest_node) stays a terminal)
        //and attach new node to nearest_node (same id, now called {name}_parent)
        if is_terminal {
          let target = graph.get_node_mut(GraphNodeKey::new(id)).unwrap().payload_mut();
          target.name = format!("{}_parent", target.name);

          let mut new_terminal_node = nearest_node;
          new_terminal_node.branch_attrs.mutations.clear();
          new_terminal_node.branch_attrs.other = serde_json::Value::default();
          new_terminal_node.tmp.private_mutations = Vec::new();
          new_terminal_node.tmp.id = graph.num_nodes();

          let new_terminal_key = graph.add_node(new_terminal_node);
          graph
            .add_edge(GraphNodeKey::new(id), new_terminal_key, AuspiceTreeEdge::new())
            .map_err(|err| println!("{err:?}"))
            .ok();
        }
        //Attach only to a reference node.
        let mut new_graph_node: AuspiceTreeNode = create_new_auspice_node(result);
        new_graph_node.tmp.private_mutations = result.private_nuc_mutations.private_substitutions.clone();
        new_graph_node.tmp.id = graph.num_nodes();

        // Create and add the new node to the graph.
        let new_node_key = graph.add_node(new_graph_node);
        graph
        .add_edge(GraphNodeKey::new(id), new_node_key, AuspiceTreeEdge::new())
        .map_err(|err| println!("{err:?}"))
        .ok();
      }
    }
  }
}

fn tree_attach_new_nodes_impl_in_place_recursive(node: &mut AuspiceTreeNode, results: &[NextcladeOutputs]) {
  // Attach only to a reference node.
  // If it's not a reference node, we can stop here, because there can be no reference nodes down the tree.
  if !node.tmp.is_ref_node {
    return;
  }

  for child in &mut node.children {
    tree_attach_new_nodes_impl_in_place_recursive(child, results);
  }

  // Look for a query sample result for which this node was decided to be nearest
  for result in results {
    if node.tmp.id == result.nearest_node_id {
      attach_new_node(node, result);
    }
  }
}

/// Attaches a new node to the reference tree
fn attach_new_node(node: &mut AuspiceTreeNode, result: &NextcladeOutputs) {
  debug_assert!(node.is_ref_node());
  debug_assert_eq!(node.tmp.id, result.nearest_node_id);

  if node.is_leaf() {
    add_aux_node(node);
  }

  add_child(node, result);
}

fn add_aux_node(node: &mut AuspiceTreeNode) {
  debug_assert!(node.is_ref_node());

  let mut aux_node = node.clone();
  aux_node.branch_attrs.mutations.clear();
  // Remove other branch attrs like labels to prevent duplication
  aux_node.branch_attrs.other = serde_json::Value::default();
  node.children.push(aux_node);

  node.name = format!("{}_parent", node.name);
}

fn add_child(node: &mut AuspiceTreeNode, result: &NextcladeOutputs) {
  let new_node = create_new_auspice_node(result);

  node.children.insert(0, new_node);
}

fn convert_mutations_to_node_branch_attrs(result: &NextcladeOutputs) -> BTreeMap<String, Vec<String>> {
  let NextcladeOutputs {
    private_nuc_mutations,
    private_aa_mutations,
    ..
  } = result;

  let mut mutations = BTreeMap::<String, Vec<String>>::new();

  mutations.insert(
    "nuc".to_owned(),
    convert_nuc_mutations_to_node_branch_attrs(private_nuc_mutations),
  );

  for (gene_name, aa_mutations) in private_aa_mutations {
    mutations.insert(
      gene_name.clone(),
      convert_aa_mutations_to_node_branch_attrs(aa_mutations),
    );
  }

  mutations
}

fn convert_nuc_mutations_to_node_branch_attrs(private_nuc_mutations: &PrivateNucMutations) -> Vec<String> {
  let dels_as_subs = private_nuc_mutations
    .private_deletions
    .iter()
    .map(NucDelMinimal::to_sub)
    .collect_vec();

  let mut subs = concat_to_vec(&private_nuc_mutations.private_substitutions, &dels_as_subs);
  subs.sort();

  subs.iter().map(NucSub::to_string).collect_vec()
}

fn convert_aa_mutations_to_node_branch_attrs(private_aa_mutations: &PrivateAaMutations) -> Vec<String> {
  let dels_as_subs = private_aa_mutations
    .private_deletions
    .iter()
    .map(AaDelMinimal::to_sub)
    .collect_vec();

  let mut subs = concat_to_vec(&private_aa_mutations.private_substitutions, &dels_as_subs);
  subs.sort();

  subs.iter().map(AaSubMinimal::to_string_without_gene).collect_vec()
}
