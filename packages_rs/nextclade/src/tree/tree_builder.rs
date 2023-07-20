use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::divergence::calculate_branch_length;
use crate::analyze::find_private_nuc_mutations::PrivateMutationsMinimal;
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::graph::node::GraphNodeKey;
use crate::make_internal_report;
use crate::tree::params::TreeBuilderParams;
use crate::tree::split_muts::{difference_of_muts, split_muts, union_of_muts, SplitMutsResult};
use crate::tree::tree::{AuspiceGraph, AuspiceTreeEdge, AuspiceTreeNode, DivergenceUnits, TreeBranchAttrsLabels};
use crate::tree::tree_attach_new_nodes::create_new_auspice_node;
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use regex::internal::Input;
use std::collections::{BTreeMap, HashMap};

pub fn graph_attach_new_nodes_in_place(
  graph: &mut AuspiceGraph,
  mut results: Vec<NextcladeOutputs>,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
  params: &TreeBuilderParams,
) -> Result<(), Report> {
  // Add sequences with less private mutations first to avoid un-treelike behavior in the graph.
  // And then also sort by the index in the original fasta inputs, to avoid non-deterministic order due to differences
  // in thread scheduling.
  results.sort_by_key(|result| (result.private_nuc_mutations.total_private_substitutions, result.index));

  // Look for a query sample result for which this node was decided to be nearest
  for result in &results {
    let r_name = result.seq_name.clone();
    println!("Attaching new node for {r_name}");
    graph_attach_new_node_in_place(graph, result, divergence_units, ref_seq_len, params).wrap_err_with(|| {
      format!(
        "When attaching the new node for query sequence '{}' to the tree",
        result.seq_name
      )
    })?;
  }
  graph.ladderize_tree().wrap_err("When ladderizing the resulting tree")
}

pub fn graph_attach_new_node_in_place(
  graph: &mut AuspiceGraph,
  result: &NextcladeOutputs,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
  params: &TreeBuilderParams,
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

  let (nearest_node_key, private_mutations) = if params.without_greedy_tree_builder {
    // Skip tree fine-tuning
    (result.nearest_node_id, mutations_seq)
  } else {
    // for the attachment on the reference tree ('result') fine tune the position
    // on the updated graph to minimize the number of private mutations
    finetune_nearest_node(graph, result.nearest_node_id, &mutations_seq)?
  };

  // add the new node at the fine tuned position while accounting for shared mutations
  // on the branch leading to the nearest node.
  knit_into_graph(
    graph,
    nearest_node_key,
    result,
    &private_mutations,
    divergence_units,
    ref_seq_len,
    params,
  )?;

  Ok(())
}

