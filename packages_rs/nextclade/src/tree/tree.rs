use crate::alphabet::aa::Aa;
use crate::alphabet::nuc::Nuc;
use crate::analyze::find_private_nuc_mutations::BranchMutations;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition};
use crate::coord::range::NucRefGlobalRange;
use crate::graph::edge::{Edge, GraphEdge};
use crate::graph::graph::Graph;
use crate::graph::node::{GraphNode, Node};
use crate::graph::traits::{HasDivergence, HasName};
use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::BTreeMap;
use std::path::Path;
use std::slice::Iter;
use std::str::FromStr;
use traversal::{Bft, DftPost, DftPre};
use validator::Validate;

// HACK: keep space at the end: workaround for Auspice filtering out "Unknown"
// https://github.com/nextstrain/auspice/blob/797090f8092ffe1291b58efd113d2c5def8b092a/src/util/globals.js#L182
pub const AUSPICE_UNKNOWN_VALUE: &str = "Unknown ";

#[derive(Clone, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceGraphEdgePayload; // Edge payload is empty. Branch attributes are currently stored on nodes.

impl AuspiceGraphEdgePayload {
  pub const fn new() -> Self {
    Self {}
  }
}

impl<'de> Deserialize<'de> for AuspiceGraphEdgePayload {
  fn deserialize<D: Deserializer<'de>>(_deserializer: D) -> Result<Self, D::Error> {
    Ok(AuspiceGraphEdgePayload)
  }
}

impl Serialize for AuspiceGraphEdgePayload {
  fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
  where
    Ser: Serializer,
  {
    serializer.serialize_none()
  }
}

impl GraphEdge for AuspiceGraphEdgePayload {}

pub type AuspiceGraphNode = Node<AuspiceGraphNodePayload>;
pub type AuspiceGraphEdge = Edge<AuspiceGraphNodePayload>;

