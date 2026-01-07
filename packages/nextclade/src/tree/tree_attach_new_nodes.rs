use crate::analyze::find_private_nuc_mutations::BranchMutations;
use crate::io::nextclade_csv_row::{
  format_failed_cdses, format_missings, format_non_acgtns, format_nuc_deletions, format_pcr_primer_changes,
};
use crate::tree::tree::{
  AuspiceGraphNodePayload, TreeBranchAttrs, TreeBranchAttrsLabels, TreeNodeAttr, TreeNodeAttrs, TreeNodeTempData,
};
use crate::tree::tree_builder::{
  convert_private_mutations_to_node_branch_attrs, convert_private_mutations_to_node_branch_attrs_aa_labels,
};
use crate::types::outputs::NextcladeOutputs;
use itertools::{Itertools, chain};
use serde_json::json;

pub fn create_new_auspice_node(
  result: &NextcladeOutputs,
  new_private_mutations: &BranchMutations,
  new_divergence: f64,
) -> AuspiceGraphNodePayload {
  let mutations = convert_private_mutations_to_node_branch_attrs(new_private_mutations);

  let alignment = format!(
    "start: {}, end: {} (score: {})",
    result.alignment_range.begin, result.alignment_range.end, result.alignment_score
  );

  let (has_pcr_primer_changes, pcr_primer_changes) = if result.total_pcr_primer_changes == 0 {
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

  AuspiceGraphNodePayload {
    name: result.seq_name.clone(),
    branch_attrs: TreeBranchAttrs {
      mutations,
      labels: Some(TreeBranchAttrsLabels {
        aa: Some(convert_private_mutations_to_node_branch_attrs_aa_labels(
          &new_private_mutations.aa_muts,
        )),
        clade: None,
        other: serde_json::Value::default(),
      }),
      other: serde_json::Value::default(),
    },
    node_attrs: TreeNodeAttrs {
      div: Some(new_divergence),
      clade_membership: result.clade.as_ref().map(|clade| TreeNodeAttr::new(clade)),
      node_type: Some(TreeNodeAttr::new("New")),
      region: None,
      country: None,
      division: None,
      placement_prior: None,
      alignment: Some(TreeNodeAttr::new(&alignment)),
      missing: Some(TreeNodeAttr::new(&format_missings(&result.missing, ", "))),
      gaps: Some(TreeNodeAttr::new(&format_nuc_deletions(&result.deletions, ", "))),
      non_acgtns: Some(TreeNodeAttr::new(&format_non_acgtns(&result.non_acgtns, ", "))),
      has_pcr_primer_changes,
      pcr_primer_changes,
      qc_status: Some(TreeNodeAttr::new(&result.qc.overall_status.to_string())),
      missing_cdses: Some(TreeNodeAttr::new(&format_failed_cdses(&result.missing_cdses, ", "))),
      other,
    },
    tmp: TreeNodeTempData::default(),
    other: serde_json::Value::default(),
  }
}
