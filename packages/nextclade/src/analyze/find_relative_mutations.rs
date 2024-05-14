use crate::alphabet::nuc::Nuc;
use crate::analyze::find_private_nuc_mutations::{find_private_nuc_mutations, PrivateNucMutations};
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::virus_properties::VirusProperties;
use crate::coord::range::NucRefGlobalRange;
use crate::tree::tree::{AuspiceGraph, AuspiceRefNode};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeNucMutations {
  ref_node: AuspiceRefNode,
  muts: PrivateNucMutations,
}

pub fn find_relative_mutations(
  graph: &AuspiceGraph,
  clade: &str,
  clade_node_attrs: &BTreeMap<String, String>,
  substitutions: &[NucSub],
  deletions: &[NucDelRange],
  missing: &[NucRange],
  alignment_range: &NucRefGlobalRange,
  ref_seq: &[Nuc],
  non_acgtns: &[NucRange],
  virus_properties: &VirusProperties,
) -> Result<Vec<RelativeNucMutations>, Report> {
  let ref_nodes = filter_ref_nodes(graph, clade, clade_node_attrs);

  ref_nodes
    .iter()
    .map(|&ref_node| -> Result<_, Report> {
      let node = graph
        .iter_nodes()
        .find(|node| node.payload().name == ref_node.name)
        .ok_or_else(|| eyre!("Unable to find reference node on the tree: '{}'", &ref_node.name))?;

      let muts = find_private_nuc_mutations(
        node.payload(),
        substitutions,
        deletions,
        missing,
        alignment_range,
        ref_seq,
        non_acgtns,
        virus_properties,
      );

      Ok(RelativeNucMutations {
        ref_node: ref_node.to_owned(),
        muts,
      })
    })
    .collect::<Result<Vec<RelativeNucMutations>, Report>>()
    .wrap_err("When calling mutations relative to a reference node")
}

/// Take only ref nodes which are relevant for this sample, according to the node's include list
pub fn filter_ref_nodes<'a>(
  graph: &'a AuspiceGraph,
  clade: &str,
  clade_node_attrs: &BTreeMap<String, String>,
) -> Vec<&'a AuspiceRefNode> {
  graph
    .data
    .meta
    .extensions
    .nextclade
    .reference_nodes
    .iter()
    .filter(|node| {
      // For each attribute key in includes, check that the attribute value of this sample match
      // at least one item in the include list
      node.include.iter().all(|(key, includes)| {
        let curr_value = if key == "clade" { clade } else { &clade_node_attrs[key] };
        includes.iter().any(|include_value| include_value == curr_value) // TODO: consider regex match rather than equality
      })
    })
    .collect_vec()
}
