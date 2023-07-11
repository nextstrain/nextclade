use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_private_nuc_mutations::PrivateMutationsMinimal;
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::graph::node::GraphNodeKey;
use crate::make_internal_report;
use crate::tree::split_muts::{set_difference_of_muts, set_union_of_muts, split_muts, SplitMutsResult};
use crate::tree::tree::{AuspiceGraph, AuspiceTreeEdge, AuspiceTreeNode, DivergenceUnits};
use crate::tree::tree_attach_new_nodes::create_new_auspice_node;
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use eyre::Report;
use itertools::Itertools;
use regex::internal::Input;
use std::collections::{BTreeMap, HashMap};

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

  // Check if new seq is in between nearest node and a neighbor of nearest node
  let mutations_seq = PrivateMutationsMinimal {
    nuc_subs: result.private_nuc_mutations.private_substitutions.clone(),
    nuc_dels: result.private_nuc_mutations.private_deletions.clone(),
    aa_muts: private_aa_mutations,
  };

  // FIXME: new code begin

  let (nearest_node_key, private_mutations) = finetune_nearest_node(graph, result.nearest_node_id, &mutations_seq)?;

  knit_into_graph(
    graph,
    nearest_node_key,
    result,
    &private_mutations,
    divergence_units,
    ref_seq_len,
  )?;

  // FIXME: new code end

  let closest_neighbor = get_closest_neighbor_recursively(graph, result.nearest_node_id, &mutations_seq)?;

  if closest_neighbor.source_key != closest_neighbor.target_key {
    // If there exists a child that shares private mutations with new seq,
    // then create middle node between that child and the nearest_node attach seq to middle node
    let mut source_key = closest_neighbor.source_key;
    let mut target_key = closest_neighbor.target_key;

    // Check if next nearest node is parent or child
    if let Some(parent_key) = graph.parent_key_of_by_key(closest_neighbor.source_key) {
      if parent_key == closest_neighbor.target_key {
        source_key = parent_key;
        target_key = closest_neighbor.source_key;
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
    // If nearest_node is terminal, then create dummy empty terminal node with nearest_node's name
    // (so that nearest_node stays a terminal) and attach new node to nearest_node (same id, now called {name}_parent)
    attach_node(
      graph,
      closest_neighbor.source_key,
      &closest_neighbor.subs_qry_only,
      result,
      divergence_units,
      ref_seq_len,
    );
  }

  Ok(())
}

pub fn finetune_nearest_node(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  seq_private_mutations: &PrivateMutationsMinimal,
) -> Result<(GraphNodeKey, PrivateMutationsMinimal), Report> {
  let mut nearest_node = graph.get_node(nearest_node_key)?;
  let mut private_mutations = seq_private_mutations.clone();

  loop {
    let mut shared_muts_counts = HashMap::<GraphNodeKey, SplitMutsResult>::from([(
      nearest_node_key,
      split_muts(
        &nearest_node.payload().tmp.private_mutations.invert(),
        seq_private_mutations,
      ),
    )]);

    for child in graph.iter_children_of(nearest_node) {
      shared_muts_counts.insert(
        child.key(),
        split_muts(&child.payload().tmp.private_mutations, seq_private_mutations),
      );
    }

    let (best_node_key, max_shared_muts) = shared_muts_counts
      .into_iter()
      .max_by_key(|(_, split_result)| split_result.shared.nuc_subs.len())
      .ok_or_else(|| make_internal_report!("Shared mutations map cannot be empty"))?;

    let n_shared_muts = max_shared_muts.shared.nuc_subs.len();
    if n_shared_muts > 0 {
      if best_node_key == nearest_node.key() && max_shared_muts.left.nuc_subs.is_empty() {
        // All mutations from the parent to the node are shared with private mutations. Move up to the parent.
        // FIXME: what if there's no parent?
        nearest_node = graph
          .parent_of_by_key(best_node_key)
          .ok_or_else(|| make_internal_report!("Parent node is expected, but not found"))?;
        private_mutations = set_difference_of_muts(&private_mutations, &max_shared_muts.shared);
      } else if best_node_key == nearest_node.key() {
        // The best node is the current node. Break.
        break;
      } else {
        // The best node is child
        nearest_node = graph.get_node(best_node_key)?;
        //subtract the shared mutations from the private mutations struct
        private_mutations = set_difference_of_muts(&private_mutations, &max_shared_muts.shared);
        // add the inverted remaining mutations on that branch
        if !max_shared_muts.left.nuc_subs.is_empty() {
          // a bit waste full, because we redo this in the next iteration
          private_mutations = set_union_of_muts(&private_mutations, &max_shared_muts.left.invert());
        }
      }
    } else {
      break;
    }
  }

  Ok((nearest_node.key(), private_mutations))
}

#[derive(Debug, Clone)]
pub struct ClosestNeighbor {
  source_key: GraphNodeKey,
  target_key: GraphNodeKey,
  subs_qry_only: PrivateMutationsMinimal,
  subs_target_only: PrivateMutationsMinimal,
  subs_shared: PrivateMutationsMinimal,
}

pub fn get_closest_neighbor_recursively(
  graph: &AuspiceGraph,
  node_key: GraphNodeKey,
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
  let node = graph.get_node(node_key).expect("Node not found");

  // First check how close to parent new sequence is
  let parent_key = graph.parent_key_of_by_key(node_key);
  if let Some(parent_key) = parent_key {
    let parent_mutations = node.payload().tmp.private_mutations.clone();
    let reverted_parent_mutations = parent_mutations.invert();

    // FIXME: duplicated code begin ////////////////////////////////////////////////
    {
      let SplitMutsResult {
        left: subs_parent_only,
        shared: subs_shared,
        right: subs_qry_only,
      } = split_muts(&reverted_parent_mutations, seq_private_mutations);

      // TODO: describe condition
      if !subs_shared.nuc_subs.is_empty() && subs_shared.nuc_subs.len() == reverted_parent_mutations.nuc_subs.len() {
        closest_neighbor = get_closest_neighbor_recursively(graph, parent_key, &subs_qry_only)?;
        found = true; // FIXME: subtle difference in duplicated code; side effect
      }
      // TODO: describe condition
      else if subs_shared.nuc_subs.len() > closest_neighbor_dist {
        closest_neighbor_dist = subs_shared.nuc_subs.len();
        closest_neighbor = ClosestNeighbor {
          source_key: node_key,
          target_key: parent_key,
          subs_qry_only,
          subs_target_only: subs_parent_only.invert(),
          subs_shared: subs_shared.invert(),
        };
      }
    }
    // FIXME: duplicated code end ////////////////////////////////////////////////
  }

  // Check if new sequence is actually closer to a child
  if !found {
    for child_key in graph.iter_child_keys_of(node) {
      let child = graph.get_node(child_key).expect("Node not found");
      let child_mutations = child.payload().tmp.private_mutations.clone();

      // FIXME: duplicated code begin ////////////////////////////////////////////////
      {
        let SplitMutsResult {
          left: subs_child_only,
          shared: subs_shared,
          right: subs_qry_only,
        } = split_muts(&child_mutations, seq_private_mutations);

        // TODO: describe condition
        if !subs_shared.nuc_subs.is_empty() && subs_shared.nuc_subs.len() == child_mutations.nuc_subs.len() {
          closest_neighbor = get_closest_neighbor_recursively(graph, child_key, &subs_qry_only)?;
          break; // FIXME: subtle difference in duplicated code; no side effect
        }
        // TODO: describe condition
        if subs_shared.nuc_subs.len() > closest_neighbor_dist {
          closest_neighbor_dist = subs_shared.nuc_subs.len();
          closest_neighbor = ClosestNeighbor {
            source_key: node_key,
            target_key: child_key,
            subs_qry_only,
            subs_target_only: subs_child_only,
            subs_shared,
          };
        }
      }
      // FIXME: duplicated code end ////////////////////////////////////////////////
    }
  }
  Ok(closest_neighbor)
}

pub fn add_to_middle_node(
  graph: &mut AuspiceGraph,
  source_key: GraphNodeKey,
  target_key: GraphNodeKey,
  closest_neighbor: &ClosestNeighbor,
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) -> Result<(), Report> {
  let (new_middle_node_key, divergence_middle_node) = {
    let mut new_middle_node: AuspiceTreeNode = graph.get_node(source_key).unwrap().payload().clone();

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
    new_middle_node.tmp.id = GraphNodeKey::new(graph.num_nodes()); // FIXME: HACK: assumes keys are indices in node array

    let new_middle_node_key = graph.add_node(new_middle_node);

    (new_middle_node_key, divergence_middle_node)
  };

  // Alter private mutations of target
  let mut target = graph.get_node_mut(target_key).unwrap().payload_mut();
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
    target_key,
    AuspiceTreeEdge::new(), // Edge payloads are currently dummy
    AuspiceTreeEdge::new(), // Edge payloads are currently dummy
  )?;

  // Attach seq to new_middle_node
  attach_node(
    graph,
    new_middle_node_key,
    &closest_neighbor.subs_qry_only,
    result,
    divergence_units,
    ref_seq_len,
  );

  Ok(())
}

