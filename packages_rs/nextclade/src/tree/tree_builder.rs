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
      &closest_neighbor,
      result,
      divergence_units,
      ref_seq_len,
    )?;
  } else {
    //if nearest_node is terminal create dummy empty terminal node with nearest_node's name (so that nearest_node) stays a terminal)
    //and attach new node to nearest_node (same id, now called {name}_parent)
    attach_node(
      graph,
      nearest_node_id,
      &closest_neighbor.subs_qry_only,
      result,
      divergence_units,
      ref_seq_len,
    );
  }

  Ok(())
}

#[derive(Debug, Clone)]
struct SplitMutationsResult {
  left: PrivateMutationsMinimal,
  shared: PrivateMutationsMinimal,
  right: PrivateMutationsMinimal,
}

/// Split mutations into 3 groups:
///  - shared
///  - belonging only to left argument
///  - belonging only to the right argument
fn split_mutations(left: &PrivateMutationsMinimal, right: &PrivateMutationsMinimal) -> SplitMutationsResult {
  let mut subs_shared = Vec::<NucSub>::new();
  let mut subs_left = Vec::<NucSub>::new();
  let mut subs_right = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < left.nuc_subs.len()) && (j < right.nuc_subs.len()) {
    if left.nuc_subs[i].pos == right.nuc_subs[j].pos {
      // position is also mutated in node
      if left.nuc_subs[i].ref_nuc == right.nuc_subs[j].ref_nuc && left.nuc_subs[i].qry_nuc == right.nuc_subs[j].qry_nuc
      {
        subs_shared.push(left.nuc_subs[i].clone()); // the exact mutation is shared between node and seq
      } else {
        subs_left.push(left.nuc_subs[i].clone());
        subs_right.push(right.nuc_subs[j].clone());
      }
      i += 1;
      j += 1;
    } else if left.nuc_subs[i].pos < right.nuc_subs[j].pos {
      subs_left.push(left.nuc_subs[i].clone());
      i += 1;
    } else {
      subs_right.push(right.nuc_subs[j].clone());
      j += 1;
    }
  }
  while i < left.nuc_subs.len() {
    subs_left.push(left.nuc_subs[i].clone());
    i += 1;
  }
  while j < right.nuc_subs.len() {
    subs_right.push(right.nuc_subs[j].clone());
    j += 1;
  }

  ////////////////////////////////////////////////////////////////////////

  let mut i = 0;
  let mut j = 0;
  let mut dels_shared = Vec::<NucDel>::new();
  let mut dels_left = Vec::<NucDel>::new();
  let mut dels_right = Vec::<NucDel>::new();

  while (i < left.nuc_dels.len()) && (j < right.nuc_dels.len()) {
    if left.nuc_dels[i].pos == right.nuc_dels[j].pos {
      // position is also a deletion in node
      dels_shared.push(left.nuc_dels[i].clone()); // the exact mutation is shared between node and seq
      i += 1;
      j += 1;
    } else if left.nuc_dels[i].pos < right.nuc_dels[j].pos {
      dels_left.push(left.nuc_dels[i].clone());
      i += 1;
    } else {
      dels_right.push(right.nuc_dels[j].clone());
      j += 1;
    }
  }
  while i < left.nuc_dels.len() {
    dels_left.push(left.nuc_dels[i].clone());
    i += 1;
  }
  while j < right.nuc_dels.len() {
    dels_right.push(right.nuc_dels[j].clone());
    j += 1;
  }

  ////////////////////////////////////////////////////////////////////////

  let mut aa_subs_shared = BTreeMap::<String, Vec<AaSub>>::new();
  let mut aa_subs_left = BTreeMap::<String, Vec<AaSub>>::new();
  let mut aa_subs_right = BTreeMap::<String, Vec<AaSub>>::new();

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
    let mut aa_subs_for_gene_shared = Vec::<AaSub>::new();
    let mut aa_subs_for_gene_left = Vec::<AaSub>::new();
    let mut aa_subs_for_gene_right = Vec::<AaSub>::new();
    let mut i = 0;
    let mut j = 0;
    while (i < aa_muts_left.len()) && (j < aa_muts_right.len()) {
      if aa_muts_left[i].pos == aa_muts_right[j].pos {
        // position is also mutated in node
        if aa_muts_left[i].ref_aa == aa_muts_right[j].ref_aa && aa_muts_left[i].qry_aa == aa_muts_right[j].qry_aa {
          aa_subs_for_gene_shared.push(aa_muts_left[i].clone()); // the exact mutation is shared between node and seq
        } else {
          aa_subs_for_gene_left.push(aa_muts_left[i].clone());
          aa_subs_for_gene_right.push(aa_muts_right[j].clone());
        }
        i += 1;
        j += 1;
      } else if aa_muts_left[i].pos < aa_muts_right[j].pos {
        aa_subs_for_gene_left.push(aa_muts_left[i].clone());
        i += 1;
      } else {
        aa_subs_for_gene_right.push(aa_muts_right[j].clone());
        j += 1;
      }
    }
    while i < aa_muts_left.len() {
      aa_subs_for_gene_left.push(aa_muts_left[i].clone());
      i += 1;
    }
    while j < aa_muts_right.len() {
      aa_subs_for_gene_right.push(aa_muts_right[j].clone());
      j += 1;
    }
    aa_subs_shared.insert(gene_name.to_string(), aa_subs_for_gene_shared);
    aa_subs_left.insert(gene_name.to_string(), aa_subs_for_gene_left);
    aa_subs_right.insert(gene_name.to_string(), aa_subs_for_gene_right);
  }
  for (k, v) in &left.aa_muts {
    if !shared_keys.contains(&k) {
      aa_subs_left.insert(k.to_string(), v.clone());
    }
  }
  for (k, v) in &right.aa_muts {
    if !shared_keys.contains(&k) {
      aa_subs_right.insert(k.to_string(), v.clone());
    }
  }

  ////////////////////////////////////////////////////////////////////////

  SplitMutationsResult {
    left: PrivateMutationsMinimal {
      nuc_subs: subs_left,
      nuc_dels: dels_left,
      aa_muts: aa_subs_left,
    },
    shared: PrivateMutationsMinimal {
      nuc_subs: subs_shared,
      nuc_dels: dels_shared,
      aa_muts: aa_subs_shared,
    },
    right: PrivateMutationsMinimal {
      nuc_subs: subs_right,
      nuc_dels: dels_right,
      aa_muts: aa_subs_right,
    },
  }
}

