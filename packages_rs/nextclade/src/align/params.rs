use clap::{Parser, ValueHint};
use optfield::optfield;
use serde::{Deserialize, Serialize};

// NOTE: The `optfield` attribute creates a struct that have the same fields, but which are wrapped into `Option`,
// as well as adds a method `.merge_opt(&opt)` to the original struct, which merges values from the optional counterpart
// into self (mutably).

#[optfield(pub AlignPairwiseParamsOptional, attrs, doc, field_attrs, field_doc, merge_fn = pub)]
#[derive(Parser, Debug, Clone, Serialize, Deserialize)]
pub struct AlignPairwiseParams {
  /// Minimum length of nucleotide sequence to consider for alignment.
  ///
  /// If a sequence is shorter than that, alignment will not be attempted and a warning will be emitted. When adjusting this parameter, note that alignment of short sequences can be unreliable.
  #[clap(long)]
  pub min_length: usize,

  /// Penalty for extending a gap. If zero, all gaps regardless of length incur the same penalty.
  #[clap(long)]
  pub penalty_gap_extend: i32,

  /// Penalty for opening of a gap. A higher penalty results in fewer gaps and more mismatches. Should be less than `--penalty-gap-open-in-frame` to avoid gaps in genes.
  #[clap(long)]
  pub penalty_gap_open: i32,

  /// As `--penalty-gap-open`, but for opening gaps at the beginning of a codon. Should be greater than `--penalty-gap-open` and less than `--penalty-gap-open-out-of-frame`, to avoid gaps in genes, but favor gaps that align with codons.
  #[clap(long)]
  pub penalty_gap_open_in_frame: i32,

  /// As `--penalty-gap-open`, but for opening gaps in the body of a codon. Should be greater than `--penalty-gap-open-in-frame` to favor gaps that align with codons.
  #[clap(long)]
  pub penalty_gap_open_out_of_frame: i32,

  /// Penalty for aligned nucleotides or amino acids that differ in state during alignment. Note that this is redundantly parameterized with `--score-match`
  #[clap(long)]
  pub penalty_mismatch: i32,

  /// Score for encouraging aligned nucleotides or amino acids with matching state.
  #[clap(long)]
  pub score_match: i32,

  /// Maximum length of insertions or deletions allowed to proceed with alignment. Alignments with long indels are slow to compute and require substantial memory in the current implementation. Alignment of sequences with indels longer that this value, will not be attempted and a warning will be emitted.
  #[clap(long)]
  pub max_indel: usize,

  /// Minimum number of seeds to search for during nucleotide alignment. Relevant for short sequences. In long sequences, the number of seeds is determined by `--nuc-seed-spacing`.
  #[clap(long)]
  pub seed_length: usize,

  /// Maximum number of mismatching nucleotides allowed for a seed to be considered a match.
  #[clap(long)]
  pub min_seeds: i32,

  /// Spacing between seeds during nucleotide alignment.
  #[clap(long)]
  pub seed_spacing: i32,

  /// Maximum number of mismatching nucleotides allowed for a seed to be considered a match.
  #[clap(long)]
  pub mismatches_allowed: usize,

  /// Whether to stop gene translation after first stop codon. It will cut the genes in places cases where mutations resulted in premature stop codons. If this flag is present, the aminoacid sequences wil be truncated at the first stop codon and analysis of aminoacid mutations will not be available for the regions after first stop codon.
  #[clap(long)]
  pub no_translate_past_stop: bool,

  ///TODO: Don't surface in CLI, local only
  #[clap(long)]
  pub left_terminal_gaps_free: bool,

  ///TODO: Don't surface in CLI, local only
  #[clap(long)]
  pub right_terminal_gaps_free: bool,

  /// Excess bandwidth for internal stripes.
  #[clap(long)]
  pub excess_bandwidth: i32,

  /// Excess bandwidth for terminal stripes.
  #[clap(long)]
  pub terminal_bandwidth: i32,

  /// TODO: refactor with below into one parameter (two flags into one variable, like action in Python argparse)
  /// Left align gaps (convention) instead of right align (Nextclade historical practice)
  /// Make mutually exclusive with `--right-align-gaps`
  #[clap(long)]
  pub left_align_gaps: bool,

  /// TODO: refactor with above into one parameter (two flags into one variable, like action in Python argparse)
  /// Right align gaps (historical Nextclade practice)
  /// Make mutually exclusive with `--right-align-gaps`
  #[clap(long)]
  pub right_align_gaps: bool,
}

impl Default for AlignPairwiseParams {
  fn default() -> Self {
    Self {
      min_length: 100,
      penalty_gap_extend: 0,
      penalty_gap_open: 6,
      penalty_gap_open_in_frame: 7,
      penalty_gap_open_out_of_frame: 8,
      penalty_mismatch: 1,
      score_match: 3,
      max_indel: 400,
      seed_length: 21,
      min_seeds: 10,
      seed_spacing: 100,
      mismatches_allowed: 3,
      no_translate_past_stop: false,
      left_terminal_gaps_free: true,
      right_terminal_gaps_free: true,
      excess_bandwidth: 9,
      terminal_bandwidth: 50,
      left_align_gaps: false,
      right_align_gaps: true,
    }
  }
}
