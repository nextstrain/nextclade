use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::divergence::{self, calculate_divergence};
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

pub fn create_new_auspice_node(
  result: &NextcladeOutputs,
  new_private_mutations: Option<Vec<NucSub>>,
  new_divergence: Option<f64>,
) -> AuspiceTreeNode {
  let mutations = match new_private_mutations {
    Some(new_private_mutations) => {
      let mut mutations = BTreeMap::<String, Vec<String>>::default();
      mutations.insert(
        "nuc".to_owned(),
        new_private_mutations.iter().map(NucSub::to_string).collect_vec(),
      );
      mutations
    }
    None => convert_mutations_to_node_branch_attrs(result),
  };
  let divergence = match new_divergence {
    Some(new_divergence) => new_divergence,
    None => result.divergence,
  };

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
      div: Some(divergence),
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

use super::tree::{AuspiceGraph, DivergenceUnits};

fn split_mutations(subst1: &Vec<NucSub>, subst2: &Vec<NucSub>) -> (Vec<NucSub>, Vec<NucSub>, Vec<NucSub>) {
  let mut shared_substitutions = Vec::<NucSub>::new();
  let mut vect1_not_shared_substitutions = Vec::<NucSub>::new();
  let mut vect2_not_shared_substitutions = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < subst1.len()) && (j < subst2.len()) {
    if subst1[i].pos == subst2[j].pos {
      // position is also mutated in node
      if subst1[i].reff == subst2[j].reff && subst1[i].qry == subst2[j].qry {
        shared_substitutions.push(subst1[i].clone()); // the exact mutation is shared between node and seq
      } else {
        vect1_not_shared_substitutions.push(subst1[i].clone());
        vect2_not_shared_substitutions.push(subst2[j].clone());
      }
      i += 1;
      j += 1;
    } else if subst1[i].pos < subst2[j].pos {
      vect1_not_shared_substitutions.push(subst1[i].clone());
      i += 1;
    } else {
      vect2_not_shared_substitutions.push(subst2[j].clone());
      j += 1;
    }
  }
  while i < subst1.len() {
    vect1_not_shared_substitutions.push(subst1[i].clone());
    i += 1;
  }
  while j < subst2.len() {
    vect2_not_shared_substitutions.push(subst2[j].clone());
    j += 1;
  }
  (
    shared_substitutions,
    vect1_not_shared_substitutions,
    vect2_not_shared_substitutions,
  )
}

pub fn get_closest_neighbor(
  graph: &AuspiceGraph,
  node_key: usize,
  seq_private_mutations: &Vec<NucSub>,
) -> (usize, usize, Vec<NucSub>, Vec<NucSub>, Vec<NucSub>) {
  let pre_new_seq_private_mutations = seq_private_mutations.iter().map(std::clone::Clone::clone).collect_vec();
  let mut closest_neighbor = (
    node_key,
    node_key,
    pre_new_seq_private_mutations,
    Vec::<NucSub>::default(),
    Vec::<NucSub>::default(),
  );
  let mut closest_neighbor_dist = 0;
  let node = graph.get_node(GraphNodeKey::new(node_key)).expect("Node not found");
  //first check how close to parent new sequence is
  let parent_key = graph
    .parent_key_of_by_key(GraphNodeKey::new(node_key))
    .expect("Node has no parent");
  let parent_mutations = node
    .payload()
    .tmp
    .private_mutations
    .iter()
    .map(std::clone::Clone::clone)
    .collect_vec();
  let reverted_parent_mutations = parent_mutations.iter().map(NucSub::invert).collect_vec();
  let (shared_substitutions, p_not_shared_substitutions, seq_not_shared_substitutions) =
    split_mutations(&reverted_parent_mutations, seq_private_mutations);
  if !shared_substitutions.is_empty() && shared_substitutions.len() == parent_mutations.len() {
    closest_neighbor = get_closest_neighbor(graph, parent_key.as_usize(), &seq_not_shared_substitutions);
  } else {
    if shared_substitutions.len() > closest_neighbor_dist {
      closest_neighbor_dist = shared_substitutions.len();
      closest_neighbor = (
        node_key,
        parent_key.as_usize(),
        seq_not_shared_substitutions,
        p_not_shared_substitutions.iter().map(NucSub::invert).collect_vec(),
        shared_substitutions.iter().map(NucSub::invert).collect_vec(),
      );
    }
    //check if new sequence is actually closer to a child
    for child_key in graph.iter_child_keys_of(node) {
      let child = graph.get_node(child_key).expect("Node not found");
      let child_mutations = child.payload().tmp.private_mutations.clone();
      let (shared_substitutions, c_not_shared_substitutions, seq_not_shared_substitutions) =
        split_mutations(&child_mutations, seq_private_mutations);
      if !shared_substitutions.is_empty() && shared_substitutions.len() == child_mutations.len() {
        closest_neighbor = get_closest_neighbor(graph, child_key.as_usize(), &seq_not_shared_substitutions);
        break;
      }
      if shared_substitutions.len() > closest_neighbor_dist {
        closest_neighbor_dist = shared_substitutions.len();
        closest_neighbor = (
          node_key,
          child_key.as_usize(),
          seq_not_shared_substitutions,
          shared_substitutions,
          c_not_shared_substitutions,
        );
      }
    }
  }
  closest_neighbor
}

