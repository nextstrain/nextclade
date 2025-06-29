use crate::analyze::find_private_aa_mutations::{
  find_private_aa_mutations, FindPrivateAaMutationsParams, PrivateAaMutations,
};
use crate::analyze::find_private_nuc_mutations::{
  find_private_nuc_mutations, FindPrivateNucMutationsParams, PrivateNucMutations,
};
use crate::graph::node::GraphNodeKey;
use crate::o;
use crate::tree::tree::{AuspiceGraph, CladeNodeAttrKeyDesc};
use crate::tree::tree_find_clade_founder::{graph_find_clade_founder, graph_find_node_attr_founder};
use eyre::Report;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CladeNodeAttrFounderInfo {
  pub key: String,
  pub value: String,
  pub node_key: GraphNodeKey,
  pub node_name: String,
  #[serde(default, skip_serializing_if = "PrivateNucMutations::is_empty")]
  pub nuc_mutations: PrivateNucMutations,
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub aa_mutations: BTreeMap<String, PrivateAaMutations>,
}

pub fn find_clade_founder(
  graph: &AuspiceGraph,
  nearest_node_id: GraphNodeKey,
  clade: &Option<String>,
  nuc_params: &FindPrivateNucMutationsParams,
  aa_params: &FindPrivateAaMutationsParams,
) -> Result<Option<CladeNodeAttrFounderInfo>, Report> {
  clade
    .as_ref()
    .map(|clade| -> Result<_, Report> {
      let node_key = graph_find_clade_founder(graph, nearest_node_id, clade)?;
      let node = graph.get_node(node_key)?.payload();
      let nuc_mutations = find_private_nuc_mutations(node, nuc_params);
      let aa_mutations = find_private_aa_mutations(node, aa_params)?;
      Ok(CladeNodeAttrFounderInfo {
        key: o!("clade"),
        value: clade.to_owned(),
        node_key,
        node_name: node.name.clone(),
        nuc_mutations,
        aa_mutations,
      })
    })
    .transpose()
}

pub fn find_clade_node_attrs_founders(
  graph: &AuspiceGraph,
  nearest_node_id: GraphNodeKey,
  clade_node_attr_descs: &[CladeNodeAttrKeyDesc],
  nuc_params: &FindPrivateNucMutationsParams,
  aa_params: &FindPrivateAaMutationsParams,
) -> Result<BTreeMap<String, CladeNodeAttrFounderInfo>, Report> {
  let node = graph.get_node(nearest_node_id)?.payload();

  clade_node_attr_descs
    .iter()
    .filter(|desc| !desc.skip_as_reference)
    .filter_map(|desc| {
      let key = desc.name.clone();
      let value = node.get_clade_node_attr(&key);
      value.map(|value| (key, value.to_owned()))
    })
    .map(|(key, value)| {
      let node_key = graph_find_node_attr_founder(graph, nearest_node_id, &key, &value)?;
      let node = graph.get_node(node_key)?.payload();
      let nuc_mutations = find_private_nuc_mutations(node, nuc_params);
      let aa_mutations = find_private_aa_mutations(node, aa_params)?;
      Ok((
        key.clone(),
        CladeNodeAttrFounderInfo {
          key,
          value,
          node_key,
          node_name: node.name.clone(),
          nuc_mutations,
          aa_mutations,
        },
      ))
    })
    .collect()
}
