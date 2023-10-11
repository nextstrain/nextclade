use crate::align::backtrace::{backtrace, AlignmentOutput};
use crate::align::band_2d::Stripe;
use crate::align::band_2d::{full_matrix, simple_stripes};
use crate::align::params::AlignPairwiseParams;
use crate::align::score_matrix::{score_matrix, ScoreMatrixResult};
use crate::align::seed_alignment::create_alignment_band;
use crate::align::seed_match2::{get_seed_matches_maybe_reverse_complement, CodonSpacedIndex, SeedMatchesResult};
use crate::alphabet::aa::Aa;
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::make_error;
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

  // if ref_len + qry_len < (10 * params.seed_length) {
  //   // for very short sequences, use full square
  //   let stripes = full_matrix(ref_len, qry_len);
  //   trace!("When processing sequence #{index} '{seq_name}': In nucleotide alignment: Band construction: short sequences, using full matrix");
  //   return Ok(align_pairwise(qry_seq, ref_seq, gap_open_close, params, &stripes));
  // }

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
    return make_error!("Alignment matrix size {band_area} exceeds maximum value {max_band_area}. The threshold can be adjusted using CLI flag '--max-band-area' or using 'maxBandArea' field in the dataset's pathogen.json");
  }

  let mut alignment = align_pairwise(&qry_seq, ref_seq, gap_open_close, params, &stripes);

  while alignment.hit_boundary && attempt < params.max_alignment_attempts {
    info!("When processing sequence #{index} '{seq_name}': In nucleotide alignment: Band boundary is hit on attempt {}. Retrying with relaxed parameters. Alignment score was: {}", attempt+1, alignment.alignment_score);
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
    info!("When processing sequence #{index} '{seq_name}': In nucleotide alignment: Attempted to relax band parameters {attempt} times, but still hitting the band boundary. Returning last attempt with score: {}", alignment.alignment_score);
    if band_area > max_band_area {
      info!(
        "When processing sequence #{index} '{seq_name}': final band area {band_area} exceeded the cutoff {max_band_area}"
      );
    }
  } else if attempt > 0 {
    info!("When processing sequence #{index} '{seq_name}': In nucleotide alignment: Succeeded without hitting band boundary on attempt {}. Alignment score was: {}", attempt+1, alignment.alignment_score);
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
  use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, GapScoreMap};
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

    let mut ref_path = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    ref_path.push("test_data");
    ref_path.push("reference.fasta");
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
}