pub fn finetune_nearest_node(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  seq_private_mutations: &PrivateMutationsMinimal,
) -> Result<(GraphNodeKey, PrivateMutationsMinimal), Report> {
  let mut current_best_node_key = nearest_node_key;
  let mut nearest_node = graph.get_node(nearest_node_key)?;
  let mut private_mutations = seq_private_mutations.clone();
  loop {
    let mut shared_muts_neighbors = HashMap::<GraphNodeKey, SplitMutsResult>::from([(
      current_best_node_key,
      split_muts(
        &nearest_node.payload().tmp.private_mutations.invert(),
        &private_mutations,
      )
      .wrap_err_with(|| {
        format!(
          "When splitting mutations between query sequence and the nearest node '{}'",
          nearest_node.payload().name
        )
      })?,
    )]);

    for child in graph.iter_children_of(nearest_node) {
      shared_muts_neighbors.insert(
        child.key(),
        split_muts(&child.payload().tmp.private_mutations, &private_mutations).wrap_err_with(|| {
          format!(
            "When splitting mutations between query sequence and the child node '{}'",
            child.payload().name
          )
        })?,
      );
    }

    let (best_node_key, max_shared_muts) = shared_muts_neighbors
      .into_iter()
      .max_by_key(|(_, split_result)| split_result.shared.nuc_subs.len())
      .ok_or_else(|| make_internal_report!("Shared mutations map cannot be empty"))?;

    let n_shared_muts = max_shared_muts.shared.nuc_subs.len();
    if n_shared_muts > 0 {
      if best_node_key == current_best_node_key && max_shared_muts.left.nuc_subs.is_empty() {
        // All mutations from the parent to the node are shared with private mutations. Move up to the parent.
        // FIXME: what if there's no parent?
        nearest_node = graph
          .parent_of_by_key(best_node_key)
          .ok_or_else(|| make_internal_report!("Parent node is expected, but not found"))?;

        private_mutations = difference_of_muts(&private_mutations, &max_shared_muts.shared).wrap_err_with(|| {
          format!(
            "When calculating difference of mutations between query sequence and the candidate parent node '{}'",
            nearest_node.payload().name
          )
        })?;
      } else if best_node_key == current_best_node_key {
        // The best node is the current node. Break.
        break;
      } else {
        // The best node is child
        nearest_node = graph.get_node(best_node_key)?;
        //subtract the shared mutations from the private mutations struct
        private_mutations = difference_of_muts(&private_mutations, &max_shared_muts.shared).wrap_err_with(|| {
          format!(
            "When calculating difference of mutations between query sequence and the candidate child node '{}'",
            nearest_node.payload().name
          )
        })?;
        // add the inverted remaining mutations on that branch
        // even if there are no left-over nuc_subs because they are shared, the can be
        // changes in the same codon that still need handling
        private_mutations = union_of_muts(&private_mutations, &max_shared_muts.left.invert()).wrap_err_with(|| {
          format!(
            "When calculating union of mutations between query sequence and the candidate child node '{}'",
            graph.get_node(best_node_key).expect("Node not found").payload().name
          )
        })?;
      }
    } else if nearest_node.is_leaf() && nearest_node.payload().tmp.private_mutations.nuc_subs.is_empty() {
      // In this case, a leaf identical to its parent in terms of nuc_subs. this happens when we add
      // auxillary nodes.

      // Mutation subtraction is still necessary because there might be shared mutations even if there are no `nuc_subs`.
      // FIXME: This relies on `is_leaf`. In that case, there is only one entry in `shared_muts_neighbors`
      // and the `max_shared_muts` is automatically the `nearest_node_key`. Less error prone would be
      // to fetch the shared muts corresponding to current_best_node_key
      private_mutations = difference_of_muts(&private_mutations, &max_shared_muts.shared).wrap_err_with(|| {
        format!(
          "When subtracting mutations from zero-length parent node '{}'",
          nearest_node.payload().name
        )
      })?;
      nearest_node = graph
        .parent_of_by_key(best_node_key)
        .ok_or_else(|| make_internal_report!("Parent node is expected, but not found"))?;
    } else {
      break;
    }
    current_best_node_key = nearest_node.key();
  }
  Ok((nearest_node.key(), private_mutations))
}

pub fn attach_to_internal_node(
  graph: &mut AuspiceGraph,
  nearest_node_id: GraphNodeKey,
  new_private_mutations: &PrivateMutationsMinimal,
  result: &NextcladeOutputs,
  divergence_new_node: f64,
) -> Result<(), Report> {
  //generated auspice payload for new node
  let mut new_graph_node: AuspiceTreeNode = create_new_auspice_node(result, new_private_mutations, divergence_new_node);
  new_graph_node.tmp.private_mutations = new_private_mutations.clone();
  new_graph_node.tmp.id = GraphNodeKey::new(graph.num_nodes()); // FIXME: HACK: assumes keys are indices in node array

  // Create and add the new node to the graph.
  let new_node_key = graph.add_node(new_graph_node);
  graph.add_edge(nearest_node_id, new_node_key, AuspiceTreeEdge::new())
}

pub fn convert_private_mutations_to_node_branch_attrs(
  mutations: &PrivateMutationsMinimal,
) -> BTreeMap<String, Vec<String>> {
  let mut branch_attrs = BTreeMap::<String, Vec<String>>::new();

  let dels_as_subs = mutations.nuc_dels.iter().map(NucDel::to_sub).collect_vec();
  let nuc_muts = concat_to_vec(&mutations.nuc_subs, &dels_as_subs)
    .iter()
    .sorted()
    .map(NucSub::to_string)
    .collect_vec();
  branch_attrs.insert("nuc".to_owned(), nuc_muts);

  for (gene_name, aa_muts) in &mutations.aa_muts {
    if !aa_muts.is_empty() {
      let aa_muts = aa_muts.iter().sorted().map(AaSub::to_string_without_gene).collect_vec();
      branch_attrs.insert(gene_name.clone(), aa_muts);
    }
  }

  branch_attrs
}

pub fn convert_private_mutations_to_node_branch_attrs_aa_labels(aa_muts: &BTreeMap<String, Vec<AaSub>>) -> String {
  aa_muts
    .iter()
    .filter(|(_, aa_muts)| !aa_muts.is_empty())
    .map(|(gene_name, aa_muts)| {
      let aa_muts = aa_muts.iter().sorted().map(AaSub::to_string_without_gene).join(", ");
      format!("{gene_name}: {aa_muts}")
    })
    .join("; ")
}

