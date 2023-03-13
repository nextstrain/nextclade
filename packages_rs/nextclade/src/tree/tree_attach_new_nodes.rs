use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::find_private_aa_mutations::PrivateAaMutations;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::nuc_del::NucDelMinimal;
use crate::analyze::nuc_sub::NucSub;
use crate::io::nextclade_csv::{
  format_failed_genes, format_missings, format_non_acgtns, format_nuc_deletions, format_pcr_primer_changes,
};
use crate::tree::tree::{
  AuspiceTree, AuspiceTreeNode, TreeBranchAttrs, TreeNodeAttr, TreeNodeAttrs, TreeNodeTempData, AUSPICE_UNKNOWN_VALUE,
};
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use itertools::Itertools;
use serde_json::json;
use std::collections::BTreeMap;

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

  node.children.insert(
    0,
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