pub fn add_to_middle_node(
  graph: &mut AuspiceGraph,
  source_key: usize,
  target_key: usize,
  new_private_mutations_middle_node: Vec<NucSub>,
  new_private_mutations_target: Vec<NucSub>,
  new_private_mutations_seq: &[NucSub],
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) {
  let mut new_middle_node: AuspiceTreeNode = graph.get_node(GraphNodeKey::new(source_key)).unwrap().payload().clone();

  let string_private_mutations_middle_node = new_private_mutations_middle_node
    .iter()
    .map(std::clone::Clone::clone)
    .collect_vec();
  let parent_div = new_middle_node.node_attrs.div.unwrap_or(0.0);
  let divergence_middle_node = calculate_divergence(
    parent_div,
    new_private_mutations_middle_node.len(),
    divergence_units,
    ref_seq_len,
  );
  new_middle_node.tmp.private_mutations = new_private_mutations_middle_node;
  new_middle_node.node_attrs.div = Some(divergence_middle_node);
  new_middle_node.branch_attrs.mutations = BTreeMap::<String, Vec<String>>::default();
  new_middle_node.branch_attrs.mutations.insert(
    "nuc".to_owned(),
    string_private_mutations_middle_node
      .iter()
      .map(NucSub::to_string)
      .collect_vec(),
  );
  new_middle_node.name = format!("{target_key}_internal");
  new_middle_node.tmp.id = graph.num_nodes();
  let new_middle_node_key = graph.add_node(new_middle_node);

  //alter private mutations of target
  let mut target = graph.get_node_mut(GraphNodeKey::new(target_key)).unwrap().payload_mut();
  let string_private_mutations_target = new_private_mutations_target
    .iter()
    .map(std::clone::Clone::clone)
    .collect_vec();
  let divergence = calculate_divergence(
    divergence_middle_node,
    new_private_mutations_target.len(),
    divergence_units,
    ref_seq_len,
  );
  target.tmp.private_mutations = new_private_mutations_target;
  target.branch_attrs.mutations = BTreeMap::<String, Vec<String>>::default();
  target.branch_attrs.mutations.insert(
    "nuc".to_owned(),
    string_private_mutations_target
      .iter()
      .map(NucSub::to_string)
      .collect_vec(),
  );

  //create node between nearest_node and nearest child
  graph
    .insert_node_before(
      new_middle_node_key,
      GraphNodeKey::new(target_key),
      AuspiceTreeEdge::new(), // Edge payloads are currently dummy
      AuspiceTreeEdge::new(), // Edge payloads are currently dummy
    )
    .map_err(|err| println!("{err:?}"))
    .ok();
  //attach seq to new_middle_node
  attach_node(
    graph,
    new_middle_node_key.as_usize(),
    new_private_mutations_seq,
    result,
    divergence_units,
    ref_seq_len,
  );
}

