use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_private_aa_mutations::{find_private_aa_mutations, PrivateAaMutations};
use crate::analyze::find_private_nuc_mutations::{find_private_nuc_mutations, PrivateNucMutations};
use crate::analyze::letter_ranges::{CdsAaRange, NucRange};
use crate::analyze::nuc_alignment::NucAlignment;
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::virus_properties::VirusProperties;
use crate::coord::range::{AaRefRange, NucRefGlobalRange};
use crate::gene::gene_map::GeneMap;
use crate::translate::translate_genes::Translation;
use crate::tree::tree::{AuspiceGraph, AuspiceRefNode};
use eyre::{eyre, Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeNucMutations {
  ref_node: AuspiceRefNode,
  muts: PrivateNucMutations,
}

pub fn find_relative_nuc_mutations(
  graph: &AuspiceGraph,
  clade: &Option<String>,
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
    .wrap_err("When calling nucleotide mutations relative to a reference node")
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct RelativeAaMutations {
  ref_node: AuspiceRefNode,
  muts: BTreeMap<String, PrivateAaMutations>,
}

pub fn find_relative_aa_mutations(
  graph: &AuspiceGraph,
  clade: &Option<String>,
  clade_node_attrs: &BTreeMap<String, String>,
  aa_substitutions: &[AaSub],
  aa_deletions: &[AaDel],
  aa_unknowns: &[CdsAaRange],
  aa_unsequenced_ranges: &BTreeMap<String, Vec<AaRefRange>>,
  ref_peptides: &Translation,
  qry_peptides: &Translation,
  gene_map: &GeneMap,
  aln: &NucAlignment,
  substitutions: &[NucSub],
  deletions: &[NucDelRange],
) -> Result<Vec<RelativeAaMutations>, Report> {
  let ref_nodes = filter_ref_nodes(graph, clade, clade_node_attrs);

  ref_nodes
    .iter()
    .map(|&ref_node| -> Result<_, Report> {
      let node = graph
        .iter_nodes()
        .find(|node| node.payload().name == ref_node.name)
        .ok_or_else(|| eyre!("Unable to find reference node on the tree: '{}'", &ref_node.name))?;

      let muts = find_private_aa_mutations(
        node.payload(),
        aa_substitutions,
        aa_deletions,
        aa_unknowns,
        aa_unsequenced_ranges,
        ref_peptides,
        qry_peptides,
        gene_map,
        aln,
        substitutions,
        deletions,
      )?;

      Ok(RelativeAaMutations {
        ref_node: ref_node.to_owned(),
        muts,
      })
    })
    .collect::<Result<Vec<RelativeAaMutations>, Report>>()
    .wrap_err("When calling amino acid mutations relative to a reference node")
}

/// Take only ref nodes which are relevant for this sample, according to the node's include list
pub fn filter_ref_nodes<'a>(
  graph: &'a AuspiceGraph,
  clade: &Option<String>,
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
      node.include.iter().all(|(key, includes)| {
        let curr_value = if key == "clade" {
          clade.as_deref().unwrap_or("")
        } else {
          clade_node_attrs.get(key).map_or("", String::as_str)
        };
        includes.iter().any(|include_value| include_value == curr_value)
      })
    })
    .collect()
}
