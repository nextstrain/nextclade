use crate::utils::any::AnyType;
use crate::{make_error, o};
use clap::{Parser, ValueEnum};
use eyre::Report;
use itertools::Itertools;
use optfield::optfield;
use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Controls where ambiguous gaps go when the alignment is equally parsimonious in either direction. The value names the side to which the aligned bases move; ambiguous gaps go to the opposite side.
#[derive(ValueEnum, Copy, Clone, Debug, Eq, PartialEq, Deserialize, Serialize, schemars::JsonSchema)]
#[serde(rename_all = "kebab-case")]
#[derive(Default)]
pub enum GapAlignmentSide {
  /// Move aligned bases to the left (5') side and ambiguous gaps to the 3'-most position. This is the default.
  #[default]
  Left,
  /// Move aligned bases to the right (3') side and ambiguous gaps to the 5'-most position.
  Right,
}

/// Pre-defined alignment parameter presets that adjust penalties, seed matching, and band width for different sequence characteristics. Experimental feature subject to adjustments.
#[derive(ValueEnum, Copy, Clone, Debug, Eq, PartialEq, Deserialize, Serialize, schemars::JsonSchema)]
#[serde(rename_all = "kebab-case")]
#[derive(Default)]
pub enum AlignmentPreset {
  /// Suitable for very similar sequences (this is the default).
  #[clap(help = "Suitable for very similar sequences (this is the default)")]
  #[default]
  Default,

  /// Suitable for more diverse viruses. Uses wider alignment bands, shorter k-mers, and higher gap penalties.
  #[clap(help = "Suitable for more diverse viruses")]
  HighDiversity,

  /// Suitable for short and partial sequences. Reduces minimum sequence length and uses shorter k-mers with tighter seed spacing.
  #[clap(help = "Suitable for short and partial sequences")]
  ShortSequences,
}

// NOTE: The `optfield` attribute creates a struct that have the same fields, but which are wrapped into `Option`,
// as well as adds a method `.merge_opt(&opt)` to the original struct, which merges values from the optional counterpart
// into self (mutably).

