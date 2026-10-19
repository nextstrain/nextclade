use crate::align::backtrace::{AlignmentOutput, backtrace};
use crate::align::band_2d::Stripe;
use crate::align::band_2d::{full_matrix, simple_stripes};
use crate::align::gap_open::GapScoreMap;
use crate::align::params::AlignPairwiseParams;
use crate::align::score_matrix::{ScoreMatrixResult, score_matrix};
use crate::align::seed_alignment::create_alignment_band;
use crate::align::seed_match::{
  CodonSpacedIndex, DistantSeedChainGap, SeedMatchesResult, find_distant_seed_chain_gap,
  get_seed_matches_maybe_reverse_complement,
};
use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::utils::error::report_to_string;
use crate::utils::num_human::format_number_human;
use crate::{make_error, o};
use eyre::{Report, WrapErr};
use log::{info, trace, warn};
use std::cmp::max;

/// Length ratio of query and reference above which the band-limit error describes the query as much longer than the
/// reference, and below whose inverse as much shorter
const MAX_SIMILAR_LENGTH_RATIO: f64 = 1.5;

fn align_pairwise<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  gap_open_close: &GapScoreMap,
  params: &AlignPairwiseParams,
  stripes: &[Stripe],
) -> Result<AlignmentOutput<T>, Report> {
  trace!("Align pairwise: started. Params: {params:?}");

  let ScoreMatrixResult { scores, paths } = score_matrix(qry_seq, ref_seq, gap_open_close, stripes, params)?;

  Ok(backtrace(qry_seq, ref_seq, &scores, &paths))
}

/// align nucleotide sequences via seed alignment and banded smith watermann without penalizing terminal gaps
pub fn align_nuc(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  seed_index: &CodonSpacedIndex,
  gap_open_close: &GapScoreMap,
  params: &AlignPairwiseParams,
) -> Result<AlignmentOutput<Nuc>, Report> {
  let qry_len = qry_seq.len();
  let ref_len = ref_seq.len();
  let min_len = params.min_length;
  if qry_len < min_len {
    return make_error!(
      "Unable to align: sequence is too short. Details: sequence length: {qry_len}, min length allowed: {min_len}. This is likely due to a low quality of the provided sequence, or due to using incorrect reference sequence."
    );
  }

  if ref_len + qry_len < (20 * params.kmer_length) {
    // for very short sequences, use full square
    let stripes = full_matrix(ref_len, qry_len);
    trace!(
      "When processing sequence #{index} '{seq_name}': In nucleotide alignment: Band construction: short sequences, using full matrix"
    );
    return align_pairwise(qry_seq, ref_seq, gap_open_close, params, &stripes);
  }

  // otherwise, determine seed matches roughly regularly spaced along the query sequence
  let SeedMatchesResult {
    qry_seq,
    seed_matches,
    is_reverse_complement,
  } = get_seed_matches_maybe_reverse_complement(qry_seq, ref_seq, seed_index, params)
    .wrap_err("When calculating seed matches")?;

  // Checked after the orientation is chosen, so that the rejection does not start the reverse-complement retry
  if let Some(DistantSeedChainGap {
    ref_range_before,
    ref_range_after,
    deletion,
  }) = find_distant_seed_chain_gap(
    &seed_matches,
    qry_len,
    *params.max_seed_chain_deletion_ratio,
    *params.min_seed_chain_part_cover,
  ) {
    return make_error!(
      "Unable to align: the sequence matches two distant parts of the reference (positions {}-{} and {}-{}), which would need a deletion of {} nt in a sequence of {} nt. \
      This is likely due to a sequence from repeated regions (for example inverted terminal repeats), a chimeric or concatenated sequence, or an incorrect reference sequence. \
      The limits can be changed with the Nextclade CLI flags '--max-seed-chain-deletion-ratio' and '--min-seed-chain-part-cover', or in 'alignmentParams' of pathogen.json.",
      ref_range_before.start + 1,
      ref_range_before.end,
      ref_range_after.start + 1,
      ref_range_after.end,
      format_number_human(deletion as u64),
      format_number_human(qry_len as u64)
    );
  }

  let mut terminal_bandwidth = params.terminal_bandwidth as isize;
  let mut excess_bandwidth = params.excess_bandwidth as isize;
  let mut minimal_bandwidth = max(1, params.allowed_mismatches as isize);
  let max_band_area = params.max_band_area;
  let mut attempt = 0;

  let (stripes, band_area) = create_alignment_band(
    &seed_matches,
    qry_len as isize,
    ref_len as isize,
    terminal_bandwidth,
    excess_bandwidth,
    minimal_bandwidth,
  );
  if band_area > max_band_area {
    let length_ratio = qry_len as f64 / ref_len as f64;
    let band_area_fmt = format_number_human(band_area);
    let max_band_area_fmt = format_number_human(max_band_area);
    let qry_len_fmt = format_number_human(qry_len as u64);
    let ref_len_fmt = format_number_human(ref_len as u64);
    let limit_advice = "The limit can be raised with the Nextclade CLI flag '--max-band-area' or with 'alignmentParams.maxBandArea' in pathogen.json.";
    return if length_ratio > MAX_SIMILAR_LENGTH_RATIO {
      make_error!(
        "Alignment band area ({band_area_fmt}) exceeds limit ({max_band_area_fmt}). \
        Query sequence length ({qry_len_fmt} nt) is significantly larger than reference ({ref_len_fmt} nt). \
        Possible reasons: concatenated sequences, assembly scaffolds, or wrong reference sequence. \
        {limit_advice}"
      )
    } else if length_ratio < 1.0 / MAX_SIMILAR_LENGTH_RATIO {
      make_error!(
        "Alignment band area ({band_area_fmt}) exceeds limit ({max_band_area_fmt}). \
        Query sequence length ({qry_len_fmt} nt) is significantly smaller than reference ({ref_len_fmt} nt). \
        Possible reasons: seed matches in distant parts of the reference (for example, in repeated regions), chimeric or rearranged sequence, or wrong reference sequence. \
        {limit_advice}"
      )
    } else {
      make_error!(
        "Alignment band area ({band_area_fmt}) exceeds limit ({max_band_area_fmt}). \
        Sequence length ({qry_len_fmt} nt) is similar to reference ({ref_len_fmt} nt), but alignment requires excessive search space. \
        Possible reasons: large structural rearrangements, recombination, or wrong reference sequence. \
        {limit_advice}"
      )
    };
  }

  let mut alignment = align_pairwise(&qry_seq, ref_seq, gap_open_close, params, &stripes)?;
  // 1-based number of the attempt that produced `alignment`, and the score of the attempt before it
  let mut kept_attempt = 1;
  let mut previous_score: Option<i32> = None;
  let mut retry_stop: Option<RetryStop> = None;

  while alignment.hit_boundary && attempt < params.max_alignment_attempts {
    info!(
      "When processing sequence #{index} '{seq_name}': In nucleotide alignment: Band boundary is hit on attempt {}. Retrying with relaxed parameters. Alignment score was: {}",
      attempt + 1,
      alignment.alignment_score
    );
    // double bandwidth parameters or increase to one if 0
    terminal_bandwidth = max(2 * terminal_bandwidth, 1);
    excess_bandwidth = max(2 * excess_bandwidth, 1);
    minimal_bandwidth = max(2 * minimal_bandwidth, 1);
    attempt += 1;
    // make new band
    let (stripes, band_area) = create_alignment_band(
      &seed_matches,
      qry_len as isize,
      ref_len as isize,
      terminal_bandwidth,
      excess_bandwidth,
      minimal_bandwidth,
    );
    // discard stripes and break to return previous alignment
    if band_area > max_band_area {
      retry_stop = Some(RetryStop::BandAreaLimit { band_area });
      break;
    }
    // realign, or keep the previous alignment if the wider band does not fit into memory
    match align_pairwise(&qry_seq, ref_seq, gap_open_close, params, &stripes) {
      Ok(retry) => {
        previous_score = Some(alignment.alignment_score);
        alignment = retry;
        kept_attempt = attempt + 1;
      }
      Err(report) => {
        retry_stop = Some(RetryStop::Allocation(report));
        break;
      }
    }
  }
  // report success/failure of broadening of band width
  if alignment.hit_boundary {
    let score = alignment.alignment_score;
    let reason = match retry_stop {
      Some(RetryStop::Allocation(report)) => Some(report_to_string(&report)),
      Some(RetryStop::BandAreaLimit { band_area }) => Some(format!(
        "the band area of the next attempt ({}) exceeds the limit ({})",
        format_number_human(band_area),
        format_number_human(max_band_area)
      )),
      // All retries are used. A score that still rises shows that a wider band can find a better path. Equal scores
      // are expected for a query with a long terminal overhang, which touches the boundary in the free terminal row
      // with any band width
      None => match previous_score {
        None => Some(o!("retries are disabled (max alignment attempts is 0)")),
        Some(previous_score) if score > previous_score => Some(format!(
          "the retry limit ({}) is reached, and the last retry raised the alignment score from {previous_score} to {score}",
          params.max_alignment_attempts
        )),
        Some(_) => None,
      },
    };
    if let Some(reason) = reason {
      let warning = format!(
        "When processing sequence #{index} '{seq_name}': In nucleotide alignment: the alignment touches the band boundary on attempt {kept_attempt}, and a wider band cannot be used: {reason}. The alignment of attempt {kept_attempt} is kept and can be inaccurate near the band boundary"
      );
      warn!("{warning}");
      alignment.warnings.push(warning);
    } else {
      info!(
        "When processing sequence #{index} '{seq_name}': In nucleotide alignment: Attempted to relax band parameters {attempt} times, but still hitting the band boundary. Returning last attempt with score: {score}"
      );
    }
  } else if attempt > 0 {
    info!(
      "When processing sequence #{index} '{seq_name}': In nucleotide alignment: Succeeded without hitting band boundary on attempt {}. Alignment score was: {}",
      attempt + 1,
      alignment.alignment_score
    );
  }
  alignment.is_reverse_complement = is_reverse_complement;
  Ok(alignment)
}