#[derive(Debug, Clone)]
pub struct ClosestNeighbor {
  source_key: usize,
  target_key: usize,
  subs_qry_only: PrivateMutationsMinimal,
  subs_target_only: PrivateMutationsMinimal,
  subs_shared: PrivateMutationsMinimal,
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
    subs_qry_only: pre_new_seq_private_mutations,
    subs_target_only: PrivateMutationsMinimal::default(),
    subs_shared: PrivateMutationsMinimal::default(),
  };
  let mut found = false;
  let mut closest_neighbor_dist = 0;
  let node = graph.get_node(GraphNodeKey::new(node_key)).expect("Node not found");

  //first check how close to parent new sequence is
  let parent_key = graph.parent_key_of_by_key(GraphNodeKey::new(node_key));
  if let Some(parent_key) = parent_key {
    let parent_mutations = node.payload().tmp.private_mutations.clone();
    let reverted_parent_mutations = parent_mutations.invert();

    let SplitMutationsResult {
      left: subs_parent_only,
      shared: subs_shared,
      right: subs_qry_only,
    } = split_mutations(&reverted_parent_mutations, seq_private_mutations);

    // TODO: describe condition
    if !subs_shared.nuc_subs.is_empty() && subs_shared.nuc_subs.len() == reverted_parent_mutations.nuc_subs.len() {
      closest_neighbor = get_closest_neighbor_recursively(graph, parent_key.as_usize(), &subs_qry_only)?;
      found = true;
    }
    // TODO: describe condition
    else if subs_shared.nuc_subs.len() > closest_neighbor_dist {
      closest_neighbor_dist = subs_shared.nuc_subs.len();
      closest_neighbor = ClosestNeighbor {
        source_key: node_key,
        target_key: parent_key.as_usize(),
        subs_qry_only,
        subs_target_only: subs_parent_only.invert(),
        subs_shared: subs_shared.invert(),
      };
    }
  }

  //check if new sequence is actually closer to a child
  if !found {
    for child_key in graph.iter_child_keys_of(node) {
      let child = graph.get_node(child_key).expect("Node not found");
      let child_mutations = child.payload().tmp.private_mutations.clone();

      let SplitMutationsResult {
        left: subs_child_only,
        shared: subs_shared,
        right: subs_qry_only,
      } = split_mutations(&child_mutations, seq_private_mutations);

      // TODO: describe condition
      if !subs_shared.nuc_subs.is_empty() && subs_shared.nuc_subs.len() == child_mutations.nuc_subs.len() {
        closest_neighbor = get_closest_neighbor_recursively(graph, child_key.as_usize(), &subs_qry_only)?;
        break;
      }
      // TODO: describe condition
      if subs_shared.nuc_subs.len() > closest_neighbor_dist {
        closest_neighbor_dist = subs_shared.nuc_subs.len();
        closest_neighbor = ClosestNeighbor {
          source_key: node_key,
          target_key: child_key.as_usize(),
          subs_qry_only,
          subs_target_only: subs_child_only,
          subs_shared,
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
  closest_neighbor: &ClosestNeighbor,
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) -> Result<(), Report> {
  let (new_middle_node_key, divergence_middle_node) = {
    let mut new_middle_node: AuspiceTreeNode = graph.get_node(GraphNodeKey::new(source_key)).unwrap().payload().clone();

    let parent_div = new_middle_node.node_attrs.div.unwrap_or(0.0);
    let divergence_middle_node = calculate_divergence(
      parent_div,
      &closest_neighbor.subs_shared.nuc_subs,
      divergence_units,
      ref_seq_len,
    );

    new_middle_node.tmp.private_mutations = closest_neighbor.subs_shared.clone();
    new_middle_node.node_attrs.div = Some(divergence_middle_node);
    new_middle_node.branch_attrs.mutations =
      convert_private_mutations_to_node_branch_attrs(&closest_neighbor.subs_shared);
    new_middle_node.name = format!("{target_key}_internal");
    new_middle_node.tmp.id = graph.num_nodes();

    let new_middle_node_key = graph.add_node(new_middle_node);

    (new_middle_node_key, divergence_middle_node)
  };

  // Alter private mutations of target
  let mut target = graph.get_node_mut(GraphNodeKey::new(target_key)).unwrap().payload_mut();
  let divergence = calculate_divergence(
    divergence_middle_node,
    &closest_neighbor.subs_target_only.nuc_subs,
    divergence_units,
    ref_seq_len,
  );
  target.tmp.private_mutations = closest_neighbor.subs_target_only.clone();
  target.branch_attrs.mutations = convert_private_mutations_to_node_branch_attrs(&closest_neighbor.subs_target_only);

  // Create node between nearest_node and nearest child
  graph.insert_node_before(
    new_middle_node_key,
    GraphNodeKey::new(target_key),
    AuspiceTreeEdge::new(), // Edge payloads are currently dummy
    AuspiceTreeEdge::new(), // Edge payloads are currently dummy
  )?;

  // Attach seq to new_middle_node
  attach_node(
    graph,
    new_middle_node_key.as_usize(),
    &closest_neighbor.subs_qry_only,
    result,
    divergence_units,
    ref_seq_len,
  );

  Ok(())
}

pub fn attach_node(
  graph: &mut AuspiceGraph,
  nearest_node_id: usize,
  new_private_mutations: &PrivateMutationsMinimal,
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
  new_graph_node.tmp.private_mutations = new_private_mutations.clone();
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
