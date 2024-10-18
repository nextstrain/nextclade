use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::divergence::{calculate_branch_length, score_nuc_muts};
use crate::analyze::find_private_nuc_mutations::BranchMutations;
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::range::NucRefGlobalRange;
use crate::graph::node::{GraphNodeKey, Node};
use crate::tree::params::TreeBuilderParams;
use crate::tree::split_muts::{difference_of_muts, split_muts, union_of_muts, SplitMutsResult};
use crate::tree::tree::{
  AuspiceGraph, AuspiceGraphEdgePayload, AuspiceGraphNodePayload, TreeBranchAttrsLabels, TreeNodeAttr,
};
use crate::tree::tree_attach_new_nodes::create_new_auspice_node;
use crate::tree::tree_preprocess::add_auspice_metadata_in_place;
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use crate::utils::stats::mode;
use eyre::{Report, WrapErr};
use itertools::{chain, Itertools};
use std::collections::BTreeMap;

pub fn graph_attach_new_nodes_in_place(
  graph: &mut AuspiceGraph,
  mut results: Vec<NextcladeOutputs>,
  ref_seq_len: usize,
  params: &TreeBuilderParams,
) -> Result<(), Report> {
  // Add sequences with less private mutations first to avoid un-treelike behavior in the graph.
  // And then also sort by the index in the original fasta inputs, to avoid non-deterministic order due to differences
  // in thread scheduling.
  results.sort_by_key(|result| (result.private_nuc_mutations.total_private_substitutions, result.index));

  // Look for a query sample result for which this node was decided to be nearest
  for result in &results {
    graph_attach_new_node_in_place(graph, result, ref_seq_len, params).wrap_err_with(|| {
      format!(
        "When attaching the new node for query sequence '{}' to the tree",
        result.seq_name
      )
    })?;
  }

  graph.ladderize().wrap_err("When ladderizing the resulting tree")?;

  add_auspice_metadata_in_place(&mut graph.data.meta);

  Ok(())
}

pub fn graph_attach_new_node_in_place(
  graph: &mut AuspiceGraph,
  result: &NextcladeOutputs,
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

  let nuc_subs = concat_to_vec(
    &result.private_nuc_mutations.private_substitutions,
    &result
      .private_nuc_mutations
      .private_deletions
      .iter()
      .map(NucDel::to_sub)
      .collect_vec(),
  );

  // Check if new seq is in between nearest node and a neighbor of nearest node
  let mutations_seq = BranchMutations {
    nuc_muts: nuc_subs,
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

  // add the new node at the fine-tuned position while accounting for shared mutations
  // on the branch leading to the nearest node.
  knit_into_graph(graph, nearest_node_key, result, &private_mutations, ref_seq_len, params)?;

  Ok(())
}

/// Moves the new sequences, defined by its set of private mutations
/// along the tree starting at the `nearest_node`. As the new sequence is moved, the
/// private mutations are updated. This is repeated until the number of private mutations (nuc)
/// can not be reduced further by moving the node. At the end of the loop, the nearest node
/// is either the closest possible point, or this closest point is along the branch leading
/// to the nearest_node.
pub fn finetune_nearest_node(
  graph: &AuspiceGraph,
  nearest_node_key: GraphNodeKey,
  seq_private_mutations: &BranchMutations,
) -> Result<(GraphNodeKey, BranchMutations), Report> {
  let masked_ranges = graph.data.meta.placement_mask_ranges();
  let mut best_node = graph.get_node(nearest_node_key)?;
  let mut private_mutations = seq_private_mutations.clone();

  loop {
    // Check how many mutations are shared with the branch leading to the current_best_node or any of its children
    let (candidate_node, candidate_split, shared_muts_score) =
      find_shared_muts(graph, best_node, &private_mutations, masked_ranges).wrap_err_with(|| {
        format!(
          "When calculating shared mutations against the current best node '{}'",
          best_node.payload().name
        )
      })?;

    // Check if the new candidate node is better than the current best
    let left_muts_score = score_nuc_muts(&candidate_split.left.nuc_muts, masked_ranges);
    match find_better_node_maybe(graph, best_node, candidate_node, shared_muts_score, left_muts_score) {
      None => break,
      Some(better_node) => best_node = better_node,
    }

    // Update query mutations to adjust for the new position of the placed node
    private_mutations = update_private_mutations(&private_mutations, &candidate_split).wrap_err_with(|| {
      format!(
        "When updating private mutations against the current best node '{}'",
        best_node.payload().name
      )
    })?;
  }

  Ok((best_node.key(), private_mutations))
}

/// Check how many mutations are shared with the branch leading to the current_best_node or any of its children
fn find_shared_muts<'g>(
  graph: &'g AuspiceGraph,
  best_node: &'g Node<AuspiceGraphNodePayload>,
  private_mutations: &BranchMutations,
  masked_ranges: &[NucRefGlobalRange],
) -> Result<(&'g Node<AuspiceGraphNodePayload>, SplitMutsResult, f64), Report> {
  let (mut candidate_split, mut shared_muts_score) = if best_node.is_root() {
    // Don't include node if node is root as we don't attach nodes above the root
    let candidate_split = SplitMutsResult {
      left: BranchMutations::default(),
      right: private_mutations.clone(),
      shared: BranchMutations::default(),
    };
    (candidate_split, 0.0)
  } else {
    let candidate_split = split_muts(&best_node.payload().tmp.private_mutations.invert(), private_mutations)
      .wrap_err_with(|| {
        format!(
          "When splitting mutations between query sequence and the nearest node '{}'",
          best_node.payload().name
        )
      })?;
    let shared_muts_score = score_nuc_muts(&candidate_split.shared.nuc_muts, masked_ranges);
    (candidate_split, shared_muts_score)
  };

  // Check all child nodes for shared mutations
  let mut candidate_node = best_node;
  for child in graph.iter_children_of(best_node) {
    let child_split = split_muts(&child.payload().tmp.private_mutations, private_mutations).wrap_err_with(|| {
      format!(
        "When splitting mutations between query sequence and the child node '{}'",
        child.payload().name
      )
    })?;
    let child_shared_muts_score = score_nuc_muts(&child_split.shared.nuc_muts, masked_ranges);
    if child_shared_muts_score > shared_muts_score {
      shared_muts_score = child_shared_muts_score;
      candidate_split = child_split;
      candidate_node = child;
    }
  }
  Ok((candidate_node, candidate_split, shared_muts_score))
}

