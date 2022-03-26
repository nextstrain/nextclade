use crate::align::backtrace::{backtrace, AlignmentOutput};
use crate::align::score_matrix::{score_matrix, ScoreMatrixResult};
use crate::align::seed_alignment::{seed_alignment, SeedAlignmentResult};
use crate::io::aa::Aa;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::make_error;
use eyre::Report;
use log::trace;

#[derive(Debug)]
pub struct AlignPairwiseParams {
  pub penalty_gap_extend: i32,
  pub penalty_gap_open: i32,
  pub penalty_gap_open_in_frame: i32,
  pub penalty_gap_open_out_of_frame: i32,
  pub penalty_mismatch: i32,
  pub score_match: i32,
  pub max_indel: usize,
  pub min_length: usize,
  pub seed_length: usize,
  pub seed_spacing: i32,
  pub min_seeds: i32,
  pub mismatches_allowed: usize,
  pub translate_past_stop: bool,
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
      translate_past_stop: true,
    }
  }
}

fn align_pairwise<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  gap_open_close: &[i32],
  params: &AlignPairwiseParams,
  band_width: usize,
  shift: i32,
) -> Result<AlignmentOutput<T>, Report> {
  trace!("Align pairwise: started. Params: {params:?}");

  let max_indel = params.max_indel;
  if band_width > max_indel {
    trace!("Align pairwise: failed. band_width={band_width}, max_indel={max_indel}");
    return make_error!("Unable to align: too many insertions, deletions, duplications, or ambiguous seed matches");
  }

  let ScoreMatrixResult { scores, paths } = score_matrix(qry_seq, ref_seq, gap_open_close, band_width, shift, params);

  Ok(backtrace(qry_seq, ref_seq, &scores, &paths, shift))
}

pub fn align_nuc(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  gap_open_close: &[i32],
  params: &AlignPairwiseParams,
) -> Result<AlignmentOutput<Nuc>, Report> {
  let qry_len: usize = qry_seq.len();
  let min_len: usize = params.min_length;
  if qry_len < min_len {
    return make_error!(
      "Unable to align: sequence is too short. Details: sequence length: {qry_len}, min length allowed: {min_len}"
    );
  }

  let SeedAlignmentResult { mean_shift, band_width } = seed_alignment(qry_seq, ref_seq, params)?;
  trace!(
    "Align pairwise: after seed alignment: band_width={:}, mean_shift={:}\n",
    band_width,
    mean_shift
  );

  align_pairwise(qry_seq, ref_seq, gap_open_close, params, band_width, mean_shift)
}

pub fn align_aa(
  qry_seq: &[Aa],
  ref_seq: &[Aa],
  gap_open_close: &[i32],
  params: &AlignPairwiseParams,
  band_width: usize,
  mean_shift: i32,
) -> Result<AlignmentOutput<Aa>, Report> {
  align_pairwise(qry_seq, ref_seq, gap_open_close, params, band_width, mean_shift)
}

#[cfg(test)]
mod tests {
  #![allow(clippy::needless_pass_by_value)] // rstest fixtures are passed by value
  use super::*;
  use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, GapScoreMap};
  use crate::gene::gene_map::GeneMap;
  use crate::io::nuc::{from_nuc_seq, to_nuc_seq};
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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_seq), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_ambiguous_gap_placing(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("ACATCTTC"   )?;
    let ref_seq = to_nuc_seq("ACATATACTTC")?;
    let qry_aln = to_nuc_seq("ACAT---CTTC")?;

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

    assert_eq!(from_nuc_seq(&ref_seq), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }

  #[rstest]
  fn aligns_ambiguous_gap_placing_case_reversed(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("ACATATACTTG")?;
    let ref_seq = to_nuc_seq("ACATCTTG")?;
    let ref_aln = to_nuc_seq("ACAT---CTTG")?;

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

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

    let result = align_nuc(&qry_seq, &ref_seq, &ctx.gap_open_close, &ctx.params)?;

    assert_eq!(from_nuc_seq(&ref_aln), from_nuc_seq(&result.ref_seq));
    assert_eq!(from_nuc_seq(&qry_aln), from_nuc_seq(&result.qry_seq));
    Ok(())
  }
}
