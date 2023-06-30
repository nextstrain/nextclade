use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::divergence::calculate_divergence;
use crate::analyze::find_private_aa_mutations::find_private_aa_mutations;
use crate::analyze::find_private_aa_mutations::PrivateAaMutations;
use crate::analyze::find_private_nuc_mutations::find_private_nuc_mutations;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::virus_properties::VirusProperties;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition};
use crate::gene::gene_map::GeneMap;
use crate::io::nextclade_csv::{
  format_failed_genes, format_missings, format_non_acgtns, format_nuc_deletions, format_pcr_primer_changes,
};
use crate::translate::translate_genes::Translation;
use crate::tree::tree::{
  AuspiceTree, AuspiceTreeNode, DivergenceUnits, TreeBranchAttrs, TreeNodeAttr, TreeNodeAttrs, TreeNodeTempData,
  AUSPICE_UNKNOWN_VALUE,
};
use crate::tree::tree_builder::{
  add_mutations_to_vertices, build_directed_subtree, build_undirected_subtree, calculate_distance_matrix,
};
use crate::tree::tree_preprocess::{map_aa_muts, map_nuc_muts};
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use crate::{
  extract_enum_value,
  tree::tree_builder::{Graph, InternalMutations, NodeType, TreeNode},
};
use itertools::{chain, Itertools};
use serde_json::json;
use std::collections::BTreeMap;
use std::collections::HashMap;

