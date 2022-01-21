#![allow(non_snake_case)]
#![allow(clippy::separated_literal_suffix)]

use crate::align::score_matrix::{qryGAPextend, qryGAPmatrix, refGAPextend, refGAPmatrix, END_OF_SEQUENCE, MATCH};
use crate::utils::vec2d::Vec2d;
use std::cmp;

const GAP: u8 = b'-';

fn index_to_shift(si: usize, bandWidth: usize, meanShift: i32) -> i32 {
  si as i32 - bandWidth as i32 + meanShift as i32
}

struct DetermineBestAlignmentResult {
  si: usize,
  qPos: usize,
  rPos: usize,
  best_score: usize,
}

/// Determine the best alignment by picking the optimal score at the end of the query
fn determine_best_alignment(
  scores: &Vec2d<i32>,
  band_width: usize,
  mean_shift: i32,
  qry_len: usize,
) -> DetermineBestAlignmentResult {
  let num_cols = scores.num_cols();
  let num_rows = scores.num_rows();

  let mut lastScoreByShift: Vec<i32> = vec![0; num_rows];
  let mut lastIndexByShift: Vec<i32> = vec![0; num_rows];

  let mut si = 0_usize;
  let mut best_score = END_OF_SEQUENCE;
  for i in 0..num_rows {
    let is = index_to_shift(i, band_width, mean_shift);
    // Determine the last index
    lastIndexByShift[i] = cmp::min(num_rows as i32 - 1, qry_len as i32 + is);

    if (lastIndexByShift[i] >= 0) && (lastIndexByShift[i] < num_cols as i32) {
      lastScoreByShift[i] = scores[(i, lastIndexByShift[i] as usize)];

      if lastScoreByShift[i] > best_score {
        best_score = lastScoreByShift[i];
        si = i;
      }
    }
  }

  // determine position tuple qPos, rPos corresponding to the place it the matrix
  let shift = index_to_shift(si, band_width, mean_shift);
  let rPos = (lastIndexByShift[si] - 1) as usize;
  let qPos = rPos - shift as usize;
  DetermineBestAlignmentResult {
    si,
    qPos,
    rPos,
    best_score: best_score as usize,
  }
}

pub struct NextalignResult {
  qry_seq: Vec<u8>,
  ref_seq: Vec<u8>,
  alignment_score: usize,
}

pub fn backtrace(
  qry_seq: &[u8],
  ref_seq: &[u8],
  scores: &Vec2d<i32>,
  paths: &Vec2d<i32>,
  meanShift: i32,
) -> NextalignResult {
  let num_cols = scores.num_cols();
  let num_rows = scores.num_rows();
  let qry_len = qry_seq.len();
  let ref_len = ref_seq.len();
  let bandWidth = (num_rows - 1) / 2;

  let aln_capacity = num_cols + 3 * bandWidth;
  let mut aln_ref = Vec::<u8>::with_capacity(aln_capacity);
  let mut aln_qry = Vec::<u8>::with_capacity(aln_capacity);

  let DetermineBestAlignmentResult {
    mut si,
    mut qPos,
    mut rPos,
    best_score,
  } = determine_best_alignment(scores, bandWidth, meanShift, qry_len);

  // Add right overhang, i.e. unaligned parts of the query or reference
  if rPos < ref_len - 1 {
    for i in (rPos..ref_len - 1).rev() {
      aln_qry.push(GAP);
      aln_ref.push(ref_seq[i]);
    }
  } else if qPos < qry_len - 1 {
    for i in (qPos..qry_len - 1).rev() {
      aln_qry.push(qry_seq[i]);
      aln_ref.push(GAP);
    }
  }

  let mut origin: i32 = 0;
  let mut currentMatrix = 0;

  // Do backtrace in the aligned region
  while rPos >= 0 && qPos >= 0 {
    origin = paths[(si, rPos + 1)];

    if (origin & MATCH) != 0 && (currentMatrix == 0) {
      // Match -- decrement both strands and add match to alignment
      aln_qry.push(qry_seq[qPos]);
      aln_ref.push(ref_seq[rPos]);
      qPos -= 1;
      rPos -= 1;
    } else if ((origin & refGAPmatrix) != 0 && currentMatrix == 0) || currentMatrix == refGAPmatrix {
      // Insertion in ref -- decrement query, increase shift
      aln_qry.push(qry_seq[qPos]);
      aln_ref.push(GAP);
      qPos -= 1;
      si += 1;
      currentMatrix = if (origin & refGAPextend) != 0 {
        // Remain in gap-extension mode and ignore best-overall score
        refGAPmatrix
      } else {
        // Close gap, return to best-overall score
        0
      }
    } else if ((origin & qryGAPmatrix) != 0 && currentMatrix == 0) || currentMatrix == qryGAPmatrix {
      // Deletion in query -- decrement reference, reduce shift
      aln_qry.push(GAP);
      aln_ref.push(ref_seq[rPos]);
      rPos -= 1;
      si -= 1;
      currentMatrix = if (origin & qryGAPextend) != 0 {
        // Remain in gap-extension mode and ignore best-overall score
        qryGAPmatrix
      } else {
        // Close gap, return to best-overall score
        0
      }
    } else {
      break;
    }
  }

  // Add left overhang, i.e. unaligned parts of the query or reference
  if rPos >= 0 {
    for i in (0..rPos).rev() {
      aln_qry.push(GAP);
      aln_ref.push(ref_seq[i]);
    }
  } else if qPos >= 0 {
    for i in (0..qPos).rev() {
      aln_qry.push(qry_seq[i]);
      aln_ref.push(GAP);
    }
  }

  aln_qry.reverse();
  aln_ref.reverse();

  NextalignResult {
    qry_seq: aln_qry,
    ref_seq: aln_ref,
    alignment_score: best_score,
  }
}
