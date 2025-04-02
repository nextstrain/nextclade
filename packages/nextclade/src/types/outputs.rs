use crate::align::insertions_strip::{AaIns, Insertion};
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_changes_group::AaChangesGroup;
use crate::analyze::aa_del::AaDel;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_aa_motifs_changes::{AaMotifsChangesMap, AaMotifsMap};
use crate::analyze::find_clade_founder::CladeNodeAttrFounderInfo;
use crate::analyze::find_private_aa_mutations::PrivateAaMutations;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::find_relative_aa_mutations::RelativeAaMutations;
use crate::analyze::find_relative_nuc_mutations::RelativeNucMutations;
use crate::analyze::letter_ranges::{CdsAaRange, NucRange};
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::pcr_primer_changes::PcrPrimerChange;
use crate::coord::range::{AaRefRange, NucRefGlobalRange};
use crate::gene::gene_map::GeneMap;
use crate::graph::node::GraphNodeKey;
use crate::io::json::json_parse;
use crate::qc::qc_run::QcResult;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::tree::tree::AuspiceRefNodesDesc;
use crate::tree::tree_find_ancestors_of_interest::AncestralSearchResult;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PeptideWarning {
  pub cds_name: String,
  pub warning: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeValue {
  pub name: String,
  pub cds: String,
  pub value: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeOutputs {
  pub index: usize,
  pub seq_name: String,
  pub seq_id: String,
  pub seq_desc: String,
  pub len_unaligned: usize,
  pub len_aligned: usize,
  pub len_stripped: usize,
  pub ref_name: String,
  pub dataset_name: String,
  pub substitutions: Vec<NucSub>,
  pub total_substitutions: usize,
  pub deletions: Vec<NucDelRange>,
  pub total_deletions: usize,
  pub insertions: Vec<Insertion<Nuc>>,
  pub total_insertions: usize,
  pub missing: Vec<NucRange>,
  pub total_missing: usize,
  #[serde(rename = "nonACGTNs")]
  pub non_acgtns: Vec<NucRange>,
  #[serde(rename = "totalNonACGTNs")]
  pub total_non_acgtns: usize,
  pub nucleotide_composition: BTreeMap<Nuc, usize>,
  pub frame_shifts: Vec<FrameShift>,
  pub total_frame_shifts: usize,
  pub aa_substitutions: Vec<AaSub>,
  pub total_aminoacid_substitutions: usize,
  pub aa_deletions: Vec<AaDel>,
  pub total_aminoacid_deletions: usize,
  pub aa_insertions: Vec<AaIns>,
  pub total_aminoacid_insertions: usize,
  pub unknown_aa_ranges: Vec<CdsAaRange>,
  pub total_unknown_aa: usize,
  pub aa_changes_groups: Vec<AaChangesGroup>,
  pub nuc_to_aa_muts: BTreeMap<String, Vec<AaSub>>,
  pub alignment_range: NucRefGlobalRange,
  pub alignment_score: i32,
  pub aa_alignment_ranges: BTreeMap<String, Vec<AaRefRange>>,
  pub aa_unsequenced_ranges: BTreeMap<String, Vec<AaRefRange>>,
  pub pcr_primer_changes: Vec<PcrPrimerChange>,
  pub total_pcr_primer_changes: usize,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub clade: Option<String>,
  pub private_nuc_mutations: PrivateNucMutations,
  pub private_aa_mutations: BTreeMap<String, PrivateAaMutations>,
  pub clade_founder_info: Option<CladeNodeAttrFounderInfo>,
  pub clade_node_attr_founder_info: BTreeMap<String, CladeNodeAttrFounderInfo>,
  pub ref_nodes: AuspiceRefNodesDesc,
  pub ref_node_search_results: Vec<AncestralSearchResult>,
  pub relative_nuc_mutations: Vec<RelativeNucMutations>,
  pub relative_aa_mutations: Vec<RelativeAaMutations>,
  pub warnings: Vec<PeptideWarning>,
  pub missing_cdses: Vec<String>,
  pub divergence: f64,
  pub coverage: f64,
  pub qc: QcResult,
  pub custom_node_attributes: BTreeMap<String, String>,
  pub nearest_node_id: GraphNodeKey,
  pub nearest_node_name: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub nearest_nodes: Option<Vec<String>>,
  pub is_reverse_complement: bool,
  pub phenotype_values: Option<Vec<PhenotypeValue>>,
  pub aa_motifs: AaMotifsMap,
  pub aa_motifs_changes: AaMotifsChangesMap,

  #[serde(skip_serializing_if = "GeneMap::is_empty")]
  pub annotation: GeneMap,
}

impl NextcladeOutputs {
  pub fn from_str(s: &str) -> Result<NextcladeOutputs, Report> {
    json_parse(s).wrap_err("When parsing Nextclade output")
  }

  pub fn many_from_str(s: &str) -> Result<Vec<NextcladeOutputs>, Report> {
    json_parse(s).wrap_err("When parsing Nextclade outputs")
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeErrorOutputs {
  pub index: usize,
  pub seq_name: String,
  pub errors: Vec<String>,
}

pub enum NextcladeOutputOrError {
  Outputs(Box<NextcladeOutputs>),
  Error(NextcladeErrorOutputs),
}

/// Merges an array of outputs with an array of errors into an array of variants
/// and sorts them by output/error index
pub fn combine_outputs_and_errors_sorted(
  outputs: &[NextcladeOutputs],
  errors: &[NextcladeErrorOutputs],
) -> Vec<(usize, NextcladeOutputOrError)> {
  let mut outputs_or_errors = Vec::<(usize, NextcladeOutputOrError)>::new();

  for output in outputs {
    outputs_or_errors.push((output.index, NextcladeOutputOrError::Outputs(Box::new(output.clone()))));
  }

  for error in errors {
    outputs_or_errors.push((error.index, NextcladeOutputOrError::Error(error.clone())));
  }

  outputs_or_errors.sort_by_key(|o| o.0);

  outputs_or_errors
}
