use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_private_nuc_mutations::PrivateMutationsMinimal;
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::graph::node::GraphNodeKey;
use crate::tree::tree::{AuspiceGraph, AuspiceTreeEdge, AuspiceTreeNode, DivergenceUnits};
use crate::tree::tree_attach_new_nodes::create_new_auspice_node;
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use eyre::Report;
use itertools::Itertools;
use regex::internal::Input;
use std::collections::{BTreeMap, HashSet};

pub fn graph_attach_new_nodes_in_place(
  graph: &mut AuspiceGraph,
  results: &[NextcladeOutputs],
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) -> Result<(), Report> {
  // Look for a query sample result for which this node was decided to be nearest
  for result in results {
    let r_name = result.seq_name.clone();
    println!("Attaching new node for {r_name}");
    graph_attach_new_node_in_place(graph, result, divergence_units, ref_seq_len)?;
  }
  graph.ladderize_tree()
}

pub fn graph_attach_new_node_in_place(
  graph: &mut AuspiceGraph,
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) -> Result<(), Report> {
  let mut private_aa_mutations = BTreeMap::<String, Vec<AaSub>>::new();
  for key in result.private_aa_mutations.keys() {
    let subs = result.private_aa_mutations[key].private_substitutions.clone();
    let dels = result.private_aa_mutations[key]
      .private_deletions
      .iter()
      .map(AaDel::to_sub)
      .collect_vec();
    let mut value = concat_to_vec(&subs, &dels);
    value.sort();
    private_aa_mutations.insert(key.clone(), value);
  }

  //check if new seq is in between nearest node and a neighbor of nearest node
  let mutations_seq = PrivateMutationsMinimal {
    nuc_subs: result.private_nuc_mutations.private_substitutions.clone(),
    nuc_dels: result.private_nuc_mutations.private_deletions.clone(),
    aa_muts: private_aa_mutations,
  };
  let closest_neighbor = get_closest_neighbor_recursively(graph, result.nearest_node_id, &mutations_seq)?;
  let nearest_node_id = closest_neighbor.source_key;

  if nearest_node_id != closest_neighbor.target_key {
    //if there exists a child that shares private mutations with new seq, create middle node between that child and the nearest_node
    //attach seq to middle node
    let mut source_key = nearest_node_id;
    let mut target_key = closest_neighbor.target_key;

    //check if next nearest node is parent or child
    let parent_key = graph.parent_key_of_by_key(GraphNodeKey::new(nearest_node_id));
    if let Some(parent_key) = parent_key {
      if closest_neighbor.target_key == parent_key.as_usize() {
        source_key = parent_key.as_usize();
        target_key = nearest_node_id;
      }
    }
    add_to_middle_node(
      graph,
      source_key,
      target_key,
      closest_neighbor.var_3,
      closest_neighbor.var_4,
      closest_neighbor.var_2,
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
      closest_neighbor.var_2,
      result,
      divergence_units,
      ref_seq_len,
    );
  }

  Ok(())
}