#[derive(Debug, Clone, Default)]
pub struct GraphTempData {
  pub max_divergence: f64,
  pub divergence_units: DivergenceUnits,
  pub other: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AuspiceGraphMeta {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub auspice_tree_version: Option<String>,

  pub meta: AuspiceTreeMeta,

  #[serde(skip)]
  #[serde(default)]
  pub tmp: GraphTempData,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

pub type AuspiceGraph = Graph<AuspiceGraphNodePayload, AuspiceGraphEdgePayload, AuspiceGraphMeta>;

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
pub struct TreeBranchAttrsLabels {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub aa: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub clade: Option<String>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct TreeBranchAttrs {
  pub mutations: BTreeMap<String, Vec<String>>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub labels: Option<TreeBranchAttrsLabels>,

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
#[derive(Clone, Debug, Default)]
pub struct TreeNodeTempData {
  pub substitutions: BTreeMap<NucRefGlobalPosition, Nuc>,
  pub mutations: BTreeMap<NucRefGlobalPosition, Nuc>,
  pub private_mutations: BranchMutations,
  pub aa_substitutions: BTreeMap<String, BTreeMap<AaRefPosition, Aa>>,
  pub aa_mutations: BTreeMap<String, BTreeMap<AaRefPosition, Aa>>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceGraphNodePayload {
  pub name: String,

  pub branch_attrs: TreeBranchAttrs,

  pub node_attrs: TreeNodeAttrs,

  #[serde(skip)]
  #[serde(default)]
  pub tmp: TreeNodeTempData,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl From<AuspiceTreeNode> for AuspiceGraphNodePayload {
  fn from(node: AuspiceTreeNode) -> Self {
    Self {
      name: node.name,
      branch_attrs: node.branch_attrs,
      node_attrs: node.node_attrs,
      tmp: TreeNodeTempData::default(),
      other: serde_json::Value::default(),
    }
  }
}

impl From<&AuspiceTreeNode> for AuspiceGraphNodePayload {
  fn from(node: &AuspiceTreeNode) -> Self {
    Self {
      name: node.name.clone(),
      branch_attrs: node.branch_attrs.clone(),
      node_attrs: node.node_attrs.clone(),
      tmp: TreeNodeTempData::default(),
      other: serde_json::Value::default(),
    }
  }
}

impl AuspiceGraphNodePayload {
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

impl GraphNode for AuspiceGraphNodePayload {}

impl HasDivergence for AuspiceGraphNodePayload {
  fn divergence(&self) -> f64 {
    self.node_attrs.div.unwrap_or_default()
  }
}

impl HasName for AuspiceGraphNodePayload {
  fn name(&self) -> &str {
    &self.name
  }
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceTreeNode {
  pub name: String,

  pub branch_attrs: TreeBranchAttrs,

  pub node_attrs: TreeNodeAttrs,

  #[serde(skip_serializing_if = "Vec::is_empty")]
  #[serde(default)]
  pub children: Vec<AuspiceTreeNode>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl AuspiceTreeNode {
  pub fn from_graph_node_payload(node: &AuspiceGraphNodePayload, children: Vec<AuspiceTreeNode>) -> Self {
    Self {
      name: node.name.clone(),
      branch_attrs: node.branch_attrs.clone(),
      node_attrs: node.node_attrs.clone(),
      children,
      other: serde_json::Value::default(),
    }
  }
}

#[derive(Clone, Serialize, Deserialize, Eq, PartialEq, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CladeNodeAttrKeyDesc {
  pub name: String,
  pub display_name: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  #[serde(default)]
  pub hide_in_web: bool,
  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Default, Serialize, Deserialize, Eq, PartialEq, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceMetaExtensionsNextclade {
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub clade_node_attrs: Vec<CladeNodeAttrKeyDesc>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub placement_mask_ranges: Vec<NucRefGlobalRange>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl AuspiceMetaExtensionsNextclade {
  pub fn is_empty(&self) -> bool {
    self == &Self::default()
  }
}

#[derive(Clone, Default, Serialize, Deserialize, Eq, PartialEq, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceMetaExtensions {
  #[serde(default, skip_serializing_if = "AuspiceMetaExtensionsNextclade::is_empty")]
  pub nextclade: AuspiceMetaExtensionsNextclade,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl AuspiceMetaExtensions {
  pub fn is_empty(&self) -> bool {
    self == &Self::default()
  }
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

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Default, Serialize, Deserialize, Eq, PartialEq, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceDisplayDefaults {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub branch_label: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub color_by: Option<String>,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub distance_measure: Option<String>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl AuspiceDisplayDefaults {
  pub fn is_empty(&self) -> bool {
    self == &Self::default()
  }
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceTreeMeta {
  #[serde(default, skip_serializing_if = "AuspiceMetaExtensions::is_empty")]
  pub extensions: AuspiceMetaExtensions,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub colorings: Vec<AuspiceColoring>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub panels: Vec<String>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub filters: Vec<String>,

  #[serde(default, skip_serializing_if = "AuspiceDisplayDefaults::is_empty")]
  pub display_defaults: AuspiceDisplayDefaults,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub geo_resolutions: Option<serde_json::Value>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl AuspiceTreeMeta {
  const fn extensions_nextclade(&self) -> &AuspiceMetaExtensionsNextclade {
    &self.extensions.nextclade
  }

  /// Extract placement masks
  pub fn placement_mask_ranges(&self) -> &[NucRefGlobalRange] {
    self.extensions_nextclade().placement_mask_ranges.as_slice()
  }

  /// Extract a list of descriptions of clade-like node attributes.
  /// These tell what additional entries to expect in node attributes (`node_attr`) of nodes.
  pub fn clade_node_attr_descs(&self) -> &[CladeNodeAttrKeyDesc] {
    self.extensions_nextclade().clade_node_attrs.as_slice()
  }
}

#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq, Default)]
pub enum DivergenceUnits {
  NumSubstitutionsPerYearPerSite,
  #[default]
  NumSubstitutionsPerYear,
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

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Validate, Debug)]
pub struct AuspiceTree {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub version: Option<String>,

  pub meta: AuspiceTreeMeta,

  pub tree: AuspiceTreeNode,

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
}