pub fn attach_node(
  graph: &mut AuspiceGraph,
  nearest_node_id: GraphNodeKey,
  new_private_mutations: &PrivateMutationsMinimal,
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) {
  let nearest_node_clone = graph.get_node(nearest_node_id).unwrap().payload().clone();
  let nearest_node_div = nearest_node_clone.node_attrs.div.unwrap_or(0.0);
  // Check if node is a leaf, then it contains a sequence and we need to create a new node to be visible in the tree
  if graph.is_leaf_key(nearest_node_id) {
    let target = graph.get_node_mut(nearest_node_id).unwrap().payload_mut();
    target.name = format!("{}_parent", target.name);

    let mut new_terminal_node = nearest_node_clone;
    new_terminal_node.branch_attrs.mutations.clear();
    new_terminal_node.branch_attrs.other = serde_json::Value::default();
    new_terminal_node.tmp.private_mutations = PrivateMutationsMinimal::default();
    new_terminal_node.tmp.id = GraphNodeKey::new(graph.num_nodes()); // FIXME: HACK: assumes keys are indices in node array

    let new_terminal_key = graph.add_node(new_terminal_node);
    graph
      .add_edge(nearest_node_id, new_terminal_key, AuspiceTreeEdge::new())
      .map_err(|err| println!("{err:?}"))
      .ok();
  }
  // Attach only to a reference node.
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
  new_graph_node.tmp.id = GraphNodeKey::new(graph.num_nodes()); // FIXME: HACK: assumes keys are indices in node array

  // Create and add the new node to the graph.
  let new_node_key = graph.add_node(new_graph_node);
  graph
    .add_edge(nearest_node_id, new_node_key, AuspiceTreeEdge::new())
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

pub fn knit_into_graph(
  graph: &mut AuspiceGraph,
  target_key: GraphNodeKey,
  result: &NextcladeOutputs,
  private_mutations: &PrivateMutationsMinimal,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) -> Result<(), Report> {
  // the target node will be the sister of the new node defined by "private mutations" and the "result"
  let target_node = graph.get_node(target_key)?;
  let target_node_auspice = target_node.payload();

  // determine mutations shared between the private mutations of the new node
  // and the branch leading to the target node
  let shared_muts = split_muts(&target_node_auspice.tmp.private_mutations.invert(), private_mutations);

  // if the node is a leaf or if there are shared mutations, need to split the branch above and insert aux node
  if target_node.is_leaf() || !shared_muts.shared.nuc_subs.is_empty() {
    // fetch the parent of the target to get its divergence
    // FIXME: could be done by substracting from target_node rather than adding to parent
    let divergence_middle_node = {
      let parent_node = graph.parent_of_by_key(target_key).unwrap();
      let parent_div = parent_node.payload().node_attrs.div.unwrap_or(0.0);
      calculate_divergence(parent_div, &shared_muts.shared.nuc_subs, divergence_units, ref_seq_len)
    };

    // generate new internal node
    // add private mutations, divergence, name and branch attrs to new internal node
    // the mutations are inverted in the shared mutations struct, so have to invert them back
    let new_internal_node = {
      let mut new_internal_node: AuspiceTreeNode = target_node_auspice.clone();
      new_internal_node.tmp.private_mutations = shared_muts.shared.invert();
      new_internal_node.node_attrs.div = Some(divergence_middle_node);
      new_internal_node.branch_attrs.mutations =
        convert_private_mutations_to_node_branch_attrs(&new_internal_node.tmp.private_mutations);
      new_internal_node.name = format!("{target_key}_internal");
      new_internal_node.tmp.id = GraphNodeKey::new(graph.num_nodes()); // FIXME: HACK: assumes keys are indices in node array
      new_internal_node
    };

    // Add node between target_node and its parent
    let new_internal_node_key = graph.add_node(new_internal_node);
    graph.insert_node_before(
      new_internal_node_key,
      target_key,
      AuspiceTreeEdge::new(), // Edge payloads are currently dummy
      AuspiceTreeEdge::new(), // Edge payloads are currently dummy
    )?;

    // update the mutations on the branch from the new_internal_node to the target node (without the shared mutations)
    // the mutations are inverted in the shared mutations struct, so have to invert them back
    let target_node = graph.get_node_mut(target_key)?;
    let mut target_node_auspice = target_node.payload_mut();
    target_node_auspice.tmp.private_mutations = shared_muts.left.invert();
    target_node_auspice.branch_attrs.mutations =
      convert_private_mutations_to_node_branch_attrs(&target_node_auspice.tmp.private_mutations);

    // attach the new node as child to the new_internal_node with its mutations
    attach_node(
      graph,
      new_internal_node_key,
      &shared_muts.right,
      result,
      divergence_units,
      ref_seq_len,
    );
  } else {
    //can simply attach node
    attach_node(
      graph,
      target_key,
      private_mutations,
      result,
      divergence_units,
      ref_seq_len,
    )
  }
  Ok(())
}
