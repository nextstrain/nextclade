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

/// A warning about a peptide sequence
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PeptideWarning {
  /// Name of the CDS that produced the warning
  pub cds_name: String,
  /// Warning message text
  pub warning: String,
}

/// Result for a single phenotype value
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeValue {
  /// Phenotype name as defined in the dataset configuration
  pub name: String,
  /// CDS used for phenotype score calculation
  pub cds: String,
  /// Computed phenotype score
  pub value: f64,
}

/// Single element in `.results` array in nextclade.json file, produced by `nextclade run --output-json`. This corresponds to a single sequence in the inputs.
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(title = "ResultJson")]
pub struct NextcladeOutputs {
  /// Zero-based position of this sequence in the input
  pub index: usize,
  /// Full sequence name from the FASTA header
  pub seq_name: String,
  /// Sequence identifier, first whitespace-delimited token of the FASTA header
  pub seq_id: String,
  /// Description portion of the FASTA header after the identifier
  pub seq_desc: String,
  /// Length of the original query sequence before alignment
  pub len_unaligned: usize,
  /// Length of the query sequence after alignment, in alignment coordinates
  pub len_aligned: usize,
  /// Length of the query sequence after stripping insertions relative to the reference
  pub len_stripped: usize,
  /// Name of the reference sequence used for alignment
  pub ref_name: String,
  /// Name of the dataset used for analysis
  pub dataset_name: String,
  /// Nucleotide substitutions relative to the reference
  pub substitutions: Vec<NucSub>,
  /// Total count of nucleotide substitutions
  pub total_substitutions: usize,
  /// Nucleotide deletion ranges relative to the reference
  pub deletions: Vec<NucDelRange>,
  /// Total count of deleted nucleotide positions
  pub total_deletions: usize,
  /// Nucleotide insertions stripped from the alignment
  pub insertions: Vec<Insertion<Nuc>>,
  /// Total count of inserted nucleotide positions
  pub total_insertions: usize,
  /// Ranges of missing (N) nucleotides in the aligned sequence
  pub missing: Vec<NucRange>,
  /// Total count of missing (N) nucleotides
  pub total_missing: usize,
  /// Ranges of ambiguous nucleotides (not A, C, G, T, or N)
  #[serde(rename = "nonACGTNs")]
  pub non_acgtns: Vec<NucRange>,
  /// Total count of ambiguous nucleotides
  #[serde(rename = "totalNonACGTNs")]
  pub total_non_acgtns: usize,
  /// Per-character nucleotide counts in the aligned sequence
  pub nucleotide_composition: BTreeMap<Nuc, usize>,
  /// Frame-shifting insertions or deletions detected in CDS regions
  pub frame_shifts: Vec<FrameShift>,
  /// Total count of detected frame shifts
  pub total_frame_shifts: usize,
  /// Amino acid substitutions relative to reference peptides
  pub aa_substitutions: Vec<AaSub>,
  /// Total count of amino acid substitutions
  pub total_aminoacid_substitutions: usize,
  /// Amino acid deletions relative to reference peptides
  pub aa_deletions: Vec<AaDel>,
  /// Total count of amino acid deletions
  pub total_aminoacid_deletions: usize,
  /// Amino acid insertions relative to reference peptides
  pub aa_insertions: Vec<AaIns>,
  /// Total count of amino acid insertions
  pub total_aminoacid_insertions: usize,
  /// Ranges of unknown (X) amino acids per CDS
  pub unknown_aa_ranges: Vec<CdsAaRange>,
  /// Total count of unknown (X) amino acids
  pub total_unknown_aa: usize,
  /// Groups of adjacent amino acid changes with surrounding nucleotide context
  pub aa_changes_groups: Vec<AaChangesGroup>,
  /// Amino acid substitutions caused by each nucleotide mutation, keyed by CDS name
  pub nuc_to_aa_muts: BTreeMap<String, Vec<AaSub>>,
  /// Reference coordinate range of the aligned region
  pub alignment_range: NucRefGlobalRange,
  /// Smith-Waterman alignment score
  pub alignment_score: i32,
  /// Per-CDS aligned amino acid ranges in reference coordinates
  pub aa_alignment_ranges: BTreeMap<String, Vec<AaRefRange>>,
  /// Per-CDS unsequenced amino acid ranges (outside the alignment)
  pub aa_unsequenced_ranges: BTreeMap<String, Vec<AaRefRange>>,
  /// Mutations falling within PCR primer binding regions
  pub pcr_primer_changes: Vec<PcrPrimerChange>,
  /// Total count of mutations in PCR primer regions
  pub total_pcr_primer_changes: usize,
  /// Assigned clade label from the nearest reference tree node
  #[serde(skip_serializing_if = "Option::is_none")]
  pub clade: Option<String>,
  /// Nucleotide mutations not shared with the nearest reference tree node, subdivided into reversions, labeled, and unlabeled
  pub private_nuc_mutations: PrivateNucMutations,
  /// Per-CDS amino acid mutations not shared with the nearest reference tree node
  pub private_aa_mutations: BTreeMap<String, PrivateAaMutations>,
  /// Mutations relative to the clade founder node
  pub clade_founder_info: Option<CladeNodeAttrFounderInfo>,
  /// Per-attribute mutations relative to founder nodes, keyed by attribute name
  pub clade_node_attr_founder_info: BTreeMap<String, CladeNodeAttrFounderInfo>,
  /// Reference node search criteria defined in the dataset
  pub ref_nodes: AuspiceRefNodesDesc,
  /// Results of dataset-defined ancestral node searches
  pub ref_node_search_results: Vec<AncestralSearchResult>,
  /// Nucleotide mutations relative to matched reference nodes of interest
  pub relative_nuc_mutations: Vec<RelativeNucMutations>,
  /// Amino acid mutations relative to matched reference nodes of interest
  pub relative_aa_mutations: Vec<RelativeAaMutations>,
  /// Non-fatal warnings encountered during analysis
  pub warnings: Vec<PeptideWarning>,
  /// CDS names that failed translation
  pub missing_cdses: Vec<String>,
  /// Evolutionary divergence from the root of the reference tree
  pub divergence: f64,
  /// Fraction of reference positions covered by the query sequence (0.0 to 1.0)
  pub coverage: f64,
  /// Per-CDS fraction of amino acid positions covered, keyed by CDS name
  pub cds_coverage: BTreeMap<String, f64>,
  /// Quality control results including overall score, status, and per-rule results
  pub qc: QcResult,
  /// Clade-like attributes from the nearest tree node, keyed by attribute name
  pub custom_node_attributes: BTreeMap<String, String>,
  /// Internal graph key of the nearest reference tree node
  pub nearest_node_id: GraphNodeKey,
  /// Name of the nearest reference tree node
  pub nearest_node_name: String,
  /// Names of equidistant nearest tree nodes when multiple candidates exist
  #[serde(skip_serializing_if = "Option::is_none")]
  pub nearest_nodes: Option<Vec<String>>,
  /// Whether the sequence was reverse-complemented before analysis
  pub is_reverse_complement: bool,
  /// Computed phenotype scores as defined in the dataset configuration
  pub phenotype_values: Option<Vec<PhenotypeValue>>,
  /// Amino acid motifs detected in the query sequence, keyed by motif name
  pub aa_motifs: AaMotifsMap,
  /// Changes in amino acid motifs relative to the reference, keyed by motif name
  pub aa_motifs_changes: AaMotifsChangesMap,

  /// Genome annotation in query sequence coordinates
  #[serde(default, skip_serializing_if = "GeneMap::is_empty")]
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

/// Analysis result for a sequence that failed processing entirely
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(title = "ResultJsonError")]
pub struct NextcladeErrorOutputs {
  /// Zero-based position of this sequence in the input
  pub index: usize,
  /// Sequence name from the FASTA header
  pub seq_name: String,
  /// Error messages describing why processing failed
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