fn split_mutations(
  left: &PrivateMutationsMinimal,
  right: &PrivateMutationsMinimal,
) -> (
  PrivateMutationsMinimal,
  PrivateMutationsMinimal,
  PrivateMutationsMinimal,
) {
  let mut shared_subs = Vec::<NucSub>::new();
  let mut private_subs_left = Vec::<NucSub>::new();
  let mut private_subs_right = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < left.nuc_subs.len()) && (j < right.nuc_subs.len()) {
    if left.nuc_subs[i].pos == right.nuc_subs[j].pos {
      // position is also mutated in node
      if left.nuc_subs[i].ref_nuc == right.nuc_subs[j].ref_nuc && left.nuc_subs[i].qry_nuc == right.nuc_subs[j].qry_nuc
      {
        shared_subs.push(left.nuc_subs[i].clone()); // the exact mutation is shared between node and seq
      } else {
        private_subs_left.push(left.nuc_subs[i].clone());
        private_subs_right.push(right.nuc_subs[j].clone());
      }
      i += 1;
      j += 1;
    } else if left.nuc_subs[i].pos < right.nuc_subs[j].pos {
      private_subs_left.push(left.nuc_subs[i].clone());
      i += 1;
    } else {
      private_subs_right.push(right.nuc_subs[j].clone());
      j += 1;
    }
  }
  while i < left.nuc_subs.len() {
    private_subs_left.push(left.nuc_subs[i].clone());
    i += 1;
  }
  while j < right.nuc_subs.len() {
    private_subs_right.push(right.nuc_subs[j].clone());
    j += 1;
  }

  ////////////////////////////////////////////////////////////////////////

  let mut i = 0;
  let mut j = 0;
  let mut shared_dels = Vec::<NucDel>::new();
  let mut private_dels_left = Vec::<NucDel>::new();
  let mut private_dels_right = Vec::<NucDel>::new();

  while (i < left.nuc_dels.len()) && (j < right.nuc_dels.len()) {
    if left.nuc_dels[i].pos == right.nuc_dels[j].pos {
      // position is also a deletion in node
      shared_dels.push(left.nuc_dels[i].clone()); // the exact mutation is shared between node and seq
      i += 1;
      j += 1;
    } else if left.nuc_dels[i].pos < right.nuc_dels[j].pos {
      private_dels_left.push(left.nuc_dels[i].clone());
      i += 1;
    } else {
      private_dels_right.push(right.nuc_dels[j].clone());
      j += 1;
    }
  }
  while i < left.nuc_dels.len() {
    private_dels_left.push(left.nuc_dels[i].clone());
    i += 1;
  }
  while j < right.nuc_dels.len() {
    private_dels_right.push(right.nuc_dels[j].clone());
    j += 1;
  }

  ////////////////////////////////////////////////////////////////////////

  let mut shared_aa_subs = BTreeMap::<String, Vec<AaSub>>::new();
  let mut private_aa_subs_left = BTreeMap::<String, Vec<AaSub>>::new();
  let mut private_aa_subs_right = BTreeMap::<String, Vec<AaSub>>::new();

  let keys_mut_left = left
    .aa_muts
    .keys()
    .map(std::clone::Clone::clone)
    .collect::<HashSet<_>>();
  let keys_mut_right = right
    .aa_muts
    .keys()
    .map(std::clone::Clone::clone)
    .collect::<HashSet<_>>();
  let mut shared_keys = keys_mut_left.intersection(&keys_mut_right).collect_vec();
  shared_keys.sort();

  for gene_name in shared_keys.clone() {
    let aa_muts_left = &left.aa_muts[gene_name];
    let aa_muts_right = &right.aa_muts[gene_name];
    let mut shared_aa_subs_for_gene = Vec::<AaSub>::new();
    let mut private_aa_subs_for_gene_left = Vec::<AaSub>::new();
    let mut private_aa_subs_for_gene_right = Vec::<AaSub>::new();
    let mut i = 0;
    let mut j = 0;
    while (i < aa_muts_left.len()) && (j < aa_muts_right.len()) {
      if aa_muts_left[i].pos == aa_muts_right[j].pos {
        // position is also mutated in node
        if aa_muts_left[i].ref_aa == aa_muts_right[j].ref_aa && aa_muts_left[i].qry_aa == aa_muts_right[j].qry_aa {
          shared_aa_subs_for_gene.push(aa_muts_left[i].clone()); // the exact mutation is shared between node and seq
        } else {
          private_aa_subs_for_gene_left.push(aa_muts_left[i].clone());
          private_aa_subs_for_gene_right.push(aa_muts_right[j].clone());
        }
        i += 1;
        j += 1;
      } else if aa_muts_left[i].pos < aa_muts_right[j].pos {
        private_aa_subs_for_gene_left.push(aa_muts_left[i].clone());
        i += 1;
      } else {
        private_aa_subs_for_gene_right.push(aa_muts_right[j].clone());
        j += 1;
      }
    }
    while i < aa_muts_left.len() {
      private_aa_subs_for_gene_left.push(aa_muts_left[i].clone());
      i += 1;
    }
    while j < aa_muts_right.len() {
      private_aa_subs_for_gene_right.push(aa_muts_right[j].clone());
      j += 1;
    }
    shared_aa_subs.insert(gene_name.to_string(), shared_aa_subs_for_gene);
    private_aa_subs_left.insert(gene_name.to_string(), private_aa_subs_for_gene_left);
    private_aa_subs_right.insert(gene_name.to_string(), private_aa_subs_for_gene_right);
  }
  for (k, v) in &left.aa_muts {
    if !shared_keys.contains(&k) {
      private_aa_subs_left.insert(k.to_string(), v.clone());
    }
  }
  for (k, v) in &right.aa_muts {
    if !shared_keys.contains(&k) {
      private_aa_subs_right.insert(k.to_string(), v.clone());
    }
  }

  ////////////////////////////////////////////////////////////////////////

  (
    PrivateMutationsMinimal {
      nuc_subs: shared_subs,
      nuc_dels: shared_dels,
      aa_muts: shared_aa_subs,
    },
    PrivateMutationsMinimal {
      nuc_subs: private_subs_left,
      nuc_dels: private_dels_left,
      aa_muts: private_aa_subs_left,
    },
    PrivateMutationsMinimal {
      nuc_subs: private_subs_right,
      nuc_dels: private_dels_right,
      aa_muts: private_aa_subs_right,
    },
  )
}

