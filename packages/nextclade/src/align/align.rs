use crate::align::backtrace::{AlignmentOutput, backtrace};
use crate::align::band_2d::Stripe;
use crate::align::band_2d::{full_matrix, simple_stripes};
use crate::align::params::AlignPairwiseParams;
use crate::align::score_matrix::{ScoreMatrixResult, score_matrix};
use crate::align::seed_alignment::create_alignment_band;
use crate::align::seed_match::{CodonSpacedIndex, SeedMatchesResult, get_seed_matches_maybe_reverse_complement};
use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::make_error;
use crate::utils::num_human::format_number_human;
use eyre::{Report, WrapErr};
use log::{info, trace};
use std::cmp::max;

fn align_pairwise<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  gap_open_close: &[i32],
  params: &AlignPairwiseParams,
  stripes: &[Stripe],
) -> AlignmentOutput<T> {
  trace!("Align pairwise: started. Params: {params:?}");

  let ScoreMatrixResult { scores, paths } = score_matrix(qry_seq, ref_seq, gap_open_close, stripes, params);

  backtrace(qry_seq, ref_seq, &scores, &paths)
}

/// align nucleotide sequences via seed alignment and banded smith watermann without penalizing terminal gaps
pub fn align_nuc(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  seed_index: &CodonSpacedIndex,
  gap_open_close: &[i32],
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
    return Ok(align_pairwise(qry_seq, ref_seq, gap_open_close, params, &stripes));
  }

  // otherwise, determine seed matches roughly regularly spaced along the query sequence
  let SeedMatchesResult {
    qry_seq,
    seed_matches,
    is_reverse_complement,
  } = get_seed_matches_maybe_reverse_complement(qry_seq, ref_seq, seed_index, params)
    .wrap_err("When calculating seed matches")?;

  let mut terminal_bandwidth = params.terminal_bandwidth as isize;
  let mut excess_bandwidth = params.excess_bandwidth as isize;
  let mut minimal_bandwidth = max(1, params.allowed_mismatches as isize);
  let max_band_area = params.max_band_area;
  let mut attempt = 0;

  let (mut stripes, mut band_area) = create_alignment_band(
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
    return if length_ratio > 1.5 {
      make_error!(
        "Alignment band area ({band_area_fmt}) exceeds limit ({max_band_area_fmt}). \
        Query sequence length ({qry_len_fmt} nt) is significantly larger than reference ({ref_len_fmt} nt). \
        Possible reasons: concatenated sequences, assembly scaffolds, or wrong reference sequence. \
        The threshold can be adjusted using '--max-band-area' CLI flag or 'maxBandArea' in pathogen.json."
      )
    } else {
      make_error!(
        "Alignment band area ({band_area_fmt}) exceeds limit ({max_band_area_fmt}). \
        Sequence length ({qry_len_fmt} nt) is similar to reference ({ref_len_fmt} nt), but alignment requires excessive search space. \
        Possible reasons: large structural rearrangements, recombination, or wrong reference sequence. \
        The threshold can be adjusted using '--max-band-area' CLI flag or 'maxBandArea' in pathogen.json."
      )
    };
  }

  let mut alignment = align_pairwise(&qry_seq, ref_seq, gap_open_close, params, &stripes);

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
    (stripes, band_area) = create_alignment_band(
      &seed_matches,
      qry_len as isize,
      ref_len as isize,
      terminal_bandwidth,
      excess_bandwidth,
      minimal_bandwidth,
    );
    // discard stripes and break to return previous alignment
    if band_area > max_band_area {
      break;
    }
    // realign
    alignment = align_pairwise(&qry_seq, ref_seq, gap_open_close, params, &stripes);
  }
  // report success/failure of broadening of band width
  if alignment.hit_boundary {
    info!(
      "When processing sequence #{index} '{seq_name}': In nucleotide alignment: Attempted to relax band parameters {attempt} times, but still hitting the band boundary. Returning last attempt with score: {}",
      alignment.alignment_score
    );
    if band_area > max_band_area {
      info!(
        "When processing sequence #{index} '{seq_name}': final band area {band_area} exceeded the cutoff {max_band_area}"
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
  gap_open_close: &[i32],
  params: &AlignPairwiseParams,
  band_width: usize,
  mean_shift: i32,
) -> AlignmentOutput<Aa> {
  let stripes = simple_stripes(mean_shift, band_width, ref_seq.len(), qry_seq.len());

  align_pairwise(qry_seq, ref_seq, gap_open_close, params, &stripes)
}

#[cfg(test)]
mod tests {
  #![allow(clippy::needless_pass_by_value)]
  use std::fs;
  use std::path::PathBuf;

  // rstest fixtures are passed by value
  use super::*;
  use crate::align::gap_open::{GapScoreMap, get_gap_open_close_scores_codon_aware};
  use crate::align::params::GapAlignmentSide;
  use crate::alphabet::nuc::{from_nuc_seq, to_nuc_seq};
  use crate::gene::gene_map::GeneMap;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};

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

  #[fixture]
  fn more_realistic_ctx() -> Context {
    let params = AlignPairwiseParams {
      min_length: 3,
      min_match_length: 5,
      ..AlignPairwiseParams::default()
    };

    let gene_map = GeneMap::new();

    let ref_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"))
      .join("test_data")
      .join("reference.fasta");
    let ref_seq = to_nuc_seq(fs::read_to_string(ref_path).unwrap().trim()).unwrap();
    let gap_open_close = get_gap_open_close_scores_codon_aware(&ref_seq, &gene_map, &params);

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
  fn aligns_ambiguous_gap_placing_right(ctx: Context) -> Result<(), Report> {
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
  fn aligns_ambiguous_gap_placing_left(ctx: Context) -> Result<(), Report> {
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
  fn aligns_ambiguous_gap_placing_case_reversed(ctx: Context) -> Result<(), Report> {
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
  fn aligns_ambiguous_gap_placing_case_reversed_left(ctx: Context) -> Result<(), Report> {
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

  // Ambiguous gaps next to a CDS. The codon-aware gap cost applies only where a gap starts, so the tie-break can select a
  // gap that ends inside the CDS. See kb/issues/M-align-gap-end-cost-in-cds.md
  mod cds_boundary {
    use std::ops::Range;

    #[derive(Debug)]
    pub struct Case {
      /// Optimal alignment with the gap outside of the CDS. The input sequences are these strings without gaps
      pub ref_aln: &'static str,
      pub qry_aln: &'static str,
      pub gff: &'static str,
    }

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

    /// Query that starts near the CDS start (dengue C, GenBank KY586941): an unaligned 5' end and an internal deletion
    /// that ends inside the CDS have the same score
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
  #[ignore = "gap that ends inside a CDS has no cost: kb/issues/M-align-gap-end-cost-in-cds.md"]
  #[case::short_tie_left(             cds_boundary::SHORT_TIE,             GapAlignmentSide::Left  )]
  #[case::short_tie_right(            cds_boundary::SHORT_TIE,             GapAlignmentSide::Right )]
  #[ignore = "gap that ends inside a CDS has no cost: kb/issues/M-align-gap-end-cost-in-cds.md"]
  #[case::tandem_repeat_left(         cds_boundary::TANDEM_REPEAT,         GapAlignmentSide::Left  )]
  #[case::tandem_repeat_right(        cds_boundary::TANDEM_REPEAT,         GapAlignmentSide::Right )]
  #[ignore = "gap that ends inside a CDS has no cost: kb/issues/M-align-gap-end-cost-in-cds.md"]
  #[case::n_run_left(                 cds_boundary::N_RUN,                 GapAlignmentSide::Left  )]
  #[case::n_run_right(                cds_boundary::N_RUN,                 GapAlignmentSide::Right )]
  #[ignore = "gap that ends inside a CDS has no cost: kb/issues/M-align-gap-end-cost-in-cds.md"]
  #[case::unaligned_5_end_left(       cds_boundary::UNALIGNED_5_END,       GapAlignmentSide::Left  )]
  #[case::unaligned_5_end_right(      cds_boundary::UNALIGNED_5_END,       GapAlignmentSide::Right )]
  #[case::insertion_left(             cds_boundary::INSERTION,             GapAlignmentSide::Left  )]
  #[case::insertion_right(            cds_boundary::INSERTION,             GapAlignmentSide::Right )]
  #[case::reverse_strand_start_left(  cds_boundary::REVERSE_STRAND_START,  GapAlignmentSide::Left  )]
  #[case::reverse_strand_start_right( cds_boundary::REVERSE_STRAND_START,  GapAlignmentSide::Right )]
  #[ignore = "gap that ends inside a CDS has no cost: kb/issues/M-align-gap-end-cost-in-cds.md"]
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

    // Seed settings for short sequences, and gap penalties of the dengue dataset, with which `UNALIGNED_5_END` ties
    let params = AlignPairwiseParams {
      min_length: 3,
      min_match_length: 5,
      min_seed_cover: 0.01.into(),
      kmer_length: 6,
      kmer_distance: 3,
      penalty_gap_open: 8,
      penalty_gap_open_in_frame: 12,
      penalty_gap_open_out_of_frame: 14,
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
}
