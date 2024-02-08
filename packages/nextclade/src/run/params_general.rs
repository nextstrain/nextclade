use clap::Parser;
use optfield::optfield;
use serde::{Deserialize, Serialize};

#[allow(clippy::struct_excessive_bools)]
#[optfield(pub NextcladeGeneralParamsOptional, attrs, doc, field_attrs, field_doc, merge_fn = pub)]
#[derive(Parser, Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeGeneralParams {
  /// Whether to include aligned reference nucleotide sequence into output nucleotide sequence FASTA file and reference peptides into output peptide FASTA files.
  #[clap(long)]
  #[clap(num_args=0..=1, default_missing_value = "true")]
  pub include_reference: bool,

  /// Whether to include the list of nearest nodes to the outputs
  #[clap(long)]
  #[clap(num_args=0..=1, default_missing_value = "true")]
  pub include_nearest_node_info: bool,

  /// Emit output sequences in-order.
  ///
  /// With this flag the program will wait for results from the previous sequences to be written to the output files before writing the results of the next sequences, preserving the same order as in the input file. Due to variable sequence processing times, this might introduce unnecessary waiting times, but ensures that the resulting sequences are written in the same order as they occur in the inputs (except for sequences which have errors).
  /// By default, without this flag, processing might happen out of order, which is faster, due to the elimination of waiting, but might also lead to results written out of order - the order of results is not specified and depends on thread scheduling and processing times of individual sequences.
  ///
  /// This option is only relevant when `--jobs` is greater than 1 or is omitted.
  ///
  /// Note: the sequences which trigger errors during processing will be omitted from outputs, regardless of this flag.
  #[clap(long)]
  #[clap(num_args=0..=1, default_missing_value = "true")]
  pub in_order: bool,

  /// Replace unknown nucleotide characters with 'N'
  ///
  /// By default, the sequences containing unknown nucleotide characters are skipped with a warning - they
  /// are not analyzed and not included into results. If this flag is provided, then before the alignment,
  /// all unknown characters are replaced with 'N'. This replacement allows to analyze these sequences.
  ///
  /// The following characters are considered known:  '-', 'A', 'B', 'C', 'D', 'G', 'H', 'K', 'M', 'N', 'R', 'S', 'T', 'V', 'W', 'Y'
  #[clap(long)]
  #[clap(num_args=0..=1, default_missing_value = "true")]
  pub replace_unknown: bool,
}

#[allow(clippy::derivable_impls)]
impl Default for NextcladeGeneralParams {
  fn default() -> Self {
    Self {
      include_reference: false,
      include_nearest_node_info: false,
      in_order: false,
      replace_unknown: false,
    }
  }
}