#[derive(Debug, Clone)]
pub struct ClosestNeighbor {
  source_key: usize,
  target_key: usize,
  var_2: PrivateMutationsMinimal,
  var_3: PrivateMutationsMinimal,
  var_4: PrivateMutationsMinimal,
}

pub fn get_closest_neighbor_recursively(
  graph: &AuspiceGraph,
  node_key: usize,
  seq_private_mutations: &PrivateMutationsMinimal,
) -> Result<ClosestNeighbor, Report> {
  let pre_new_seq_private_mutations = seq_private_mutations.clone();
  let mut closest_neighbor = ClosestNeighbor {
    source_key: node_key,
    target_key: node_key,
    var_2: pre_new_seq_private_mutations,
    var_3: PrivateMutationsMinimal::default(),
    var_4: PrivateMutationsMinimal::default(),
  };
  let mut found = false;
  let mut closest_neighbor_dist = 0;
  let node = graph.get_node(GraphNodeKey::new(node_key)).expect("Node not found");

  //first check how close to parent new sequence is
  let parent_key = graph.parent_key_of_by_key(GraphNodeKey::new(node_key));
  if let Some(parent_key) = parent_key {
    let parent_mutations = node.payload().tmp.private_mutations.clone();
    let reverted_parent_mutations = parent_mutations.invert();

    let (shared_substitutions, p_not_shared_substitutions, seq_not_shared_substitutions) =
      split_mutations(&reverted_parent_mutations, seq_private_mutations);

    // TODO: describe condition
    if !shared_substitutions.nuc_subs.is_empty()
      && shared_substitutions.nuc_subs.len() == reverted_parent_mutations.nuc_subs.len()
    {
      closest_neighbor = get_closest_neighbor_recursively(graph, parent_key.as_usize(), &seq_not_shared_substitutions)?;
      found = true;
    }
    // TODO: describe condition
    else if shared_substitutions.nuc_subs.len() > closest_neighbor_dist {
      closest_neighbor_dist = shared_substitutions.nuc_subs.len();
      closest_neighbor = ClosestNeighbor {
        source_key: node_key,
        target_key: parent_key.as_usize(),
        var_2: seq_not_shared_substitutions,
        var_3: p_not_shared_substitutions.invert(),
        var_4: shared_substitutions.invert(),
      };
    }
  }

  //check if new sequence is actually closer to a child
  if !found {
    for child_key in graph.iter_child_keys_of(node) {
      let child = graph.get_node(child_key).expect("Node not found");
      let child_mutations = child.payload().tmp.private_mutations.clone();

      let (shared_substitutions, c_not_shared_substitutions, seq_not_shared_substitutions) =
        split_mutations(&child_mutations, seq_private_mutations);

      // TODO: describe condition
      if !shared_substitutions.nuc_subs.is_empty()
        && shared_substitutions.nuc_subs.len() == child_mutations.nuc_subs.len()
      {
        closest_neighbor =
          get_closest_neighbor_recursively(graph, child_key.as_usize(), &seq_not_shared_substitutions)?;
        break;
      }
      // TODO: describe condition
      if shared_substitutions.nuc_subs.len() > closest_neighbor_dist {
        closest_neighbor_dist = shared_substitutions.nuc_subs.len();
        closest_neighbor = ClosestNeighbor {
          source_key: node_key,
          target_key: child_key.as_usize(),
          var_2: seq_not_shared_substitutions,
          var_3: shared_substitutions,
          var_4: c_not_shared_substitutions,
        };
      }
    }
  }
  Ok(closest_neighbor)
}

