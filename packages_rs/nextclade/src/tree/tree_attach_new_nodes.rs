use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_private_aa_mutations::PrivateAaMutations;
use crate::analyze::find_private_nuc_mutations::{PrivateMutationsMinimal, PrivateNucMutations};
use crate::analyze::nuc_sub::NucSub;
use crate::io::nextclade_csv::{
  format_failed_genes, format_missings, format_non_acgtns, format_nuc_deletions, format_pcr_primer_changes,
};
use crate::tree::tree::{
  AuspiceTreeNode, TreeBranchAttrs, TreeNodeAttr, TreeNodeAttrs, TreeNodeTempData, AUSPICE_UNKNOWN_VALUE,
};
use crate::tree::tree_builder::convert_private_mutations_to_node_branch_attrs;
use crate::types::outputs::NextcladeOutputs;
use crate::utils::collections::concat_to_vec;
use itertools::{chain, Itertools};
use serde_json::json;

pub fn create_new_auspice_node(
  result: &NextcladeOutputs,
  new_private_mutations: &PrivateMutationsMinimal,
  new_divergence: f64,
) -> AuspiceTreeNode {
  let mutations = convert_private_mutations_to_node_branch_attrs(new_private_mutations);

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

  AuspiceTreeNode {
    name: format!("{}_new", result.seq_name),
    branch_attrs: TreeBranchAttrs {
      mutations,
      labels: None,
      other: serde_json::Value::default(),
    },
    node_attrs: TreeNodeAttrs {
      div: Some(new_divergence),
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
  }
}