/// Find out if the candidate node is better than the current best (with caveats).
/// Return a better node or `None` (if the current best node is to be preserved).
fn find_better_node_maybe<'g>(
  graph: &'g AuspiceGraph,
  best_node: &'g Node<AuspiceGraphNodePayload>,
  candidate_node: &'g Node<AuspiceGraphNodePayload>,
  shared_muts_score: f64,
  left_muts_score: f64,
) -> Option<&'g Node<AuspiceGraphNodePayload>> {
  if candidate_node == best_node {
    // best node is the node itself. Move up the tree if all mutations between
    // the candidate node and its parent are also in the private mutations.
    // This covers the case where the candidate is a leaf with zero length branch
    // as the  .left.nuc_muts is empty in that case
    if left_muts_score == 0.0 {
      return graph.parent_of(candidate_node);
    }
  } else if shared_muts_score > 0.0 {
    // candidate node is child node, move to child node if there are shared mutations
    // this should always be the case if the candidate node != best_node
    return Some(candidate_node);
  }
  // no improvement possible. Return None to stay
  None
}

/// Update private mutations to match the new best node
fn update_private_mutations(
  private_mutations: &BranchMutations,
  best_split_result: &SplitMutsResult,
) -> Result<BranchMutations, Report> {
  // Step 1: subtract shared mutations from private mutations
  let private_mutations = difference_of_muts(private_mutations, &best_split_result.shared).wrap_err(
    "When calculating difference of mutations between query sequence and the branch leading to the next attachment point"
  )?;

  // Step 2: We need to add the inverted remaining mutations on that branch.
  // Note that this can be necessary even if there are no left-over nuc_subs.
  // Amino acid mutations can be decoupled from the their nucleotide mutations or
  // changes in the amino acid sequences due to mutations in the same codon still need handling.
  let private_mutations = union_of_muts(&private_mutations, &best_split_result.left.invert()).wrap_err(
    "When calculating union of mutations between query sequence and the branch leading to the next attachment point.",
  )?;

  Ok(private_mutations)
}

