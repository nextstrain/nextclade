use crate::alphabet::aa::Aa;
use crate::alphabet::nuc::Nuc;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition};
use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use std::slice::Iter;
use std::str::FromStr;
use traversal::{Bft, DftPost, DftPre};
use validator::Validate;

// HACK: keep space at the end: workaround for Auspice filtering out "Unknown"
// https://github.com/nextstrain/auspice/blob/797090f8092ffe1291b58efd113d2c5def8b092a/src/util/globals.js#L182
pub const AUSPICE_UNKNOWN_VALUE: &str = "Unknown ";

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct TreeNodeAttr {
  pub value: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl TreeNodeAttr {
  pub fn new(value: &str) -> Self {
    Self {
      value: value.to_owned(),
      other: serde_json::Value::default(),
    }
  }
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct TreeNodeAttrF64 {
  pub value: f64,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl TreeNodeAttrF64 {
  pub fn new(value: f64) -> Self {
    Self {
      value,
      other: serde_json::Value::default(),
    }
  }
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct TreeBranchAttrs {
  pub mutations: BTreeMap<String, Vec<String>>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct TreeNodeAttrs {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub div: Option<f64>,

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
  pub placement_prior: Option<TreeNodeAttrF64>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Alignment")]
  pub alignment: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Missing")]
  pub missing: Option<TreeNodeAttr>,

  #[serde(skip_serializing_if = "Option::is_none")]
  #[serde(rename = "Gaps")]
  pub gaps: Option<TreeNodeAttr>,

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
  pub substitutions: BTreeMap<NucRefGlobalPosition, Nuc>,
  pub mutations: BTreeMap<NucRefGlobalPosition, Nuc>,
  pub aa_substitutions: BTreeMap<String, BTreeMap<AaRefPosition, Aa>>,
  pub aa_mutations: BTreeMap<String, BTreeMap<AaRefPosition, Aa>>,
  pub is_ref_node: bool,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
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

impl AuspiceTreeNode {
  pub fn is_leaf(&self) -> bool {
    self.children.is_empty()
  }

  pub const fn is_ref_node(&self) -> bool {
    self.tmp.is_ref_node
  }

  /// Extracts clade of the node
  pub fn clade(&self) -> String {
    self.node_attrs.clade_membership.value.clone()
  }

  /// Extracts clade-like node attributes, given a list of key descriptions
  pub fn get_clade_node_attrs(&self, clade_node_attr_keys: &[CladeNodeAttrKeyDesc]) -> BTreeMap<String, String> {
    clade_node_attr_keys
      .iter()
      .filter_map(|attr| {
        let key = &attr.name;
        let attr_obj = self.node_attrs.other.get(key);
        match attr_obj {
          Some(attr) => attr.get("value"),
          None => None,
        }
        .and_then(|val| val.as_str().map(|val| (key.clone(), val.to_owned())))
      })
      .collect()
  }
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CladeNodeAttrKeyDesc {
  pub name: String,
  pub display_name: String,
  pub description: String,
  #[serde(default)]
  pub hide_in_web: bool,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceMetaExtensionsNextclade {
  pub clade_node_attrs: Option<Vec<CladeNodeAttrKeyDesc>>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceMetaExtensions {
  pub nextclade: Option<AuspiceMetaExtensionsNextclade>,
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema, Validate)]
pub struct AuspiceColoring {
  #[serde(rename = "type")]
  pub type_: String,

  pub key: String,

  pub title: String,

  #[serde(skip_serializing_if = "Vec::is_empty")]
  #[serde(default)]
  pub scale: Vec<[String; 2]>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceDisplayDefaults {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub branch_label: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub color_by: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub distance_measure: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceTreeMeta {
  pub extensions: Option<AuspiceMetaExtensions>,

  #[serde(skip_serializing_if = "Vec::<AuspiceColoring>::is_empty")]
  #[serde(default)]
  pub colorings: Vec<AuspiceColoring>,

  #[serde(skip_serializing_if = "Vec::<String>::is_empty")]
  #[serde(default)]
  pub panels: Vec<String>,

  #[serde(skip_serializing_if = "Vec::<String>::is_empty")]
  #[serde(default)]
  pub filters: Vec<String>,

  pub display_defaults: AuspiceDisplayDefaults,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub geo_resolutions: Option<serde_json::Value>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[repr(u8)]
#[derive(Debug, Clone, Eq, PartialEq)]
pub enum DivergenceUnits {
  NumSubstitutionsPerYearPerSite,
  NumSubstitutionsPerYear,
}

impl Default for DivergenceUnits {
  fn default() -> Self {
    DivergenceUnits::NumSubstitutionsPerYear
  }
}

impl DivergenceUnits {
  ///
  /// Guesses the unit of measurement of divergence, based on the greatest value of divergence on the tree
  ///
  pub fn guess_from_max_divergence(max_divergence: f64) -> DivergenceUnits {
    // FIXME: This should be fixed upstream in augur & auspice, but it is hard to do without breaking Auspice JSON v2 format.
    // Taken from: https://github.com/nextstrain/auspice/blob/6a2d0f276fccf05bfc7084608bb0010a79086c83/src/components/tree/phyloTree/renderers.js#L376
    // A quote from there:
    //  > Prior to Jan 2020, the divergence measure was always "subs per site per year"
    //  > however certain datasets changed this to "subs per year" across entire sequence.
    //  > This distinction is not set in the JSON, so in order to correctly display the rate
    //  > we will "guess" this here. A future augur update will export this in a JSON key,
    //  > removing the need to guess
    //
    // HACK: Arbitrary threshold to make a guess
    const HACK_MAX_DIVERGENCE_THRESHOLD: f64 = 5.0;
    if max_divergence <= HACK_MAX_DIVERGENCE_THRESHOLD {
      DivergenceUnits::NumSubstitutionsPerYearPerSite
    } else {
      DivergenceUnits::NumSubstitutionsPerYear
    }
  }
}

#[derive(Debug, Clone, Default)]
pub struct TreeTempData {
  pub max_divergence: f64,
  pub divergence_units: DivergenceUnits,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceTree {
  pub meta: AuspiceTreeMeta,

  pub tree: AuspiceTreeNode,

  #[serde(skip)]
  #[serde(default)]
  pub tmp: TreeTempData,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

pub type AuspiceTreeNodeIter<'a> = Iter<'a, AuspiceTreeNode>;

pub type AuspiceTreeNodeIterFn<'a> = fn(&'a AuspiceTreeNode) -> AuspiceTreeNodeIter<'_>;

impl FromStr for AuspiceTree {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    json_parse(s).wrap_err("When parsing Auspice Tree JSON contents")
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

  #[rustfmt::skip]
  pub fn clade_node_attr_descs_maybe(&self) -> Option<&[CladeNodeAttrKeyDesc]> {
    self.meta
      .extensions.as_ref()?
      .nextclade.as_ref()?
      .clade_node_attrs.as_deref()
  }

  /// Extracts a list of descriptions of clade-like node attributes.
  /// These tell what additional entries to expect in node attributes (`node_attr`) of nodes.
  pub fn clade_node_attr_descs(&self) -> &[CladeNodeAttrKeyDesc] {
    self.clade_node_attr_descs_maybe().unwrap_or(&[])
  }
}