/// Parameters controlling pairwise sequence alignment against a reference. Configurable via CLI arguments, pathogen.json, or alignment presets. Precedence: CLI arguments > pathogen.json > preset defaults.
#[allow(clippy::struct_excessive_bools)]
#[optfield(pub AlignPairwiseParamsOptional, attrs, doc, field_attrs, field_doc, merge_fn = pub)]
#[derive(Parser, Debug, Clone, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AlignPairwiseParams {
  /// Alignment parameter presets. EXPERIMENTAL feature subject to adjustments.
  #[clap(long, value_enum)]
  pub alignment_preset: AlignmentPreset,

  /// Minimum length of nucleotide sequence to consider for alignment.
  ///
  /// If a sequence is shorter than that, alignment will not be attempted and a warning will be emitted. When adjusting this parameter, note that alignment of short sequences can be unreliable.
  #[clap(long)]
  pub min_length: usize,

  /// Penalty for extending a gap in alignment. If zero, all gaps regardless of length incur the same penalty.
  #[clap(long)]
  pub penalty_gap_extend: i32,

  /// Penalty for opening of a gap in alignment. A higher penalty results in fewer gaps and more mismatches. Should be less than `--penalty-gap-open-in-frame` to avoid gaps in genes.
  #[clap(long)]
  pub penalty_gap_open: i32,

  /// As `--penalty-gap-open`, but for opening gaps at the beginning of a codon. Should be greater than `--penalty-gap-open` and less than `--penalty-gap-open-out-of-frame`, to avoid gaps in genes, but favor gaps that align with codons.
  #[clap(long)]
  pub penalty_gap_open_in_frame: i32,

  /// As `--penalty-gap-open`, but for opening gaps in the body of a codon. Should be greater than `--penalty-gap-open-in-frame` to favor gaps that align with codons.
  #[clap(long)]
  pub penalty_gap_open_out_of_frame: i32,

  /// Additional penalty for a deletion that extends from a position outside of all CDSs into a CDS. Applies only when a genome annotation is provided. Insertions are not affected.
  ///
  /// The codon-aware penalties apply where a deletion starts. Without this penalty, a deletion that starts before a CDS and ends inside of it pays only `--penalty-gap-open`, so an ambiguous deletion can be placed over the first bases of the CDS in reference coordinates: the start codon of a forward-strand CDS, or the last codon of a reverse-strand CDS. A value of 1 or more keeps such deletions outside of the CDS when an equally good placement exists. A value greater than `--penalty-gap-open-in-frame` minus `--penalty-gap-open` also makes a deletion that cuts into a CDS more costly than an in-frame deletion inside of the CDS. Values above `--score-match` plus `--penalty-mismatch` can make the aligner add a substitution to avoid a deletion that enters a CDS. 0 disables the penalty.
  #[clap(long)]
  pub penalty_gap_enter_cds: i32,

  /// Penalty for aligned nucleotides or amino acids that differ in state during alignment. Note that this is redundantly parameterized with `--score-match`
  #[clap(long)]
  pub penalty_mismatch: i32,

  /// Score for matching states in nucleotide or amino acid alignments.
  #[clap(long)]
  pub score_match: i32,

  /// Maximum area of the band in the alignment matrix. Alignments with large bands are slow to compute and require substantial memory. Alignment of sequences requiring bands with area larger than this value will not be attempted and an error will be reported for the sequence.
  #[clap(long)]
  pub max_band_area: u64,

  /// Retry seed matching step with a reverse complement if the first attempt failed
  #[clap(long)]
  #[clap(num_args=0..=1, default_missing_value = "true")]
  pub retry_reverse_complement: bool,

  /// If this flag is present, the amino acid sequences will be truncated at the first stop codon, if mutations or sequencing errors cause premature stop codons to be present. No amino acid mutations in the truncated region will be recorded.
  #[clap(long)]
  #[clap(num_args=0..=1, default_missing_value = "true")]
  pub no_translate_past_stop: bool,

  // Internal alignment parameter
  #[clap(skip)]
  pub left_terminal_gaps_free: bool,

  // Internal alignment parameter
  #[clap(skip)]
  pub right_terminal_gaps_free: bool,

  /// Excess bandwidth for internal stripes.
  #[clap(long)]
  pub excess_bandwidth: i32,

  /// Excess bandwidth for terminal stripes.
  #[clap(long)]
  pub terminal_bandwidth: i32,

  /// Where to place gaps that have several placements with equal score. `left` moves the aligned bases to the left and the gaps to the 3'-most position. `right` moves the aligned bases to the right and the gaps to the 5'-most position. Default: left
  #[clap(long, value_enum)]
  pub gap_alignment_side: GapAlignmentSide,

  /// Length of exactly matching k-mers used in the seed alignment of the query to the reference.
  #[clap(long)]
  pub kmer_length: usize,

  /// Interval of successive k-mers on the query sequence. Should be small compared to the query length.
  #[clap(long)]
  pub kmer_distance: usize,

  /// Exactly matching k-mers are extended to the left and right until more
  /// than `allowed_mismatches` are observed in a sliding window (`window_size`).
  #[clap(long)]
  pub allowed_mismatches: usize,

  /// Size of the window within which mismatches are accumulated during seed extension
  #[clap(long)]
  pub window_size: usize,

  /// Minimum length of extended k-mers
  #[clap(long)]
  pub min_match_length: usize,

  /// Fraction of the query sequence that has to be covered by extended seeds
  /// to proceed with the banded alignment.
  #[clap(long)]
  pub min_seed_cover: OrderedFloat<f64>,

  /// Largest allowed deletion between two consecutive seeds of the seed chain, as a multiple of the query length. A finite number of at least 0.
  ///
  /// When a deletion between two seeds is longer, and both parts of the chain around it hold at least `--min-seed-chain-part-cover` of the seed length, the sequence is not aligned and an error is reported. This rejects sequences whose parts match distant regions of the reference, for example both inverted terminal repeats of mpox. Large values turn the check off. The `short-sequences` alignment preset turns the check off, because its short seeds can also match far from the true position of a short query.
  #[clap(long)]
  pub max_seed_chain_deletion_ratio: OrderedFloat<f64>,

  /// Smallest fraction of the total seed length that each part of the seed chain, before and after the deletion that `--max-seed-chain-deletion-ratio` checks, must hold for the sequence to be rejected. A finite number between 0 and 1.
  ///
  /// A part with fewer seeds usually stays out of the final alignment, because terminal gaps are free. Values above 0.5 turn the check off.
  #[clap(long)]
  pub min_seed_chain_part_cover: OrderedFloat<f64>,

  /// Number of times Nextclade will retry alignment with more relaxed results if alignment band boundaries are hit
  #[clap(long)]
  pub max_alignment_attempts: usize,

  // The following args are deprecated and are kept for backwards compatibility (to emit errors if they are set)
  /// REMOVED
  #[clap(long, hide_long_help = true, hide_short_help = true)]
  pub max_indel: Option<AnyType>,

  /// REMOVED
  #[clap(long, hide_long_help = true, hide_short_help = true)]
  pub seed_length: Option<AnyType>,

  /// REMOVED
  #[clap(long, hide_long_help = true, hide_short_help = true)]
  pub mismatches_allowed: Option<AnyType>,

  /// REMOVED
  #[clap(long, hide_long_help = true, hide_short_help = true)]
  pub min_seeds: Option<AnyType>,

  /// REMOVED
  #[clap(long, hide_long_help = true, hide_short_help = true)]
  pub min_match_rate: Option<AnyType>,

  /// REMOVED
  #[clap(long, hide_long_help = true, hide_short_help = true)]
  pub seed_spacing: Option<AnyType>,
}

