use crate::io::aa::Aa;
use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::io::nuc::Nuc;
use eyre::{Report, WrapErr};
use indexmap::IndexMap;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use std::slice::Iter;
use std::str::FromStr;
use traversal::{Bft, DftPost, DftPre};
use validator::Validate;

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct TreeNodeAttr {
  pub value: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct TreeBranchAttrs {
  pub mutations: BTreeMap<String, Vec<String>>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct TreeNodeAttrs {
  pub div: f64,

  pub clade_membership: TreeNodeAttr,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Node type")]
  pub node_type: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub region: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub country: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub division: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Alignment")]
  pub alignment: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Missing")]
  pub missing: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Missing")]
  gaps: Option<TreeNodeAttr>,

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

/// Temporary data internal to Nextclade.
/// It is not serialized or deserialized, but is added during preprocessing step and then used for internal calculations
#[derive(Clone, Default, Debug)]
pub struct TreeNodeTempData {
  pub id: usize,
  pub substitutions: BTreeMap<usize, Nuc>,
  pub mutations: BTreeMap<usize, Nuc>,
  pub aa_substitutions: BTreeMap<String, BTreeMap<usize, Aa>>,
  pub aa_mutations: BTreeMap<String, BTreeMap<usize, Aa>>,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct AuspiceTreeNode {
  pub name: String,

  pub branch_attrs: TreeBranchAttrs,

  pub node_attrs: TreeNodeAttrs,

  #[serde(skip_serializing_if = "Vec::is_empty")]
  #[serde(default)]
  pub children: Vec<AuspiceTreeNode>,

  #[serde(skip)]
  #[serde(default)]
  pub tmp: TreeNodeTempData,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CladeNodeAttr {
  pub name: String,
  pub display_name: String,
  pub description: String,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct AuspiceMetaExtensionsNextclade {
  pub clade_node_attrs: Vec<CladeNodeAttr>,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct AuspiceMetaExtensions {
  pub nextclade: AuspiceMetaExtensionsNextclade,
}

#[derive(Clone, Serialize, Deserialize, Validate, Debug)]
pub struct AuspiceTreeMeta {
  pub extensions: AuspiceMetaExtensions,

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

pub type AuspiceTreeNodeIter<'a> = Iter<'a, AuspiceTreeNode>;

pub type AuspiceTreeNodeIterFn<'a> = fn(&'a AuspiceTreeNode) -> AuspiceTreeNodeIter<'_>;

impl FromStr for AuspiceTree {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    json_parse(s)
  }
}

impl AuspiceTree {
  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let data =
      read_file_to_string(filepath).wrap_err_with(|| format!("When reading Auspice Tree JSON file {filepath:#?}"))?;
    Self::from_str(&data).wrap_err_with(|| format!("When parsing Auspice Tree JSON file {filepath:#?}"))
  }

  pub fn to_string_pretty(&self) -> Result<String, Report> {
    let mut tree_str = serde_json::to_string_pretty(self)?;
    tree_str += "\n";
    Ok(tree_str)
  }

  /// Returns iterator for breadth-first tree traversal
  pub fn iter_breadth_first<'a>(
    &'a self,
  ) -> Bft<'a, AuspiceTreeNode, AuspiceTreeNodeIterFn<'a>, AuspiceTreeNodeIter<'a>> {
    Bft::new(&self.tree, |node: &'a AuspiceTreeNode| node.children.iter())
  }

  /// Returns iterator for depth-first pre-order tree traversal
  pub fn iter_depth_first_preorder<'a>(
    &'a self,
  ) -> DftPre<'a, AuspiceTreeNode, AuspiceTreeNodeIterFn<'a>, AuspiceTreeNodeIter<'a>> {
    DftPre::new(&self.tree, |node: &'a AuspiceTreeNode| node.children.iter())
  }

  /// Returns iterator for depth-first post-order tree traversal
  pub fn iter_depth_first_postorder<'a>(
    &'a self,
  ) -> DftPost<'a, AuspiceTreeNode, AuspiceTreeNodeIterFn<'a>, AuspiceTreeNodeIter<'a>> {
    DftPost::new(&self.tree, |node: &'a AuspiceTreeNode| node.children.iter())
  }

  fn map_nodes_rec(index: usize, node: &AuspiceTreeNode, action: fn((usize, &AuspiceTreeNode))) {
    action((index, node));
    for child in &node.children {
      Self::map_nodes_rec(index + 1, child, action);
    }
  }

  /// Iterates over nodes and applies a function to each. Immutable version.
  pub fn map_nodes(&self, action: fn((usize, &AuspiceTreeNode))) {
    Self::map_nodes_rec(0, &self.tree, action);
  }

  fn map_nodes_mut_rec(index: usize, node: &mut AuspiceTreeNode, action: fn((usize, &mut AuspiceTreeNode))) {
    action((index, node));
    for child in &mut node.children {
      Self::map_nodes_mut_rec(index + 1, child, action);
    }
  }

  /// Iterates over nodes and applies a function to each. Mutable version.
  pub fn map_nodes_mut(&mut self, action: fn((usize, &mut AuspiceTreeNode))) {
    Self::map_nodes_mut_rec(0, &mut self.tree, action);
  }
}