pub fn attach_to_internal_node(
  graph: &mut AuspiceGraph,
  nearest_node_id: GraphNodeKey,
  new_private_mutations: &BranchMutations,
  result: &NextcladeOutputs,
  divergence_new_node: f64,
) -> Result<(), Report> {
  //generated auspice payload for new node
  let mut new_graph_node = create_new_auspice_node(result, new_private_mutations, divergence_new_node);
  new_graph_node.tmp.private_mutations = new_private_mutations.clone();

  // Create and add the new node to the graph.
  let new_node_key = graph.add_node(new_graph_node);
  graph.add_edge(nearest_node_id, new_node_key, AuspiceGraphEdgePayload::new())
}

pub fn convert_private_mutations_to_node_branch_attrs(mutations: &BranchMutations) -> BTreeMap<String, Vec<String>> {
  let mut branch_attrs = BTreeMap::<String, Vec<String>>::new();

  let nuc_muts = mutations.nuc_muts.iter().sorted().map(NucSub::to_string).collect_vec();
  branch_attrs.insert("nuc".to_owned(), nuc_muts);

  for (cds_name, aa_muts) in &mutations.aa_muts {
    if !aa_muts.is_empty() {
      let aa_muts = aa_muts.iter().sorted().map(AaSub::to_string_without_gene).collect_vec();
      branch_attrs.insert(cds_name.clone(), aa_muts);
    }
  }

  branch_attrs
}

pub fn convert_private_mutations_to_node_branch_attrs_aa_labels(aa_muts: &BTreeMap<String, Vec<AaSub>>) -> String {
  aa_muts
    .iter()
    .filter(|(_, aa_muts)| !aa_muts.is_empty())
    .map(|(cds_name, aa_muts)| {
      let aa_muts = aa_muts.iter().sorted().map(AaSub::to_string_without_gene).join(", ");
      format!("{cds_name}: {aa_muts}")
    })
    .join("; ")
}

struct KnitMuts {
  muts_common_branch: BranchMutations,
  muts_target_node: BranchMutations,
  muts_new_node: BranchMutations,
}

