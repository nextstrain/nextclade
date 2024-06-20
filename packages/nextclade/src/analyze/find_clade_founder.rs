use crate::analyze::find_private_aa_mutations::{
  find_private_aa_mutations, FindPrivateAaMutationsParams, PrivateAaMutations,
};
use crate::analyze::find_private_nuc_mutations::{
  find_private_nuc_mutations, FindPrivateNucMutationsParams, PrivateNucMutations,
};
use crate::graph::node::GraphNodeKey;
use crate::tree::tree::AuspiceGraph;
use crate::tree::tree_find_clade_founder::{graph_find_clade_founder, graph_find_node_attr_founder};
use eyre::Report;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Serialize, Deserialize, JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct CladeFounderInfo {
  pub clade: String,
  pub node_key: GraphNodeKey,
  pub node_name: String,
  pub nuc_mutations: PrivateNucMutations,
  pub aa_mutations: BTreeMap<String, PrivateAaMutations>,
}

pub fn find_clade_founder(
  graph: &AuspiceGraph,
  nearest_node_id: GraphNodeKey,
  clade: &Option<String>,
  nuc_params: &FindPrivateNucMutationsParams,
  aa_params: &FindPrivateAaMutationsParams,
) -> Result<Option<CladeFounderInfo>, Report> {
  clade
    .as_ref()
    .map(|clade| -> Result<_, Report> {
      let node_key = graph_find_clade_founder(graph, nearest_node_id, clade)?;
      let node = graph.get_node(node_key)?.payload();
      let nuc_mutations = find_private_nuc_mutations(node, nuc_params);
      let aa_mutations = find_private_aa_mutations(node, aa_params)?;
      Ok(CladeFounderInfo {
        clade: clade.to_owned(),
        node_key,
        node_name: node.name.clone(),
        nuc_mutations,
        aa_mutations,
      })
    })
    .transpose()
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CladeNodeAttrFounderInfo {
  pub key: String,
  pub value: String,
  pub node_key: GraphNodeKey,
  pub node_name: String,
  pub nuc_mutations: PrivateNucMutations,
  pub aa_mutations: BTreeMap<String, PrivateAaMutations>,
}

pub fn find_clade_node_attrs_founders(
  graph: &AuspiceGraph,
  nearest_node_id: GraphNodeKey,
  clade_node_attrs: &BTreeMap<String, String>,
  nuc_params: &FindPrivateNucMutationsParams,
  aa_params: &FindPrivateAaMutationsParams,
) -> Result<BTreeMap<String, CladeNodeAttrFounderInfo>, Report> {
  clade_node_attrs
    .iter()
    .map(|(key, value)| {
      let node_key = graph_find_node_attr_founder(graph, nearest_node_id, key, value)?;
      let node = graph.get_node(node_key)?.payload();
      let nuc_mutations = find_private_nuc_mutations(node, nuc_params);
      let aa_mutations = find_private_aa_mutations(node, aa_params)?;
      Ok((
        key.clone(),
        CladeNodeAttrFounderInfo {
          key: key.to_owned(),
          value: value.to_owned(),
          node_key,
          node_name: node.name.clone(),
          nuc_mutations,
          aa_mutations,
        },
      ))
    })
    .collect()
}