pub fn add_to_middle_node(
  graph: &mut AuspiceGraph,
  source_key: usize,
  target_key: usize,
  new_private_mutations_middle_node: PrivateMutationsMinimal,
  new_private_mutations_target: PrivateMutationsMinimal,
  new_private_mutations_seq: PrivateMutationsMinimal,
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) {
  let mut new_middle_node: AuspiceTreeNode = graph.get_node(GraphNodeKey::new(source_key)).unwrap().payload().clone();

  let parent_div = new_middle_node.node_attrs.div.unwrap_or(0.0);
  let divergence_middle_node = calculate_divergence(
    parent_div,
    &new_private_mutations_middle_node.nuc_subs,
    divergence_units,
    ref_seq_len,
  );
  let string_private_mutations_middle_node =
    convert_private_mutations_to_node_branch_attrs(&new_private_mutations_middle_node);
  new_middle_node.tmp.private_mutations = new_private_mutations_middle_node;
  new_middle_node.node_attrs.div = Some(divergence_middle_node);
  new_middle_node.branch_attrs.mutations = string_private_mutations_middle_node;
  new_middle_node.name = format!("{target_key}_internal");
  new_middle_node.tmp.id = graph.num_nodes();
  let new_middle_node_key = graph.add_node(new_middle_node);

  //alter private mutations of target
  let mut target = graph.get_node_mut(GraphNodeKey::new(target_key)).unwrap().payload_mut();
  let string_private_mutations_target = convert_private_mutations_to_node_branch_attrs(&new_private_mutations_target);
  let divergence = calculate_divergence(
    divergence_middle_node,
    &new_private_mutations_target.nuc_subs,
    divergence_units,
    ref_seq_len,
  );
  target.tmp.private_mutations = new_private_mutations_target;
  target.branch_attrs.mutations = string_private_mutations_target;

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
  new_private_mutations: PrivateMutationsMinimal,
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
    new_terminal_node.tmp.private_mutations = PrivateMutationsMinimal::default();
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
  let divergence_new_node = calculate_divergence(
    nearest_node_div,
    &new_private_mutations.nuc_subs,
    divergence_units,
    ref_seq_len,
  );
  let new_private_mutations_pre = new_private_mutations.clone();
  let mut new_graph_node: AuspiceTreeNode =
    create_new_auspice_node(result, &new_private_mutations_pre, divergence_new_node);
  new_graph_node.tmp.private_mutations = new_private_mutations;
  new_graph_node.tmp.id = graph.num_nodes();

  // Create and add the new node to the graph.
  let new_node_key = graph.add_node(new_graph_node);
  graph
    .add_edge(GraphNodeKey::new(nearest_node_id), new_node_key, AuspiceTreeEdge::new())
    .map_err(|err| println!("{err:?}"))
    .ok();
}

pub fn convert_private_mutations_to_node_branch_attrs(
  mutations: &PrivateMutationsMinimal,
) -> BTreeMap<String, Vec<String>> {
  let mut branch_attrs = BTreeMap::<String, Vec<String>>::new();
  let dels_as_subs = mutations.nuc_dels.iter().map(NucDel::to_sub).collect_vec();

  let mut mutations_value = concat_to_vec(&mutations.nuc_subs, &dels_as_subs);
  mutations_value.sort();
  let string_mutations_value = mutations_value.iter().map(NucSub::to_string).collect_vec();

  branch_attrs.insert("nuc".to_owned(), string_mutations_value);

  let keys = mutations.aa_muts.keys().collect_vec();

  for gene_name in keys {
    let aa_mutations = &mutations.aa_muts[gene_name];

    let string_aa_mutations = aa_mutations.iter().map(AaSub::to_string_without_gene).collect_vec();
    branch_attrs.insert(gene_name.clone(), string_aa_mutations);
  }

  branch_attrs
}