struct KnitMuts {
  muts_common_branch: PrivateMutationsMinimal,
  muts_target_node: PrivateMutationsMinimal,
  muts_new_node: PrivateMutationsMinimal,
}

pub fn knit_into_graph(
  graph: &mut AuspiceGraph,
  target_key: GraphNodeKey,
  result: &NextcladeOutputs,
  private_mutations: &PrivateMutationsMinimal,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
  params: &TreeBuilderParams,
) -> Result<(), Report> {
  // the target node will be the sister of the new node defined by "private mutations" and the "result"
  let target_node = graph.get_node(target_key)?;
  let target_node_auspice = target_node.payload();
  let target_node_div = &target_node_auspice.node_attrs.div.unwrap_or(0.0);
  let KnitMuts {
    muts_common_branch,
    muts_target_node,
    muts_new_node,
  } = if params.without_greedy_tree_builder || target_node.is_root() {
    KnitMuts {
      muts_common_branch: target_node_auspice.tmp.private_mutations.clone(), // Keep target node muts unchanged.
      muts_target_node: PrivateMutationsMinimal::default(),                  // Don't subtract any shared mutations.
      muts_new_node: private_mutations.clone(),                              // Keep private muts unchanged.
    }
  } else {
    // determine mutations shared between the private mutations of the new node
    // and the branch leading to the target node
    let SplitMutsResult {
      left: muts_common_branch_inverted, // Mutations on the common branch (not reverted)
      shared: muts_target_node_inverted, // Mutations that lead to the target_node but not the new node
      right: muts_new_node,
    } = split_muts(&target_node_auspice.tmp.private_mutations.invert(), private_mutations).wrap_err_with(|| {
      format!(
        "When splitting mutations between query sequence and the candidate parent node '{}'",
        target_node_auspice.name
      )
    })?;
    // note that since we split inverted mutations with the private mutations, those
    // .left are the ones on the common branch (not reverted) and those shared are
    // the mutations that lead to the target_node but not the new node
    let muts_common_branch = muts_common_branch_inverted.invert();
    let muts_target_node = muts_target_node_inverted.invert();
    KnitMuts {
      muts_common_branch,
      muts_target_node,
      muts_new_node,
    }
  };
  // if the node is a leaf or if there are shared mutations, need to split the branch above and insert aux node
  if target_node.is_leaf() || !muts_target_node.nuc_subs.is_empty() {
    // determine divergence of new internal node by subtracting shared reversions from target_node
    let divergence_middle_node =
      target_node_div - calculate_branch_length(&muts_target_node.nuc_subs, divergence_units, ref_seq_len);

    // generate new internal node
    // add private mutations, divergence, name and branch attrs to new internal node
    let new_internal_node = {
      let mut new_internal_node: AuspiceTreeNode = target_node_auspice.clone();
      new_internal_node.tmp.private_mutations = muts_common_branch;
      new_internal_node.node_attrs.div = Some(divergence_middle_node);
      new_internal_node.branch_attrs.mutations =
        convert_private_mutations_to_node_branch_attrs(&new_internal_node.tmp.private_mutations);
      if let Some(labels) = &mut new_internal_node.branch_attrs.labels {
        labels.clade = None; //nuke existing clade labels
      }
      set_branch_attrs_aa_labels(&mut new_internal_node);

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
    target_node_auspice.tmp.private_mutations = muts_target_node;
    target_node_auspice.branch_attrs.mutations =
      convert_private_mutations_to_node_branch_attrs(&target_node_auspice.tmp.private_mutations);
    set_branch_attrs_aa_labels(target_node_auspice);

    // attach the new node as child to the new_internal_node with its mutations
    attach_to_internal_node(
      graph,
      new_internal_node_key,
      &muts_new_node,
      result,
      divergence_middle_node + calculate_branch_length(&muts_new_node.nuc_subs, divergence_units, ref_seq_len),
    )?;
  } else {
    //can simply attach node
    attach_to_internal_node(
      graph,
      target_key,
      private_mutations,
      result,
      target_node_div + calculate_branch_length(&muts_new_node.nuc_subs, divergence_units, ref_seq_len),
    )?;
  }
  Ok(())
}

fn set_branch_attrs_aa_labels(node: &mut AuspiceTreeNode) {
  let aa_labels = convert_private_mutations_to_node_branch_attrs_aa_labels(&node.tmp.private_mutations.aa_muts);
  if let Some(labels) = &mut node.branch_attrs.labels {
    labels.aa = Some(aa_labels);
  } else {
    node.branch_attrs.labels = Some(TreeBranchAttrsLabels {
      aa: Some(aa_labels),
      clade: None,
      other: serde_json::Value::default(),
    });
  }
}