impl Default for AlignPairwiseParams {
  fn default() -> Self {
    Self {
      alignment_preset: AlignmentPreset::default(),

      min_length: 100,
      penalty_gap_extend: 0,
      penalty_gap_open: 6,
      penalty_gap_open_in_frame: 7,
      penalty_gap_open_out_of_frame: 8,
      penalty_gap_enter_cds: 0,
      penalty_mismatch: 1,
      score_match: 3,
      max_band_area: 500_000_000, // requires around 500Mb for paths, 2GB for the scores
      retry_reverse_complement: false,
      no_translate_past_stop: false,
      left_terminal_gaps_free: true,
      right_terminal_gaps_free: true,
      gap_alignment_side: GapAlignmentSide::default(),
      excess_bandwidth: 9,
      terminal_bandwidth: 50,
      min_seed_cover: OrderedFloat(0.33),
      max_seed_chain_deletion_ratio: OrderedFloat(10.0),
      min_seed_chain_part_cover: OrderedFloat(0.2),
      kmer_length: 10,       // Should not be much larger than 1/divergence of amino acids
      kmer_distance: 50,     // Distance between successive k-mers
      min_match_length: 40,  // Experimentally determined, to keep off-target matches reasonably low
      allowed_mismatches: 8, // Ns count as mismatches
      window_size: 30,
      max_alignment_attempts: 3,

      // The following args are deprecated and are kept for backwards compatibility (to emit errors if they are set)
      max_indel: None,
      seed_length: None,
      min_seeds: None,
      min_match_rate: None,
      seed_spacing: None,
      mismatches_allowed: None,
    }
  }
}

