use crate::align::backtrace::AlignmentOutput;
use crate::align::insertions_strip::{AaIns, Insertion, StripInsertionsResult};
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::find_private_aa_mutations::PrivateAaMutations;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::letter_ranges::{GeneAaRange, NucRange};
use crate::analyze::nuc_sub_full::{NucDelFull, NucSubFull};
use crate::analyze::pcr_primer_changes::PcrPrimerChange;
use crate::io::json::json_parse;
use crate::io::nuc::Nuc;
use crate::qc::qc_run::QcResult;
use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::Translation;
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextalignOutputs {
  pub stripped: StripInsertionsResult<Nuc>,
  pub alignment: AlignmentOutput<Nuc>,
  pub translations: Vec<Translation>,
  pub warnings: Vec<String>,
  pub missing_genes: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeOutputs {
  pub seq_name: String,
  pub substitutions: Vec<NucSubFull>,
  pub total_substitutions: usize,
  pub deletions: Vec<NucDelFull>,
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
  pub aa_substitutions: Vec<AaSubFull>,
  pub total_aminoacid_substitutions: usize,
  pub aa_deletions: Vec<AaDelFull>,
  pub total_aminoacid_deletions: usize,
  pub aa_insertions: Vec<AaIns>,
  pub total_aminoacid_insertions: usize,
  pub unknown_aa_ranges: Vec<GeneAaRange>,
  pub total_unknown_aa: usize,
  pub alignment_start: usize,
  pub alignment_end: usize,
  pub alignment_score: usize,
  pub pcr_primer_changes: Vec<PcrPrimerChange>,
  pub total_pcr_primer_changes: usize,
  pub clade: String,
  pub private_nuc_mutations: PrivateNucMutations,
  pub private_aa_mutations: BTreeMap<String, PrivateAaMutations>,
  pub warnings: Vec<String>,
  pub missing_genes: Vec<String>,
  pub divergence: f64,
  pub qc: QcResult,
  pub custom_node_attributes: BTreeMap<String, String>,
  //
  #[serde(skip)]
  pub nearest_node_id: usize,
}

impl NextcladeOutputs {
  pub fn from_str(s: &str) -> Result<NextcladeOutputs, Report> {
    json_parse(s)
  }

  pub fn many_from_str(s: &str) -> Result<Vec<NextcladeOutputs>, Report> {
    json_parse(s)
  }
}