pub fn attach_node(
  graph: &mut AuspiceGraph,
  nearest_node_id: usize,
  new_private_mutations: &[NucSub],
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) {
  let nearest_node_clone = graph
    .get_node(GraphNodeKey::new(nearest_node_id))
    .unwrap()
    .payload()
    .clone();
  let nearest_node_div = nearest_node_clone.node_attrs.div.unwrap_or(0.0);
  //check if node is a leaf, then it contains a sequence and we need to create a new node to be visible in the tree
  if graph.key_in_leaves(GraphNodeKey::new(nearest_node_id)) {
    let target = graph
      .get_node_mut(GraphNodeKey::new(nearest_node_id))
      .unwrap()
      .payload_mut();
    target.name = format!("{}_parent", target.name);

    let mut new_terminal_node = nearest_node_clone;
    new_terminal_node.branch_attrs.mutations.clear();
    new_terminal_node.branch_attrs.other = serde_json::Value::default();
    new_terminal_node.tmp.private_mutations = Vec::new();
    new_terminal_node.tmp.id = graph.num_nodes();

    let new_terminal_key = graph.add_node(new_terminal_node);
    graph
      .add_edge(
        GraphNodeKey::new(nearest_node_id),
        new_terminal_key,
        AuspiceTreeEdge::new(),
      )
      .map_err(|err| println!("{err:?}"))
      .ok();
  }
  //Attach only to a reference node.
  let new_node_private_mutations = new_private_mutations.iter().map(std::clone::Clone::clone).collect_vec();
  let divergence_new_node = calculate_divergence(
    nearest_node_div,
    new_node_private_mutations.len(),
    divergence_units,
    ref_seq_len,
  );
  let mut new_graph_node: AuspiceTreeNode =
    create_new_auspice_node(result, Some(new_node_private_mutations), Some(divergence_new_node));
  new_graph_node.tmp.private_mutations = new_private_mutations.iter().map(std::clone::Clone::clone).collect_vec();
  new_graph_node.tmp.id = graph.num_nodes();

  // Create and add the new node to the graph.
  let new_node_key = graph.add_node(new_graph_node);
  graph
    .add_edge(GraphNodeKey::new(nearest_node_id), new_node_key, AuspiceTreeEdge::new())
    .map_err(|err| println!("{err:?}"))
    .ok();
}

pub fn graph_attach_new_node_in_place(
  graph: &mut AuspiceGraph,
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) {
  let id = result.nearest_node_id;

  //check if new seq is in between nearest node and a neighbor of nearest node
  let closest_neighbor = get_closest_neighbor(graph, id, &result.private_nuc_mutations.private_substitutions);
  let nearest_node_id = closest_neighbor.0;

  if nearest_node_id != closest_neighbor.1 {
    //if there exists a child that shares private mutations with new seq, create middle node between that child and the nearest_node
    //attach seq to middle node
    let mut source_key = nearest_node_id;
    let mut target_key = closest_neighbor.1;

    //check if next nearest node is parent or child
    let parent_key = graph
      .parent_key_of_by_key(GraphNodeKey::new(nearest_node_id))
      .expect("Node has no parent");
    if closest_neighbor.1 == parent_key.as_usize() {
      source_key = parent_key.as_usize();
      target_key = nearest_node_id;
    }
    add_to_middle_node(
      graph,
      source_key,
      target_key,
      closest_neighbor.3,
      closest_neighbor.4,
      &closest_neighbor.2,
      result,
      divergence_units,
      ref_seq_len,
    );
  } else {
    //if nearest_node is terminal create dummy empty terminal node with nearest_node's name (so that nearest_node) stays a terminal)
    //and attach new node to nearest_node (same id, now called {name}_parent)
    attach_node(
      graph,
      nearest_node_id,
      &closest_neighbor.2,
      result,
      divergence_units,
      ref_seq_len,
    );
  }
}

pub fn graph_attach_new_nodes_in_place(
  graph: &mut AuspiceGraph,
  results: &[NextcladeOutputs],
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) {
  // Look for a query sample result for which this node was decided to be nearest
  for result in results {
    let r_name = result.seq_name.clone();
    println!("Attaching new node for {r_name}");
    graph_attach_new_node_in_place(graph, result, divergence_units, ref_seq_len);
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
  let new_node = create_new_auspice_node(result, None, None);

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