impl AlignPairwiseParams {
  pub fn from_preset(preset: AlignmentPreset) -> Result<AlignPairwiseParams, Report> {
    match preset {
      AlignmentPreset::Default => Ok(AlignPairwiseParams::default()),
      AlignmentPreset::HighDiversity => Ok(AlignPairwiseParams {
        alignment_preset: AlignmentPreset::HighDiversity,
        penalty_gap_extend: 0,             // make longer gaps more costly
        penalty_gap_open: 10,              // make gaps more expensive relative to mismatches
        penalty_gap_open_in_frame: 15,     // increase the gap between gaps in coding and non-coding regions
        penalty_gap_open_out_of_frame: 17, //
        terminal_bandwidth: 100,
        excess_bandwidth: 20, // increase. Will results in slower and more memory-intensive alignments
        min_seed_cover: OrderedFloat(0.1),
        kmer_length: 6,         // reduce to find more matches
        kmer_distance: 25,      // reduce to try more seeds
        min_match_length: 30,   // reduce to keep more seeds
        allowed_mismatches: 15, // increase to keep more seeds
        window_size: 30,
        ..AlignPairwiseParams::default()
      }),
      AlignmentPreset::ShortSequences => Ok(AlignPairwiseParams {
        alignment_preset: AlignmentPreset::ShortSequences,
        min_length: 30,
        penalty_gap_extend: 1, // avoid short sequences being split by long gaps
        kmer_length: 6,        // reduce to find more matches
        kmer_distance: 3,      // reduce to try more seeds
        min_match_length: 20,  // reduce to keep more seeds
        allowed_mismatches: 5, // increase to keep more seeds
        window_size: 20,
        excess_bandwidth: 20,
        max_seed_chain_deletion_ratio: OrderedFloat(f64::MAX), // short seeds also match far from the true position
        ..AlignPairwiseParams::default()
      }),
    }
  }