pub fn knit_into_graph(
  graph: &mut AuspiceGraph,
  target_key: GraphNodeKey,
  result: &NextcladeOutputs,
  private_mutations: &BranchMutations,
  ref_seq_len: usize,
  params: &TreeBuilderParams,
) -> Result<(), Report> {
  let masked_ranges = graph.data.meta.placement_mask_ranges().to_owned();
  let divergence_units = graph.data.tmp.divergence_units;

  // the target node will be the sister of the new node defined by "private mutations" and the "result"
  let target_node = graph.get_node(target_key)?;
  let target_node_auspice = target_node.payload();
  let target_node_div = &target_node_auspice.node_attrs.div.unwrap_or(0.0);
  let KnitMuts {
    muts_common_branch,
    muts_target_node,
    muts_new_node,
  } = if params.without_greedy_tree_builder || target_node.is_root() {
    // don't split branch if node is root as we don't attach nodes above the root
    KnitMuts {
      muts_common_branch: target_node_auspice.tmp.private_mutations.clone(), // Keep target node muts unchanged.
      muts_target_node: BranchMutations::default(),                          // Don't subtract any shared mutations.
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
  // if the node is a leaf or if there are non-shared mutations, need to split the branch above and insert aux node
  if target_node.is_leaf() || !muts_target_node.nuc_muts.is_empty() {
    // determine divergence of new internal node by subtracting shared reversions from target_node
    let divergence_middle_node = if target_node.is_root() {
      target_node_div
        - calculate_branch_length(
          &muts_target_node.nuc_muts,
          &masked_ranges,
          divergence_units,
          ref_seq_len,
        )
    } else {
      let parent_node = graph.parent_of(target_node).unwrap();
      let parent_node_auspice = parent_node.payload();
      let parent_node_div = &parent_node_auspice.node_attrs.div.unwrap_or(0.0);
      target_node_div.min(
        parent_node_div
          + calculate_branch_length(
            &muts_common_branch.nuc_muts,
            &masked_ranges,
            divergence_units,
            ref_seq_len,
          ),
      )
    };

    // generate new internal node
    // add private mutations, divergence, name and branch attrs to new internal node
    let new_internal_node = {
      let mut new_internal_node: AuspiceGraphNodePayload = target_node_auspice.to_owned();
      new_internal_node.tmp.private_mutations = muts_common_branch;
      new_internal_node.node_attrs.div = Some(divergence_middle_node);
      new_internal_node.branch_attrs.mutations =
        convert_private_mutations_to_node_branch_attrs(&new_internal_node.tmp.private_mutations);
      if let Some(labels) = &mut new_internal_node.branch_attrs.labels {
        labels.clade = None; //nuke existing clade labels
      }
      set_branch_attrs_aa_labels(&mut new_internal_node);

      new_internal_node.name = {
        let qry_name = &result.seq_name;
        let qry_index = &result.index;
        let target_name = &target_node_auspice.name;
        format!("nextclade__copy_of_{target_name}_for_placement_of_{qry_name}_#{qry_index}")
      };

      // Vote for the most plausible clade
      let (clade, should_relabel) = vote_for_clade(graph, target_node, result);
      new_internal_node.node_attrs.clade_membership = clade.as_deref().map(TreeNodeAttr::new);

      // Vote for the most plausible clade-like attrs
      let clade_attrs = vote_for_clade_like_attrs(graph, target_node, result);
      new_internal_node.set_clade_node_attrs(clade_attrs);

      // If decided, then move the clade label from target node to the internal node
      if should_relabel {
        let target_node = graph.get_node_mut(target_key)?;
        if let Some(target_labels) = &mut target_node.payload_mut().branch_attrs.labels {
          target_labels.clade = None;
          new_internal_node
            .branch_attrs
            .labels
            .get_or_insert(TreeBranchAttrsLabels::default())
            .clade = clade;
        }
      }

      new_internal_node
    };

    // Add node between target_node and its parent
    let new_internal_node_key = graph.add_node(new_internal_node);
    graph.insert_node_before(
      new_internal_node_key,
      target_key,
      AuspiceGraphEdgePayload::new(), // Edge payloads are currently dummy
      AuspiceGraphEdgePayload::new(), // Edge payloads are currently dummy
    )?;

    // update the mutations on the branch from the new_internal_node to the target node (without the shared mutations)
    // the mutations are inverted in the shared mutations struct, so have to invert them back
    let target_node = graph.get_node_mut(target_key)?;
    let target_node_auspice = target_node.payload_mut();
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
      divergence_middle_node
        + calculate_branch_length(&muts_new_node.nuc_muts, &masked_ranges, divergence_units, ref_seq_len),
    )?;
  } else {
    //can simply attach node
    attach_to_internal_node(
      graph,
      target_key,
      private_mutations,
      result,
      target_node_div + calculate_branch_length(&muts_new_node.nuc_muts, &masked_ranges, divergence_units, ref_seq_len),
    )?;
  }
  Ok(())
}

fn set_branch_attrs_aa_labels(node: &mut AuspiceGraphNodePayload) {
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

// Vote for the most plausible clade for the new internal node
fn vote_for_clade(
  graph: &AuspiceGraph,
  target_node: &Node<AuspiceGraphNodePayload>,
  result: &NextcladeOutputs,
) -> (Option<String>, bool) {
  let query_clade = &result.clade;

  let parent_node = &graph.parent_of(target_node);
  let parent_clade = &parent_node.and_then(|node| node.payload().clade());

  let target_clade = &target_node.payload().clade();

  let possible_clades = [parent_clade, query_clade, target_clade].into_iter().flatten(); // exclude None
  let clade = mode(possible_clades).cloned();

  // We will need to change branch label if both:
  //  - clade transition happens from parent to the new node
  // AND
  //  -  when the target node's clade wins the vote
  let should_relabel = (parent_clade != &clade) && (target_clade.is_some() && target_clade == &clade);

  (clade, should_relabel)
}

// Vote for the most plausible clade-like attribute values, for the new internal node
fn vote_for_clade_like_attrs(
  graph: &AuspiceGraph,
  target_node: &Node<AuspiceGraphNodePayload>,
  result: &NextcladeOutputs,
) -> BTreeMap<String, String> {
  let attr_descs = graph.data.meta.clade_node_attr_descs();

  let query_attrs: &BTreeMap<String, String> = &result.custom_node_attributes;

  let parent_node = &graph.parent_of(target_node);
  let parent_attrs: &BTreeMap<String, String> = &parent_node
    .map(|node| node.payload().get_clade_node_attrs(attr_descs))
    .unwrap_or_default();

  let target_attrs: &BTreeMap<String, String> = &target_node.payload().get_clade_node_attrs(attr_descs);

  chain!(query_attrs.iter(), parent_attrs.iter(), target_attrs.iter())
    .into_group_map()
    .into_iter()
    .filter_map(|(key, grouped_values)| {
      mode(grouped_values.into_iter().cloned()).map(|most_common| (key.clone(), most_common))
    })
    .collect()
}
