use clap::{Parser, ValueHint};

#[derive(Parser, Debug)]
pub struct AlignPairwiseParams {
  /// Minimum length of nucleotide sequence to consider for alignment.
  ///
  /// If a sequence is shorter than that, alignment will not be attempted and a warning will be emitted. When adjusting this parameter, note that alignment of short sequences can be unreliable.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().min_length)]
  pub min_length: usize,

  /// Penalty for extending a gap in alignment. If zero, all gaps regardless of length incur the same penalty.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().penalty_gap_extend)]
  pub penalty_gap_extend: i32,

  /// Penalty for opening of a gap in alignment. A higher penalty results in fewer gaps and more mismatches. Should be less than `--penalty-gap-open-in-frame` to avoid gaps in genes.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().penalty_gap_open)]
  pub penalty_gap_open: i32,

  /// As `--penalty-gap-open`, but for opening gaps at the beginning of a codon. Should be greater than `--penalty-gap-open` and less than `--penalty-gap-open-out-of-frame`, to avoid gaps in genes, but favor gaps that align with codons.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().penalty_gap_open_in_frame)]
  pub penalty_gap_open_in_frame: i32,

  /// As `--penalty-gap-open`, but for opening gaps in the body of a codon. Should be greater than `--penalty-gap-open-in-frame` to favor gaps that align with codons.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().penalty_gap_open_out_of_frame)]
  pub penalty_gap_open_out_of_frame: i32,

  /// Penalty for aligned nucleotides or amino acids that differ in state during alignment. Note that this is redundantly parameterized with `--score-match`
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().penalty_mismatch)]
  pub penalty_mismatch: i32,

  /// Score for matching states in nucleotide or amino acid alignments.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().score_match)]
  pub score_match: i32,

  /// Maximum length of insertions or deletions allowed to proceed with alignment. Alignments with long indels are slow to compute and require substantial memory in the current implementation. Alignment of sequences with indels longer that this value, will not be attempted and a warning will be emitted.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().max_indel)]
  pub max_indel: usize,

  /// k-mer length to determine approximate alignments between query and reference and determine the bandwidth of the banded alignment.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().seed_length)]
  pub seed_length: usize,

  /// Maximum number of mismatching nucleotides allowed for a seed to be considered a match.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().mismatches_allowed)]
  pub mismatches_allowed: usize,

  /// Minimum number of seeds to search for during nucleotide alignment. Relevant for short sequences. In long sequences, the number of seeds is determined by `--seed-spacing`.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().min_seeds)]
  pub min_seeds: i32,

  /// Spacing between seeds during nucleotide alignment.
  #[clap(long)]
  #[clap(default_value_t = AlignPairwiseParams::default().seed_spacing)]
  pub seed_spacing: i32,

  /// If this flag is present, the amino acid sequences will be truncated at the first stop codon, if mutations or sequencing errors cause premature stop codons to be present. No amino acid mutations in the truncated region will be recorded.
  #[clap(long)]
  pub no_translate_past_stop: bool,
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
    }
  }
}