  pub fn validate(&self) -> Result<(), Report> {
    #[rustfmt::skip]
  let deprecated = BTreeMap::from([
    (o!("--min-seeds            (minSeeds)"),             &self.min_seeds),
    (o!("--seed-length          (seedLength)"),           &self.seed_length),
    (o!("--seed-spacing         (seedSpacing)"),          &self.seed_spacing),
    (o!("--min-match-rate       (minMatchRate)"),         &self.min_match_rate),
    (o!("--mismatches-allowed   (mismatchesAllowed)"),    &self.mismatches_allowed),
    (o!("--max-indel            (maxIndel)"),             &self.max_indel),
  ]);

    if deprecated.values().any(|val| val.is_some()) {
      let keys = deprecated.keys().map(|key| format!("  {key}")).join("\n");

      return make_error!(
        r#"The following alignment parameters (CLI arguments and config file fields) were removed in Nextclade 3.0.0 due to changes in the alignment algorithm:

{keys}

Please remove them from your dataset and/or from command-line invocation.

Refer to user documentation for more details."#
      );
    }

    let max_seed_chain_deletion_ratio = *self.max_seed_chain_deletion_ratio;
    if !(max_seed_chain_deletion_ratio.is_finite() && max_seed_chain_deletion_ratio >= 0.0) {
      return make_error!(
        "Alignment parameter '--max-seed-chain-deletion-ratio' (maxSeedChainDeletionRatio) must be a finite number of at least 0, but found: {max_seed_chain_deletion_ratio}"
      );
    }

    let min_seed_chain_part_cover = *self.min_seed_chain_part_cover;
    if !(min_seed_chain_part_cover.is_finite() && (0.0..=1.0).contains(&min_seed_chain_part_cover)) {
      return make_error!(
        "Alignment parameter '--min-seed-chain-part-cover' (minSeedChainPartCover) must be a finite number between 0 and 1, but found: {min_seed_chain_part_cover}"
      );
    }

    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::analyze::virus_properties::VirusProperties;
  use crate::assert_error;
  use crate::run::params::{NextcladeInputParams, NextcladeInputParamsOptional};
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  #[rustfmt::skip]
  #[case::ratio_negative(       -1.0,          0.2,           "Alignment parameter '--max-seed-chain-deletion-ratio' (maxSeedChainDeletionRatio) must be a finite number of at least 0, but found: -1")]
  #[case::ratio_infinite(       f64::INFINITY, 0.2,           "Alignment parameter '--max-seed-chain-deletion-ratio' (maxSeedChainDeletionRatio) must be a finite number of at least 0, but found: inf")]
  #[case::ratio_nan(            f64::NAN,      0.2,           "Alignment parameter '--max-seed-chain-deletion-ratio' (maxSeedChainDeletionRatio) must be a finite number of at least 0, but found: NaN")]
  #[case::part_cover_negative(  10.0,          -0.1,          "Alignment parameter '--min-seed-chain-part-cover' (minSeedChainPartCover) must be a finite number between 0 and 1, but found: -0.1")]
  #[case::part_cover_above_one( 10.0,          1.5,           "Alignment parameter '--min-seed-chain-part-cover' (minSeedChainPartCover) must be a finite number between 0 and 1, but found: 1.5")]
  #[case::part_cover_infinite(  10.0,          f64::INFINITY, "Alignment parameter '--min-seed-chain-part-cover' (minSeedChainPartCover) must be a finite number between 0 and 1, but found: inf")]
  #[case::part_cover_nan(       10.0,          f64::NAN,      "Alignment parameter '--min-seed-chain-part-cover' (minSeedChainPartCover) must be a finite number between 0 and 1, but found: NaN")]
  #[trace]
  fn test_params_rejects_seed_chain_parameters_out_of_domain(
    #[case] max_seed_chain_deletion_ratio: f64,
    #[case] min_seed_chain_part_cover: f64,
    #[case] expected_message: &str,
  ) {
    let params = AlignPairwiseParams {
      max_seed_chain_deletion_ratio: OrderedFloat(max_seed_chain_deletion_ratio),
      min_seed_chain_part_cover: OrderedFloat(min_seed_chain_part_cover),
      ..AlignPairwiseParams::default()
    };

    assert_error!(params.validate(), expected_message);
  }

  #[rstest]
  #[rustfmt::skip]
  #[case::ratio_zero(           0.0,      0.2 )]
  #[case::preset_short_seqs(    f64::MAX, 0.2 )]
  #[case::part_cover_zero(      10.0,     0.0 )]
  #[case::part_cover_one(       10.0,     1.0 )]
  #[trace]
  fn test_params_accepts_seed_chain_parameters_at_domain_bounds(
    #[case] max_seed_chain_deletion_ratio: f64,
    #[case] min_seed_chain_part_cover: f64,
  ) -> Result<(), Report> {
    let params = AlignPairwiseParams {
      max_seed_chain_deletion_ratio: OrderedFloat(max_seed_chain_deletion_ratio),
      min_seed_chain_part_cover: OrderedFloat(min_seed_chain_part_cover),
      ..AlignPairwiseParams::default()
    };

    params.validate()
  }

  #[rstest]
  #[rustfmt::skip]
  #[case::preset_only(          r#"{ "schemaVersion": "3.0.0" }"#,                                                  f64::MAX )]
  #[case::pathogen_json_value(  r#"{ "schemaVersion": "3.0.0", "alignmentParams": { "maxSeedChainDeletionRatio": 10 } }"#, 10.0     )]
  #[trace]
  fn test_params_short_sequences_preset_turns_off_seed_chain_check_unless_dataset_sets_it(
    #[case] pathogen_json: &str,
    #[case] expected_ratio: f64,
  ) -> Result<(), Report> {
    let virus_properties = VirusProperties::from_str(&pathogen_json)?;
    let input_params = NextcladeInputParamsOptional {
      alignment: Some(AlignPairwiseParamsOptional::try_parse_from([
        "nextclade",
        "--alignment-preset",
        "short-sequences",
      ])?),
      ..NextcladeInputParamsOptional::default()
    };

    let params = NextcladeInputParams::from_optional(&input_params, &virus_properties)?;

    assert_eq!(OrderedFloat(expected_ratio), params.alignment.max_seed_chain_deletion_ratio);
    Ok(())
  }
}
