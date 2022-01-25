#![allow(non_snake_case)]

use crate::align::backtrace::{backtrace, NextalignResult};
use crate::align::score_matrix::{score_matrix, ScoreMatrixResult};
use crate::align::seed_alignment::{seedAlignment, SeedAlignmentResult};
use crate::error;
use crate::io::nuc::Nuc;
use eyre::Report;
use log::trace;

#[derive(Debug)]
pub struct AlignPairwiseParams {
  pub penaltyGapExtend: i32,
  pub penaltyGapOpen: i32,
  pub penaltyGapOpenInFrame: i32,
  pub penaltyGapOpenOutOfFrame: i32,
  pub penaltyMismatch: i32,
  pub scoreMatch: i32,
  pub maxIndel: usize,
  pub min_length: usize,
  pub seedLength: usize,
  pub seedSpacing: i32,
  pub minSeeds: i32,
  pub mismatchesAllowed: usize,
  pub translatePastStop: bool,
}

fn alignPairwise(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  gapOpenClose: &[i32],
  params: &AlignPairwiseParams,
  bandWidth: usize,
  shift: i32,
) -> Result<NextalignResult, Report> {
  trace!("Align pairwise: started. Params: {params:?}");

  let max_indel = params.maxIndel;
  if bandWidth > max_indel {
    trace!("Align pairwise: failed. band_width={bandWidth}, max_indel={max_indel}");
    return error!("Unable to align: too many insertions, deletions, duplications, or ambiguous seed matches");
  }

  let ScoreMatrixResult { scores, paths } = score_matrix(qry_seq, ref_seq, gapOpenClose, bandWidth, shift, params);

  Ok(backtrace(qry_seq, ref_seq, &scores, &paths, shift))
}

pub fn align_nuc(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  gapOpenClose: &[i32],
  params: &AlignPairwiseParams,
) -> Result<NextalignResult, Report> {
  let qry_len: usize = qry_seq.len();
  let min_len: usize = params.min_length;
  if qry_len < min_len {
    return error!(
      "Unable to align: sequence is too short. Details: sequence length: {qry_len}, min length allowed: {min_len}"
    );
  }

  let SeedAlignmentResult { meanShift, bandWidth } = seedAlignment(qry_seq, ref_seq, params)?;
  trace!(
    "Align pairwise: after seed alignment: bandWidth={:}, meanShift={:}\n",
    bandWidth,
    meanShift
  );

  alignPairwise(qry_seq, ref_seq, gapOpenClose, params, bandWidth, meanShift)
}
