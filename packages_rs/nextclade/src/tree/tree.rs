use eyre::Report;
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::str::FromStr;
use validator::Validate;

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct TreeNodeAttr {
  value: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct TreeBranchAttrs {
  mutations: IndexMap<String, Vec<String>>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[allow(non_snake_case)]
#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct TreeNodeAttrs {
  pub div: f64,

  pub clade_membership: TreeNodeAttr,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Node type")]
  pub node_type: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  region: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  country: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  division: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  Alignment: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  Missing: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  Gaps: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Non-ACGTNs")]
  pub non_acgtns: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Has PCR primer changes")]
  pub has_pcr_primer_changes: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "PCR primer changes")]
  pub pcr_primer_changes: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "QC Status")]
  pub qc_status: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Missing genes")]
  pub missing_genes: Option<TreeNodeAttr>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct AuspiceTreeNode {
  pub name: String,

  pub branch_attrs: TreeBranchAttrs,

  pub node_attrs: TreeNodeAttrs,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub children: Option<Vec<AuspiceTreeNode>>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct AuspiceTreeMeta {
  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct AuspiceTree {
  pub meta: AuspiceTreeMeta,

  pub tree: AuspiceTreeNode,

  #[serde(flatten)]
  pub other: serde_json::Value,

  pub version: String,
}

impl FromStr for AuspiceTree {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let tree = serde_json::from_str::<AuspiceTree>(s)?;
    Ok(tree)
  }
}

impl AuspiceTree {
  pub fn to_string_pretty(&self) -> Result<String, Report> {
    let mut tree_str = serde_json::to_string_pretty(self)?;
    tree_str += "\n";
    Ok(tree_str)
  }
}