/// align amino acids using a fixed bandwidth banded alignment while penalizing terminal indels
pub fn align_aa(
  qry_seq: &[Aa],
  ref_seq: &[Aa],
  gap_open_close: &GapScoreMap,
  params: &AlignPairwiseParams,
  band_width: usize,
  mean_shift: i32,
) -> Result<AlignmentOutput<Aa>, Report> {
  let stripes = simple_stripes(mean_shift, band_width, ref_seq.len(), qry_seq.len());

  align_pairwise(qry_seq, ref_seq, gap_open_close, params, &stripes)
}

/// Reason why the retry loop of `align_nuc` did not try a wider band
enum RetryStop {
  /// The wider band exceeds `max_band_area`
  BandAreaLimit { band_area: u64 },
  /// The alignment matrix of the wider band cannot be allocated
  Allocation(Report),
}

#[cfg(test)]
pub mod tests {
  #![allow(clippy::needless_pass_by_value)]
  // rstest fixtures are passed by value
  use super::*;
  use crate::align::gap_open::{GapScoreMap, get_gap_open_close_scores_codon_aware};
  use crate::align::params::GapAlignmentSide;
  use crate::align::seed_match::{find_distant_seed_chain_gap, get_seed_matches2};
  use crate::alphabet::nuc::{from_nuc_seq, to_nuc_seq};
  use crate::assert_error;
  use crate::gene::gene_map::GeneMap;
  use crate::translate::complement::reverse_complement_in_place;
  use eyre::Report;
  use itertools::Itertools;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};
  use std::ops::Range;

  struct Context {
    params: AlignPairwiseParams,
    gap_open_close: GapScoreMap,
  }

  #[fixture]
  fn ctx() -> Context {
    let params = AlignPairwiseParams {
      min_length: 3,
      min_match_length: 5,
      penalty_gap_open: 5,
      gap_alignment_side: GapAlignmentSide::Right,
      ..AlignPairwiseParams::default()
    };

    let gene_map = GeneMap::new();

    let dummy_ref_seq = vec![Nuc::Gap; 100];
    let gap_open_close = get_gap_open_close_scores_codon_aware(&dummy_ref_seq, &gene_map, &params);

    Context { params, gap_open_close }
  }

  #[rstest]
  fn aligns_identical(ctx: Context) -> Result<(), Report> {
    let qry_seq = to_nuc_seq("ACGCTCGCT")?;
    let ref_seq = to_nuc_seq("ACGCTCGCT")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_seq), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn pads_missing_left_single(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq( "CGCTCGCT")?;
    let ref_seq = to_nuc_seq("ACGCTCGCT")?;
    let qry_aln = to_nuc_seq("-CGCTCGCT")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn pads_missing_left(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq(   "CTCGCT")?;
    let ref_seq = to_nuc_seq("ACGCTCGCT")?;
    let qry_aln = to_nuc_seq("---CTCGCT")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn pads_missing_left_with_single_mismatch(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq(     "TCCAATCA")?;
    let ref_seq = to_nuc_seq("AACAAACCAACCA")?;
    let qry_aln = to_nuc_seq("-----TCCAATCA")?;
    //                                  ^

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn pads_missing_left_with_mismatches_adjacent(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq(     "TGTTACCTGCGC")?;
    let ref_seq = to_nuc_seq("AAGGTTTATACCTGCGC")?;
    let qry_aln = to_nuc_seq("-----TGTTACCTGCGC")?;
    //                              ^^

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn pads_missing_right(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("ACGCTC"     )?;
    let ref_seq = to_nuc_seq("ACGCTCGCT")?;
    let qry_aln = to_nuc_seq("ACGCTC---")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn pads_missing_right_with_single_mismatch(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("CCAATCAT"     )?;
    let ref_seq = to_nuc_seq("CCAACCAAACAAA")?;
    let qry_aln = to_nuc_seq("CCAATCAT-----")?;
    //                             ^

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn pads_missing_right_with_multiple_mismatches(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("CCGATCAT"     )?;
    let ref_seq = to_nuc_seq("CCGACCAAACAAA")?;
    let qry_aln = to_nuc_seq("CCGATCAT-----")?;
    //                            ^  ^

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn handles_query_contained_in_ref(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq(   "ACGCTC"   )?;
    let ref_seq = to_nuc_seq("GCCACGCTCGCT")?;
    let qry_aln = to_nuc_seq("---ACGCTC---")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn handles_ref_contained_in_query(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("GCCACGCTCGCT")?;
    let ref_seq = to_nuc_seq("ACGCTC")?;
    let ref_aln = to_nuc_seq("---ACGCTC---")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_seq), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn adds_gaps_when_one_mismatch(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq(  "GCCACTCCCT")?;
    let ref_seq = to_nuc_seq("GCCACGCTCGCT")?;
    let qry_aln = to_nuc_seq("GCCA--CTCCCT")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    // assert_eq!(18, result.alignment_score);
    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn adds_gaps_in_ref_when_one_ambiguous_but_matching_char(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("GCCACGCTCRCT")?;
    let ref_seq = to_nuc_seq("GCCACTCGCT")?;
    let ref_aln = to_nuc_seq("GCCA--CTCGCT")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_seq), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_ambiguous_deletion_with_gap_alignment_side_right(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("ACATCTTC"   )?;
    let ref_seq = to_nuc_seq("ACATAGTCTTC")?;
    let qry_aln = to_nuc_seq("ACA---TCTTC")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_ambiguous_deletion_with_gap_alignment_side_left(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("ACATCTTC"   )?;
    let ref_seq = to_nuc_seq("ACATAGTCTTC")?;
    let qry_aln = to_nuc_seq("ACAT---CTTC")?;

    let params = AlignPairwiseParams {
      min_length: 3,
      penalty_gap_open: 5,
      gap_alignment_side: GapAlignmentSide::Left,
      ..AlignPairwiseParams::default()
    };

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &params,
    )?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_ambiguous_insertion_with_gap_alignment_side_right(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("ACATAGTCTTG")?;
    let ref_seq = to_nuc_seq("ACATCTTG")?;
    let ref_aln = to_nuc_seq("ACA---TCTTG")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_seq), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_ambiguous_insertion_with_gap_alignment_side_left(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("ACATAGTCTTG")?;
    let ref_seq = to_nuc_seq("ACATCTTG")?;
    let ref_aln = to_nuc_seq("ACAT---CTTG")?;

    let params = AlignPairwiseParams {
      gap_alignment_side: GapAlignmentSide::Left,
      ..ctx.params
    };

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &params,
    )?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_seq), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_minimal_overlap_qry_first(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("AAAAAAAAAAAA")?;
    let ref_seq = to_nuc_seq("AAATTTTTTTTTT")?;
    let qry_aln = to_nuc_seq("AAAAAAAAAAAA----------")?;
    let ref_aln = to_nuc_seq("---------AAATTTTTTTTTT")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_minimal_overlap_ref_first(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let ref_seq = to_nuc_seq("AAAAAAAAAAAA")?;
    let qry_seq = to_nuc_seq("AAATTTTTTTTTT")?;
    let ref_aln = to_nuc_seq("AAAAAAAAAAAA----------")?;
    let qry_aln = to_nuc_seq("---------AAATTTTTTTTTT")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn preferentially_gap_unknown(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let ref_seq = to_nuc_seq("ACATATACTTG")?;
    let qry_seq = to_nuc_seq("ACATNATACTTG")?;
    let ref_aln = to_nuc_seq("ACAT-ATACTTG")?;

    let result = align_nuc(
      0,
      "",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &ctx.gap_open_close,
      &ctx.params,
    )?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_seq), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  #[rustfmt::skip]
  fn general_case(ctx: Context) -> Result<(), Report> {
    let ref_seq = to_nuc_seq("CTTGGAGGTTCCGTGGCTAGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTGAGCCTTTGT"       )?;
    let qry_seq = to_nuc_seq("CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATCAAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT"     )?;
    let ref_aln = to_nuc_seq("CTTGGAGGTTCCGTGGCT----AGATAACAGAACATTCTTGGAATGCTGATCTTTATAAGCTCATGCGACACTTCGCATGGTG---AGCCTTTGT")?;
    let qry_aln = to_nuc_seq("CTTGGAGGTTCCGTGGCTATAAAGATAACAGAACATTCTTGGAATGCTGATC-----AAGCTCATGGGACANNNNNCATGGTGGACAGCCTTTGT")?;

    let result = align_nuc(0, "", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &ctx.gap_open_close, &ctx.params)?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  // Deletions next to the low-coordinate end of a CDS. The codon-aware open penalty applies only where a deletion starts,
  // so without `penalty_gap_enter_cds` a deletion that starts before a CDS and ends inside of it pays only the flat open
  // penalty, and the tie-break can select it over an equally good deletion outside of the CDS
  mod cds_boundary {
    use std::ops::Range;

    #[derive(Debug)]
    pub struct Case {
      /// Optimal alignment with the gap outside of the CDS. The input sequences are these strings without gaps
      pub ref_aln: &'static str,
      pub qry_aln: &'static str,
      pub gff: &'static str,
    }

    /// Reference sequence and annotation. The query sequences are the expected alignments without gaps
    #[derive(Debug)]
    pub struct Region {
      pub ref_seq: &'static str,
      pub gff: &'static str,
    }

    /// 6-nt deletion at a CDS start (mpox OPG112, Ivory_Coast_2012). Codon 1 and codon 3 are both `ATG`, so the
    /// deletion has 8 placements with the same matches, from 2 bases before the CDS to inside of codon 4
    #[rustfmt::skip]
    pub const STRADDLE: Region = Region {
      //        0         1         2         3         4         5
      //        012345678901234567890123456789012345678901234567890123456789
      ref_seq: "TCTTTACACAAATAATTACAAGACCGATAAATGGAAATGGATAAACGGATGAAATCTCTC",
      //                                      [----------CDS1-------------]
      //                                       M  E  M  D  K  R  M  K  S  L
      gff: r#"##gff-version 3
ref	.	CDS	31	60	.	+	0	Name=CDS1
"#,
    };

    /// `STRADDLE` with codons 2 and 3 deleted: in-frame, keeps the start codon
    #[rustfmt::skip]
    //                                        0         1         2         3         4         5
    //                                        012345678901234567890123456789012345678901234567890123456789
    pub const STRADDLE_CODONS_2_3: &str =    "TCTTTACACAAATAATTACAAGACCGATAAATG------GATAAACGGATGAAATCTCTC";

    /// `STRADDLE` with codons 1 and 2 deleted: in-frame
    #[rustfmt::skip]
    pub const STRADDLE_CODONS_1_2: &str =    "TCTTTACACAAATAATTACAAGACCGATAA------ATGGATAAACGGATGAAATCTCTC";

    /// `STRADDLE` with a deletion that starts 2 bases before the CDS: removes codon 1 and cuts codon 2
    #[rustfmt::skip]
    pub const STRADDLE_ACROSS_START: &str =  "TCTTTACACAAATAATTACAAGACCGAT------AAATGGATAAACGGATGAAATCTCTC";

    /// 15-nt deletion across the end of one CDS and the start of the next (SARS-CoV-2 ORF7b and ORF8,
    /// Switzerland/BE-ETHZ-630376/2021). Every placement enters the second CDS. The only placement without substitutions,
    /// `CROSSING_QRY`, starts at the last base of the first CDS. Moving it one base to the right avoids the first CDS
    /// but adds the substitution A18T, and the query codon at 16-18 is `TAT` in both placements
    #[rustfmt::skip]
    pub const CROSSING: Region = Region {
      //        0         1         2         3         4         5
      //        012345678901234567890123456789012345678901234567890
      ref_seq: "GAAACTTGTCACGCCTAAACGAACATGAAATTTCTTGTTTTCTTAGGAATC",
      //        [-----CDS1------]      [----------CDS2-----------]
      gff: r#"##gff-version 3
ref	.	CDS	1	18	.	+	0	Name=CDS1
ref	.	CDS	25	51	.	+	0	Name=CDS2
"#,
    };

    /// `CROSSING` with the deletion that starts at the last base of the first CDS
    #[rustfmt::skip]
    //                                        0         1         2         3         4         5
    //                                        012345678901234567890123456789012345678901234567890
    pub const CROSSING_QRY: &str =           "GAAACTTGTCACGCCTA---------------TCTTGTTTTCTTAGGAATC";

    /// 8-nt UTR deletion before the CDS start (CVA10 VP4): the query `A` after the gap matches the last UTR base or
    /// the first CDS base
    #[rustfmt::skip]
    pub const SHORT_TIE: Case = Case {
      //                 0         1         2         3
      //                 012345678901234567890123456789012345678
      ref_aln:          "TTTGAACACAAGAAAATGGGGGCTCAAGTGTCAACACAG",
      //                 |||||||        ||||||||||||||||||||||||
      qry_aln:          "TTTGAAC--------ATGGGGGCTCAAGTGTCAACACAG",
      //                                [---------CDS1---------]
      //
      // Left gives:     TTTGAACA--------TGGGGGCTCAAGTGTCAACACAG
      //
      //  Match:  |  identical  (space) gap
      //  [--label--]  CDS span
      gff: r#"##gff-version 3
ref	.	CDS	16	39	.	+	0	Name=CDS1
"#,
    };

    /// Tandem repeat `ATGAAG` across the CDS start (mpox OPG204): the query has one repeat unit less
    #[rustfmt::skip]
    pub const TANDEM_REPEAT: Case = Case {
      //                 0         1         2         3         4         5
      //                 01234567890123456789012345678901234567890123456789012345
      ref_aln:          "ATCTTAGTACCTATGATGAAGATGAAGATGAAGATGAAGATGATGGTCCGTATATA",
      //                 ||||||||||||||      ||||||||||||||||||||||||||||||||||||
      qry_aln:          "ATCTTAGTACCTAT------GATGAAGATGAAGATGAAGATGATGGTCCGTATATA",
      //                                >>>>>>>>>>>>>>>>>>>>>>>>
      //                                            [----------CDS1-----------]
      //
      // Left gives:     ATCTTAGTACCTATGATGAAGATGAA------GATGAAGATGATGGTCCGTATATA
      //
      //  Match:  |  identical  (space) gap
      //  >  tandem repeat ATGAAG
      //  [--label--]  CDS span
      gff: r#"##gff-version 3
ref	.	CDS	28	54	.	+	0	Name=CDS1
"#,
    };

    /// Deletion next to a run of `N` before the CDS start (EV-D68 VP4, GenBank MF045417): `N` matches every base with
    /// the same score, so the deletion moves across the `N` run with no change in score
    #[rustfmt::skip]
    pub const N_RUN: Case = Case {
      //                 0         1         2         3         4         5         6         7         8
      //                 01234567890123456789012345678901234567890123456789012345678901234567890123456789012
      ref_aln:          "ACTTCACCTCAAAACCTCCAGTACATAAAATTTGAAAAGTTTAAACTTATTTATAATAATGGGAGCTCAAGTTACTAGACAGC",
      //                 ||||                       .|::::::::::::::::::::::::::::||||||||||||.|||||||||||.|
      qry_aln:          "ACTT-----------------------TANNNNNNNNNNNNNNNNNNNNNNNNNNNNAATGGGAGCTCAGGTTACTAGACAAC",
      //                                                                           [---------CDS1---------]
      //
      // Left gives:     ACTTTANNNNNNNNNNNNNNNNNNNNNNNNNNNNAA-----------------------TGGGAGCTCAGGTTACTAGACAAC
      //
      //  Match:  |  identical  .  substitution  :  N  (space) gap
      //  [--label--]  CDS span
      gff: r#"##gff-version 3
ref	.	CDS	59	82	.	+	0	Name=CDS1
"#,
    };

    /// Query that starts near the CDS start (dengue/all C, GenBank KY586941): an unaligned 5' end and an internal
    /// deletion that ends inside the CDS have the same score. As in the dengue/all annotation, the CDS starts one codon
    /// after the `ATG`, so this case covers the tie only, not a start codon
    #[rustfmt::skip]
    pub const UNALIGNED_5_END: Case = Case {
      //                 0         1         2         3         4         5         6
      //                 0123456789012345678901234567890123456789012345678901234567890123
      ref_aln:          "TCTAACAGTTTTTTTAATTAGAGAGCAGATCTCTGAGATGAACAACCAACGGAAAAAGGCGGGA",
      //                                                     .|..|..||||||||.|||||||.||..
      qry_aln:          "------------------------------------AAAAATGAACCAACGAAAAAAGGTGGTT",
      //                                                         [---------CDS1---------]
      //
      // Left gives:     ---AAAAATG---------------------------------AACCAACGAAAAAAGGTGGTT
      //
      //  Match:  |  identical  .  substitution  (space) gap
      //  [--label--]  CDS span
      gff: r#"##gff-version 3
ref	.	CDS	41	64	.	+	0	Name=CDS1
"#,
    };

    /// Insertion in an `A` run next to the CDS start: an insertion pays the cost of the reference base after it, so the
    /// CDS cost keeps it outside of the CDS with both gap sides
    #[rustfmt::skip]
    pub const INSERTION: Case = Case {
      //                 0         1         2         3
      //                 0123456789012345678901234567890123456789
      ref_aln:          "TTTGAACACAAG-AAAATGGGGGCTCAAGTGTCAACACAG",
      //                 |||||||||||| |||||||||||||||||||||||||||
      qry_aln:          "TTTGAACACAAGAAAAATGGGGGCTCAAGTGTCAACACAG",
      //                                 [---------CDS1---------]
      //
      //  Match:  |  identical  (space) gap
      //  [--label--]  CDS span
      gff: r#"##gff-version 3
ref	.	CDS	16	39	.	+	0	Name=CDS1
"#,
    };

    /// `SHORT_TIE` as reverse complement, with a reverse-strand CDS: the start codon (`CAT`) is at the 3' end of the
    /// reference range. The tied gap that removes it starts inside the CDS and pays the CDS cost
    #[rustfmt::skip]
    pub const REVERSE_STRAND_START: Case = Case {
      //                 0         1         2         3
      //                 012345678901234567890123456789012345678
      ref_aln:          "CTGTGTTGACACTTGAGCCCCCATTTTCTTGTGTTCAAA",
      //                 ||||||||||||||||||||||||        |||||||
      qry_aln:          "CTGTGTTGACACTTGAGCCCCCAT--------GTTCAAA",
      //                 [-----CDS1 reverse-----]
      //
      //  Match:  |  identical  (space) gap
      //  [--label--]  CDS span
      gff: r#"##gff-version 3
ref	.	CDS	1	24	.	-	0	Name=CDS1
"#,
    };

    /// `SHORT_TIE` with a reverse-strand CDS: the tied gap removes the first CDS base in reference coordinates, which is
    /// the last base of the reverse-strand CDS
    #[rustfmt::skip]
    pub const REVERSE_STRAND_END: Case = Case {
      //                 0         1         2         3
      //                 012345678901234567890123456789012345678
      ref_aln:          "TTTGAACACAAGAAAATGGGGGCTCAAGTGTCAACACAG",
      //                 |||||||        ||||||||||||||||||||||||
      qry_aln:          "TTTGAAC--------ATGGGGGCTCAAGTGTCAACACAG",
      //                                [-----CDS1 reverse-----]
      //
      // Left gives:     TTTGAACA--------TGGGGGCTCAAGTGTCAACACAG
      //
      //  Match:  |  identical  (space) gap
      //  [--label--]  CDS span
      gff: r#"##gff-version 3
ref	.	CDS	16	39	.	-	0	Name=CDS1
"#,
    };

    /// Aligned query from the first to the last CDS column, with insertions inside of the CDS
    pub fn qry_aln_in_cds(ref_aln: &str, qry_aln: &str, cds: Range<usize>) -> String {
      let ref_cols = ref_aln
        .chars()
        .enumerate()
        .filter(|(_, c)| *c != '-')
        .map(|(col, _)| col)
        .collect::<Vec<_>>();
      let cds_cols = ref_cols[cds.start]..=ref_cols[cds.end - 1];
      qry_aln
        .chars()
        .enumerate()
        .filter(|(col, _)| cds_cols.contains(col))
        .map(|(_, c)| c)
        .collect()
    }
  }

  #[rstest]
  #[rustfmt::skip]
  #[case::short_tie_left(             cds_boundary::SHORT_TIE,             GapAlignmentSide::Left  )]
  #[case::short_tie_right(            cds_boundary::SHORT_TIE,             GapAlignmentSide::Right )]
  #[case::tandem_repeat_left(         cds_boundary::TANDEM_REPEAT,         GapAlignmentSide::Left  )]
  #[case::tandem_repeat_right(        cds_boundary::TANDEM_REPEAT,         GapAlignmentSide::Right )]
  #[case::n_run_left(                 cds_boundary::N_RUN,                 GapAlignmentSide::Left  )]
  #[case::n_run_right(                cds_boundary::N_RUN,                 GapAlignmentSide::Right )]
  #[case::unaligned_5_end_left(       cds_boundary::UNALIGNED_5_END,       GapAlignmentSide::Left  )]
  #[case::unaligned_5_end_right(      cds_boundary::UNALIGNED_5_END,       GapAlignmentSide::Right )]
  #[case::insertion_left(             cds_boundary::INSERTION,             GapAlignmentSide::Left  )]
  #[case::insertion_right(            cds_boundary::INSERTION,             GapAlignmentSide::Right )]
  #[case::reverse_strand_start_left(  cds_boundary::REVERSE_STRAND_START,  GapAlignmentSide::Left  )]
  #[case::reverse_strand_start_right( cds_boundary::REVERSE_STRAND_START,  GapAlignmentSide::Right )]
  #[case::reverse_strand_end_left(    cds_boundary::REVERSE_STRAND_END,    GapAlignmentSide::Left  )]
  #[case::reverse_strand_end_right(   cds_boundary::REVERSE_STRAND_END,    GapAlignmentSide::Right )]
  #[trace]
  fn aligns_ambiguous_gap_outside_of_cds(
    #[case] case: cds_boundary::Case,
    #[case] gap_alignment_side: GapAlignmentSide,
  ) -> Result<(), Report> {
    let ref_seq = to_nuc_seq(&case.ref_aln.replace('-', ""))?;
    let qry_seq = to_nuc_seq(&case.qry_aln.replace('-', ""))?;
    let gene_map = GeneMap::from_str(case.gff)?;

    // Seed settings for short sequences, gap penalties of the dengue dataset, with which `UNALIGNED_5_END` ties, and the
    // smallest CDS entry penalty, which breaks the ties
    let params = AlignPairwiseParams {
      min_length: 3,
      min_match_length: 5,
      min_seed_cover: 0.01.into(),
      kmer_length: 6,
      kmer_distance: 3,
      penalty_gap_open: 8,
      penalty_gap_open_in_frame: 12,
      penalty_gap_open_out_of_frame: 14,
      penalty_gap_enter_cds: 1,
      gap_alignment_side,
      ..AlignPairwiseParams::default()
    };
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params);

    let result = align_nuc(0, "", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &gap_open_close, &params)?;

    // All placements of the gap outside of the CDS give the same aligned query inside of the CDS
    let cds = gene_map.iter_cdses().next().unwrap().segments[0].range.to_std();
    let expected_qry_aln_in_cds = cds_boundary::qry_aln_in_cds(case.ref_aln, case.qry_aln, cds.clone());
    let actual_qry_aln_in_cds = cds_boundary::qry_aln_in_cds(&from_nuc_seq(&result.ref_seq), &from_nuc_seq(&result.qry_seq), cds);
    assert_eq!(expected_qry_aln_in_cds, actual_qry_aln_in_cds);
    Ok(())
  }

  // Default gap penalties (open 6, in-frame 7, out-of-frame 8), as in the mpox and SARS-CoV-2 datasets. A CDS entry
  // penalty above in-frame minus open (1) makes a deletion that starts before the CDS more costly than an in-frame
  // deletion inside of it. At 1, they tie and the gap side decides. A deletion that enters a CDS in every placement keeps
  // its placement with any CDS entry penalty
  #[rstest]
  #[rustfmt::skip]
  #[case::straddle_left(                 &cds_boundary::STRADDLE, GapAlignmentSide::Left,   2, cds_boundary::STRADDLE_CODONS_2_3   )]
  #[case::straddle_right(                &cds_boundary::STRADDLE, GapAlignmentSide::Right,  2, cds_boundary::STRADDLE_CODONS_1_2   )]
  #[case::straddle_right_at_threshold(   &cds_boundary::STRADDLE, GapAlignmentSide::Right,  1, cds_boundary::STRADDLE_ACROSS_START )]
  #[case::crossing_left_no_penalty(      &cds_boundary::CROSSING, GapAlignmentSide::Left,   0, cds_boundary::CROSSING_QRY          )]
  #[case::crossing_left(                 &cds_boundary::CROSSING, GapAlignmentSide::Left,   2, cds_boundary::CROSSING_QRY          )]
  #[case::crossing_left_high_penalty(    &cds_boundary::CROSSING, GapAlignmentSide::Left,  10, cds_boundary::CROSSING_QRY          )]
  #[case::crossing_right_no_penalty(     &cds_boundary::CROSSING, GapAlignmentSide::Right,  0, cds_boundary::CROSSING_QRY          )]
  #[case::crossing_right(                &cds_boundary::CROSSING, GapAlignmentSide::Right,  2, cds_boundary::CROSSING_QRY          )]
  #[case::crossing_right_high_penalty(   &cds_boundary::CROSSING, GapAlignmentSide::Right, 10, cds_boundary::CROSSING_QRY          )]
  #[trace]
  fn aligns_deletion_entering_cds(
    #[case] region: &cds_boundary::Region,
    #[case] gap_alignment_side: GapAlignmentSide,
    #[case] penalty_gap_enter_cds: i32,
    #[case] expected_qry_aln: &str,
  ) -> Result<(), Report> {
    let ref_seq = to_nuc_seq(region.ref_seq)?;
    let qry_seq = to_nuc_seq(&expected_qry_aln.replace('-', ""))?;
    let gene_map = GeneMap::from_str(region.gff)?;

    let params = AlignPairwiseParams {
      min_length: 3,
      min_match_length: 5,
      min_seed_cover: 0.01.into(),
      kmer_length: 6,
      kmer_distance: 3,
      penalty_gap_enter_cds,
      gap_alignment_side,
      ..AlignPairwiseParams::default()
    };
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params);

    let result = align_nuc(0, "", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &gap_open_close, &params)?;

    assert_eq!(
      (region.ref_seq.to_owned(), expected_qry_aln.to_owned()),
      (from_nuc_seq(&result.ref_seq), from_nuc_seq(&result.qry_seq))
    );
    Ok(())
  }

  // The band areas in the messages are regression values of `create_alignment_band`: the area depends on the seed
  // chain and on the trapezoids that the band is built from, so it has no closed form in the test inputs
  #[rstest]
  #[rustfmt::skip]
  #[case::query_much_shorter( (0..10_000, vec![1_000..3_000]), "Alignment band area (104,315) exceeds limit (1). Query sequence length (2,000 nt) is significantly smaller than reference (10,000 nt). Possible reasons: seed matches in distant parts of the reference (for example, in repeated regions), chimeric or rearranged sequence, or wrong reference sequence. The limit can be raised with the Nextclade CLI flag '--max-band-area' or with 'alignmentParams.maxBandArea' in pathogen.json.")]
  #[case::query_similar(      (0..10_000, vec![0..9_500]),     "Alignment band area (171,169) exceeds limit (1). Sequence length (9,500 nt) is similar to reference (10,000 nt), but alignment requires excessive search space. Possible reasons: large structural rearrangements, recombination, or wrong reference sequence. The limit can be raised with the Nextclade CLI flag '--max-band-area' or with 'alignmentParams.maxBandArea' in pathogen.json.")]
  #[case::query_much_longer(  (0..4_000,  vec![0..10_000]),    "Alignment band area (79,454) exceeds limit (1). Query sequence length (10,000 nt) is significantly larger than reference (4,000 nt). Possible reasons: concatenated sequences, assembly scaffolds, or wrong reference sequence. The limit can be raised with the Nextclade CLI flag '--max-band-area' or with 'alignmentParams.maxBandArea' in pathogen.json.")]
  #[trace]
  // A query of one reference segment is a list of one range
  #[allow(clippy::single_range_in_vec_init)]
  fn test_align_rejects_band_above_limit(
    #[case] (ref_range, qry_ranges): (Range<usize>, Vec<Range<usize>>),
    #[case] expected_message: &str,
  ) {
    let random_seq = helpers::random_nuc_seq(10_000, 1);
    let ref_seq = helpers::cut_segments(&random_seq, &[ref_range]);
    let qry_seq = helpers::cut_segments(&random_seq, &qry_ranges);
    let params = AlignPairwiseParams {
      max_band_area: 1,
      ..AlignPairwiseParams::default()
    };
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &GeneMap::new(), &params);

    let result = align_nuc(0, "qry", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &gap_open_close, &params);

    assert_error!(result, expected_message);
  }

  // Band areas of the attempts for `insertion_near_reference_end`: 178,151, 356,751, 746,389, 1,635,029. These are
  // regression values of `create_alignment_band`: the area depends on the seed chain and on the trapezoids that the band
  // is built from, so it has no closed form in the test inputs. Scores of the attempts: 29948, 29948, 29994 (still
  // touching the boundary), 29994 (not touching it). The score of the full alignment is 10,000 matches minus the opening
  // of one insertion: 10,000 * 3 - 6 = 29994
  #[rstest]
  #[rustfmt::skip]
  #[case::band_limit(                     helpers::insertion_near_reference_end, (3,       200_000), (true,  vec!["When processing sequence #0 'qry': In nucleotide alignment: the alignment touches the band boundary on attempt 1, and a wider band cannot be used: the band area of the next attempt (356,751) exceeds the limit (200,000). The alignment of attempt 1 is kept and can be inaccurate near the band boundary"]))]
  #[case::equal_scores_then_band_limit(   helpers::insertion_near_reference_end, (3,       500_000), (true,  vec!["When processing sequence #0 'qry': In nucleotide alignment: the alignment touches the band boundary on attempt 2, and a wider band cannot be used: the band area of the next attempt (746,389) exceeds the limit (500,000). The alignment of attempt 2 is kept and can be inaccurate near the band boundary"]))]
  #[case::retries_used_while_improving(   helpers::insertion_near_reference_end, (2,   500_000_000), (true,  vec!["When processing sequence #0 'qry': In nucleotide alignment: the alignment touches the band boundary on attempt 3, and a wider band cannot be used: the retry limit (2) is reached, and the last retry raised the alignment score from 29948 to 29994. The alignment of attempt 3 is kept and can be inaccurate near the band boundary"]))]
  #[case::no_retries_allowed(             helpers::insertion_near_reference_end, (0,   500_000_000), (true,  vec!["When processing sequence #0 'qry': In nucleotide alignment: the alignment touches the band boundary on attempt 1, and a wider band cannot be used: retries are disabled (max alignment attempts is 0). The alignment of attempt 1 is kept and can be inaccurate near the band boundary"]))]
  #[case::retry_succeeds(                 helpers::insertion_near_reference_end, (3,   500_000_000), (false, vec![]))]
  #[case::retries_used_with_equal_scores( helpers::reference_inside_long_query,   (3,   500_000_000), (true,  vec![]))]
  #[trace]
  fn test_align_warns_when_band_boundary_may_limit_alignment(
    #[case]
    #[notrace]
    input: helpers::Input,
    #[case] (max_alignment_attempts, max_band_area): (usize, u64),
    #[case] (expected_hit_boundary, expected_warnings): (bool, Vec<&str>),
  ) -> Result<(), Report> {
    let (ref_seq, qry_seq) = input();
    let params = AlignPairwiseParams {
      max_band_area,
      max_alignment_attempts,
      ..AlignPairwiseParams::default()
    };
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &GeneMap::new(), &params);

    let result = align_nuc(0, "qry", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &gap_open_close, &params)?;

    assert_eq!(
      (expected_hit_boundary, expected_warnings),
      (result.hit_boundary, result.warnings.iter().map(String::as_str).collect_vec())
    );
    Ok(())
  }

  #[rstest]
  fn test_align_reference_inside_long_query() -> Result<(), Report> {
    let (ref_seq, qry_seq) = helpers::reference_inside_long_query();
    let params = AlignPairwiseParams::default();
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &GeneMap::new(), &params);

    let result = align_nuc(
      0,
      "qry",
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &gap_open_close,
      &params,
    )?;

    // The reference is the middle 1,000 nt of the 5,000 nt query, so the query overhangs by 2,000 nt on both sides
    let expected_ref_aln = ["-".repeat(2_000), from_nuc_seq(&ref_seq), "-".repeat(2_000)].concat();
    assert_eq!(
      (expected_ref_aln, from_nuc_seq(&qry_seq), 1_000 * 3),
      (
        from_nuc_seq(&result.ref_seq),
        from_nuc_seq(&result.qry_seq),
        result.alignment_score
      )
    );
    Ok(())
  }

  const DISTANT_PARTS_ERROR: &str = "Unable to align: the sequence matches two distant parts of the reference (positions 1001-1400 and 21001-21400), which would need a deletion of 19,600 nt in a sequence of 800 nt. This is likely due to a sequence from repeated regions (for example inverted terminal repeats), a chimeric or concatenated sequence, or an incorrect reference sequence. The limits can be changed with the Nextclade CLI flags '--max-seed-chain-deletion-ratio' and '--min-seed-chain-part-cover', or in 'alignmentParams' of pathogen.json.";

  // Query of two segments of a 30 kb reference, 19,600 nt apart
  #[rstest]
  #[rustfmt::skip]
  #[case::distant( &[1_000..1_400, 21_000..21_400], 10.0, DISTANT_PARTS_ERROR )]
  #[trace]
  fn test_align_rejects_seed_chain_linking_distant_parts_of_reference(
    #[case] qry_ranges: &[Range<usize>],
    #[case] max_seed_chain_deletion_ratio: f64,
    #[case] expected_message: &str,
  ) {
    let ref_seq = helpers::random_nuc_seq(30_000, 1);
    let qry_seq = helpers::cut_segments(&ref_seq, qry_ranges);
    let params = AlignPairwiseParams {
      max_seed_chain_deletion_ratio: max_seed_chain_deletion_ratio.into(),
      ..AlignPairwiseParams::default()
    };
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &GeneMap::new(), &params);

    let result = align_nuc(0, "qry", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &gap_open_close, &params);

    assert_error!(result, expected_message);
  }

  // Queries of two segments of a 30 kb reference. Expected: internal deletions of the aligned query
  #[rstest]
  #[rustfmt::skip]
  #[case::near(                     &[1_000..1_400,  2_000..2_400],   10.0, vec![600]    )]
  #[case::distant_one_part_small(   &[1_000..2_000, 22_000..22_150],  10.0, vec![20_000] )]
  #[case::distant_check_turned_off( &[1_000..1_400, 21_000..21_400], 100.0, vec![19_600] )]
  #[trace]
  fn test_align_aligns_seed_chain_of_near_or_small_distant_parts(
    #[case] qry_ranges: &[Range<usize>],
    #[case] max_seed_chain_deletion_ratio: f64,
    #[case] expected_deletions: Vec<usize>,
  ) -> Result<(), Report> {
    let ref_seq = helpers::random_nuc_seq(30_000, 1);
    let qry_seq = helpers::cut_segments(&ref_seq, qry_ranges);
    let params = AlignPairwiseParams {
      max_seed_chain_deletion_ratio: max_seed_chain_deletion_ratio.into(),
      ..AlignPairwiseParams::default()
    };
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &GeneMap::new(), &params);

    let alignment = align_nuc(0, "qry", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &gap_open_close, &params)?;

    assert_eq!(
      (from_nuc_seq(&ref_seq), expected_deletions),
      (from_nuc_seq(&alignment.ref_seq), helpers::internal_gap_lengths(&from_nuc_seq(&alignment.qry_seq)))
    );
    Ok(())
  }

  // The small part of `distant_one_part_small` must get seeds, otherwise the part-cover condition is not tested. With
  // the part-cover condition turned off, the gap between the parts is found, and its deletion is the distance of the
  // segments in the reference minus their distance in the query: 22,000 - 2,000 = 20,000
  #[rstest]
  #[rustfmt::skip]
  #[case::part_cover_turned_off( 0.0, Some(20_000) )]
  #[case::part_cover_0_2(        0.2, None         )]
  #[trace]
  fn test_align_seed_chain_of_distant_small_part_fails_only_part_cover(
    #[case] min_seed_chain_part_cover: f64,
    #[case] expected_deletion: Option<usize>,
  ) -> Result<(), Report> {
    let ref_seq = helpers::random_nuc_seq(30_000, 1);
    let qry_seq = helpers::cut_segments(&ref_seq, &[1_000..2_000, 22_000..22_150]);
    let params = AlignPairwiseParams::default();

    let seed_matches = get_seed_matches2(&qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &params)?;
    let gap = find_distant_seed_chain_gap(
      &seed_matches,
      qry_seq.len(),
      *params.max_seed_chain_deletion_ratio,
      min_seed_chain_part_cover,
    );

    assert_eq!(expected_deletion, gap.map(|gap| gap.deletion));
    Ok(())
  }

  // With the reverse-complement retry, the check runs once, on the chain of the chosen orientation
  #[rstest]
  #[rustfmt::skip]
  #[case::forward_rejected_without_retry( helpers::distant_parts_with_reverse_complemented_tail, "Unable to align: the sequence matches two distant parts of the reference (positions 1001-1400 and 21001-21400), which would need a deletion of 19,600 nt in a sequence of 1,300 nt. This is likely due to a sequence from repeated regions (for example inverted terminal repeats), a chimeric or concatenated sequence, or an incorrect reference sequence. The limits can be changed with the Nextclade CLI flags '--max-seed-chain-deletion-ratio' and '--min-seed-chain-part-cover', or in 'alignmentParams' of pathogen.json.")]
  #[case::reverse_complement_rejected(    helpers::reverse_complemented_distant_parts,         DISTANT_PARTS_ERROR)]
  #[trace]
  fn test_align_rejects_distant_seed_chain_of_chosen_orientation(
    #[case]
    #[notrace]
    input: helpers::Input,
    #[case] expected_message: &str,
  ) {
    let (ref_seq, qry_seq) = input();
    let params = AlignPairwiseParams {
      retry_reverse_complement: true,
      ..AlignPairwiseParams::default()
    };
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &GeneMap::new(), &params);

    let result = align_nuc(0, "qry", &qry_seq, &ref_seq, &CodonSpacedIndex::from_sequence(&ref_seq), &gap_open_close, &params);

    assert_error!(result, expected_message);
  }

  // The reverse complement of `distant_parts_with_reverse_complemented_tail` passes seed matching, so a retry after the
  // rejection of the forward chain would align the sequence
  #[rstest]
  fn test_align_reverse_complement_of_distant_parts_with_reverse_complemented_tail_passes_seed_matching()
  -> Result<(), Report> {
    let (ref_seq, mut qry_seq) = helpers::distant_parts_with_reverse_complemented_tail();
    reverse_complement_in_place(&mut qry_seq);

    get_seed_matches2(
      &qry_seq,
      &ref_seq,
      &CodonSpacedIndex::from_sequence(&ref_seq),
      &AlignPairwiseParams::default(),
    )?;
    Ok(())
  }

  pub mod helpers {
    use crate::alphabet::nuc::Nuc;
    use crate::translate::complement::reverse_complement_in_place;
    use proptest::prelude::RngCore;
    use proptest::test_runner::{RngAlgorithm, TestRng};
    use std::iter::repeat_with;
    use std::ops::Range;

    /// Function that returns a reference and a query
    pub type Input = fn() -> (Vec<Nuc>, Vec<Nuc>);

    /// Pseudo-random nucleotide sequence of `A`, `C`, `G` and `T`. The same seed gives the same sequence. In sequences
    /// of tens of kilobases every seed k-mer is unique, so seed matching finds each segment at its origin
    pub fn random_nuc_seq(len: usize, seed: u8) -> Vec<Nuc> {
      const NUCS: [Nuc; 4] = [Nuc::A, Nuc::C, Nuc::G, Nuc::T];
      let mut rng = TestRng::from_seed(RngAlgorithm::ChaCha, &[seed; 32]);
      repeat_with(|| NUCS[(rng.next_u32() % 4) as usize]).take(len).collect()
    }

    /// Concatenation of the given ranges of a sequence
    pub fn cut_segments(seq: &[Nuc], ranges: &[Range<usize>]) -> Vec<Nuc> {
      ranges
        .iter()
        .flat_map(|range| seq[range.clone()].iter().copied())
        .collect()
    }

    /// Lengths of the gap runs of an aligned sequence, without the terminal gaps
    pub fn internal_gap_lengths(aln: &str) -> Vec<usize> {
      aln
        .trim_matches('-')
        .split(|c| c != '-')
        .filter(|run| !run.is_empty())
        .map(str::len)
        .collect()
    }

    /// 30 kb reference, and a query of two 400 nt segments 19,600 nt apart, followed by the reverse complement of a
    /// 500 nt segment between them
    pub fn distant_parts_with_reverse_complemented_tail() -> (Vec<Nuc>, Vec<Nuc>) {
      let ref_seq = random_nuc_seq(30_000, 1);
      let mut tail = ref_seq[10_000..10_500].to_vec();
      reverse_complement_in_place(&mut tail);
      let qry_seq = [cut_segments(&ref_seq, &[1_000..1_400, 21_000..21_400]), tail].concat();
      (ref_seq, qry_seq)
    }

    /// 30 kb reference, and the reverse complement of a query of two 400 nt segments 19,600 nt apart
    pub fn reverse_complemented_distant_parts() -> (Vec<Nuc>, Vec<Nuc>) {
      let ref_seq = random_nuc_seq(30_000, 1);
      let mut qry_seq = cut_segments(&ref_seq, &[1_000..1_400, 21_000..21_400]);
      reverse_complement_in_place(&mut qry_seq);
      (ref_seq, qry_seq)
    }

    /// 10 kb reference, and a query with a 200 nt insertion 30 nt before the reference end. The insertion is wider than
    /// the terminal band of the first attempts, so the alignment touches the band boundary until the band is wide enough
    pub fn insertion_near_reference_end() -> (Vec<Nuc>, Vec<Nuc>) {
      let ref_seq = random_nuc_seq(10_000, 1);
      let insertion = random_nuc_seq(200, 2);
      let qry_seq = [&ref_seq[..9_970], &insertion, &ref_seq[9_970..]].concat();
      (ref_seq, qry_seq)
    }

    /// 1 kb reference inside of a 5 kb query, as when a whole genome is analyzed with a single-gene dataset. The
    /// alignment touches the band boundary in the free terminal gaps with any band width
    pub fn reference_inside_long_query() -> (Vec<Nuc>, Vec<Nuc>) {
      let random_seq = random_nuc_seq(10_000, 1);
      (random_seq[4_000..5_000].to_vec(), random_seq[2_000..7_000].to_vec())
    }
  }
}