pub fn tree_attach_new_nodes_in_place(tree: &mut AuspiceTree, results: &[NextcladeOutputs]) {
  tree_attach_new_nodes_impl_in_place_recursive(&mut tree.tree, results);
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

pub fn tree_attach_new_nodes_in_place_subtree(
  tree: &mut AuspiceTree,
  results: &[NextcladeOutputs],
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  virus_properties: &VirusProperties,
) {
  let mut pos_to_attach = HashMap::<usize, Vec<usize>>::new();
  for (i, result) in results.iter().enumerate() {
    let vec = Vec::new();
    let pos = pos_to_attach.entry(result.nearest_node_id).or_insert(vec);
    pos.push(i);
  }
  let div_units = &tree.tmp.divergence_units;
  tree_attach_new_nodes_impl_in_place_recursive_subtree(
    &mut tree.tree,
    results,
    &pos_to_attach,
    ref_seq,
    ref_peptides,
    gene_map,
    virus_properties,
    div_units,
  );
}

fn tree_attach_new_nodes_impl_in_place_recursive_subtree(
  node: &mut AuspiceTreeNode,
  results: &[NextcladeOutputs],
  attachment_positions: &HashMap<usize, Vec<usize>>,
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  virus_properties: &VirusProperties,
  div_units: &DivergenceUnits,
) {
  // Attach only to a reference node.
  // If it's not a reference node, we can stop here, because there can be no reference nodes down the tree.
  if !node.tmp.is_ref_node {
    return;
  }

  for child in &mut node.children {
    tree_attach_new_nodes_impl_in_place_recursive_subtree(
      child,
      results,
      attachment_positions,
      ref_seq,
      ref_peptides,
      gene_map,
      virus_properties,
      div_units,
    );
  }

  // Look for a query sample result for which this node was decided to be nearest
  let vec = attachment_positions.get(&node.tmp.id);
  if let Some(..) = vec {
    let unwrapped_vec = vec.unwrap();
    if unwrapped_vec.len() > 1 {
      attach_new_nodes(
        node,
        results,
        unwrapped_vec,
        ref_seq,
        ref_peptides,
        gene_map,
        virus_properties,
        div_units,
      );
    } else {
      for v in unwrapped_vec {
        let pos = &results[*v];
        attach_new_node(node, pos);
      }
    }
  }
}

fn attach_new_nodes(
  node: &mut AuspiceTreeNode,
  results: &[NextcladeOutputs],
  positions: &Vec<usize>,
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  virus_properties: &VirusProperties,
  div_units: &DivergenceUnits,
) {
  //compute subtree
  let dist_results = calculate_distance_matrix(node, results, positions, &virus_properties.placement_mask_ranges);
  let dist_matrix = dist_results.0;
  let element_order = dist_results.1;
  let g = build_undirected_subtree(dist_matrix, element_order);
  let parent_node = NodeType::TreeNode(TreeNode::new(node.tmp.id));
  let directed_g = build_directed_subtree(&parent_node, &g);
  //compute vertices mutations
  let mut vertices = HashMap::<NodeType, InternalMutations>::new();
  add_mutations_to_vertices(&parent_node, &directed_g, results, &mut vertices);
  //make sure node is still seen in tree
  if node.is_leaf() {
    add_aux_node(node);
  }
  //attach subtree to node
  attach_subtree(
    node,
    &parent_node,
    &directed_g,
    results,
    &vertices,
    ref_seq,
    ref_peptides,
    gene_map,
    virus_properties,
    div_units,
  );
}

//attach subtree to node
fn attach_subtree(
  auspice_node: &mut AuspiceTreeNode,
  graph_node: &NodeType,
  subtree: &Graph<NodeType, f64>,
  results: &[NextcladeOutputs],
  vertices: &HashMap<NodeType, InternalMutations>,
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  virus_properties: &VirusProperties,
  div_units: &DivergenceUnits,
) {
  let mut pre_nodes_to_attach = &subtree.adjacency[graph_node];
  //check if node is a singleton
  if pre_nodes_to_attach.len() == 1 {
    let t_n = (pre_nodes_to_attach[0]).0;
    let nodes_to_attach_test = &subtree.adjacency[&t_n];
    if !nodes_to_attach_test.is_empty() {
      pre_nodes_to_attach = nodes_to_attach_test;
    }
  }
  let nodes_to_attach = pre_nodes_to_attach;

  for v in nodes_to_attach {
    let t_n = (*v).0;
    let vertex_result = vertices.get(&t_n).unwrap();
    if let NodeType::NewSeqNode(_) = t_n {
      let index = extract_enum_value!(t_n, NodeType::NewSeqNode(c) => c);
      let result = &results[index.0];
      let (new_mutations, new_divergence) = recalculate_private_mutations(
        auspice_node,
        vertex_result,
        ref_seq,
        ref_peptides,
        gene_map,
        virus_properties,
        div_units,
      );
      add_child(auspice_node, result, Some((new_mutations, new_divergence)));
    } else if let NodeType::NewInternalNode(_) = t_n {
      let index = extract_enum_value!(t_n, NodeType::NewInternalNode(c) => c);
      let mut vert = compute_child(
        auspice_node,
        index.0,
        vertex_result,
        ref_seq,
        ref_peptides,
        gene_map,
        virus_properties,
        div_units,
      );
      attach_subtree(
        &mut vert,
        &t_n,
        subtree,
        results,
        vertices,
        ref_seq,
        ref_peptides,
        gene_map,
        virus_properties,
        div_units,
      );
      add_computed_child(auspice_node, vert);
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

  add_child(node, result, None);
}

fn add_aux_node(node: &mut AuspiceTreeNode) {
  //debug_assert!(node.is_ref_node());

  let mut aux_node = node.clone();
  aux_node.branch_attrs.mutations.clear();
  // Remove other branch attrs like labels to prevent duplication
  aux_node.branch_attrs.other = serde_json::Value::default();
  node.children.push(aux_node);

  node.name = format!("{}_parent", node.name);
}

fn add_child(
  node: &mut AuspiceTreeNode,
  result: &NextcladeOutputs,
  new_values: Option<(BTreeMap<String, Vec<String>>, f64)>,
) {
  let (mutations, divergence) = match new_values {
    None => (convert_mutations_to_node_branch_attrs(result), result.divergence),
    Some(ref x) => new_values.unwrap(),
  };

  let alignment = format!(
    "start: {}, end: {} (score: {})",
    result.alignment_range.begin, result.alignment_range.end, result.alignment_score
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

  let custom_node_attributes_json = result
    .custom_node_attributes
    .clone()
    .into_iter()
    .map(|(key, val)| (key, json!({ "value": val })))
    .collect_vec();

  let phenotype_values_json = result.phenotype_values.as_ref().map_or(vec![], |phenotype_values| {
    phenotype_values
      .iter()
      .map(|val| (val.name.clone(), json!({ "value": val.value.to_string() })))
      .collect_vec()
  });

  let other: serde_json::Value = chain!(phenotype_values_json, custom_node_attributes_json).collect();

  node.children.insert(
    0,
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
        placement_prior: None,
        alignment: Some(TreeNodeAttr::new(&alignment)),
        missing: Some(TreeNodeAttr::new(&format_missings(&result.missing, ", "))),
        gaps: Some(TreeNodeAttr::new(&format_nuc_deletions(&result.deletions, ", "))),
        non_acgtns: Some(TreeNodeAttr::new(&format_non_acgtns(&result.non_acgtns, ", "))),
        has_pcr_primer_changes,
        pcr_primer_changes,
        qc_status: Some(TreeNodeAttr::new(&result.qc.overall_status.to_string())),
        missing_genes: Some(TreeNodeAttr::new(&format_failed_genes(&result.missing_genes, ", "))),
        other,
      },
      children: vec![],
      tmp: TreeNodeTempData::default(),
      other: serde_json::Value::default(),
    },
  );
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

fn convert_private_mutations_to_node_branch_attrs(
  private_nuc_mutations: &PrivateNucMutations,
  private_aa_mutations: &BTreeMap<String, PrivateAaMutations>,
) -> BTreeMap<String, Vec<String>> {
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
    .map(NucSub::from)
    .collect_vec();

  let mut subs = concat_to_vec(&private_nuc_mutations.private_substitutions, &dels_as_subs);
  subs.sort();

  subs.iter().map(NucSub::to_string).collect_vec()
}

fn convert_aa_mutations_to_node_branch_attrs(private_aa_mutations: &PrivateAaMutations) -> Vec<String> {
  let dels_as_subs = private_aa_mutations
    .private_deletions
    .iter()
    .map(AaDel::to_sub)
    .collect_vec();

  let mut subs = concat_to_vec(&private_aa_mutations.private_substitutions, &dels_as_subs);
  subs.sort();

  subs.iter().map(AaSub::to_string_without_gene).collect_vec()
}

fn recalculate_private_mutations(
  node: &mut AuspiceTreeNode,
  result: &InternalMutations,
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  virus_properties: &VirusProperties,
  div_units: &DivergenceUnits,
) -> (BTreeMap<String, Vec<String>>, f64) {
  let private_nuc_mut = find_private_nuc_mutations(
    node,
    &result.substitutions,
    &result.deletions,
    &result.missing,
    &result.alignment_range,
    ref_seq,
    virus_properties,
  );
  let private_aa_mut = find_private_aa_mutations(
    node,
    &result.aa_substitutions,
    &result.aa_deletions,
    &result.unknown_aa_ranges,
    ref_peptides,
    gene_map,
  );
  let mutations = convert_private_mutations_to_node_branch_attrs(&private_nuc_mut, &private_aa_mut);

  let divergence = calculate_divergence(node, &private_nuc_mut, div_units, ref_seq.len());

  (mutations, divergence)
}

fn compute_child(
  node: &mut AuspiceTreeNode,
  index: usize,
  result: &InternalMutations,
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  virus_properties: &VirusProperties,
  div_units: &DivergenceUnits,
) -> AuspiceTreeNode {
  let (mutations, divergence) = recalculate_private_mutations(
    node,
    result,
    ref_seq,
    ref_peptides,
    gene_map,
    virus_properties,
    div_units,
  );
  //if reversions should not count to length
  //private_nuc_mut.total_private_substitutions = private_nuc_mut.total_private_substitutions - private_nuc_mut.total_reversion_substitutions;

  let mut new_node = AuspiceTreeNode {
    name: format!("{}_new_subtree", index),
    branch_attrs: TreeBranchAttrs {
      mutations,
      other: serde_json::Value::default(),
    },
    node_attrs: TreeNodeAttrs {
      div: Some(divergence),
      clade_membership: TreeNodeAttr::new(&node.clade()),
      node_type: Some(TreeNodeAttr::new("New")),
      region: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      country: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      division: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      placement_prior: None,
      alignment: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      missing: Some(TreeNodeAttr::new(&format_missings(&result.missing, ", "))),
      gaps: Some(TreeNodeAttr::new(&format_nuc_deletions(&result.deletions, ", "))),
      non_acgtns: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      has_pcr_primer_changes: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      pcr_primer_changes: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      missing_genes: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      qc_status: Some(TreeNodeAttr::new(AUSPICE_UNKNOWN_VALUE)),
      other: serde_json::Value::default(),
    },
    children: vec![],
    tmp: TreeNodeTempData::default(),
    other: serde_json::Value::default(),
  };
  let nuc_muts: BTreeMap<NucRefGlobalPosition, Nuc> = map_nuc_muts(&new_node, ref_seq, &node.tmp.mutations).unwrap();
  let nuc_subs: BTreeMap<NucRefGlobalPosition, Nuc> =
    nuc_muts.clone().into_iter().filter(|(_, nuc)| !nuc.is_gap()).collect();

  let aa_muts: BTreeMap<String, BTreeMap<AaRefPosition, Aa>> =
    map_aa_muts(&new_node, ref_peptides, &node.tmp.aa_mutations).unwrap();
  let aa_subs: BTreeMap<String, BTreeMap<AaRefPosition, Aa>> = aa_muts
    .clone()
    .into_iter()
    .map(|(gene, aa_muts)| (gene, aa_muts.into_iter().filter(|(_, aa)| !aa.is_gap()).collect()))
    .collect();

  new_node.tmp.mutations = nuc_muts;
  new_node.tmp.substitutions = nuc_subs;
  new_node.tmp.aa_mutations = aa_muts;
  new_node.tmp.aa_substitutions = aa_subs;

  new_node
}

fn add_computed_child(node: &mut AuspiceTreeNode, new_node: AuspiceTreeNode) {
  node.children.insert(0, new_node);
}
