#![allow(non_snake_case)]
#![allow(clippy::separated_literal_suffix)]

use crate::align::score_matrix::{qryGAPextend, qryGAPmatrix, refGAPextend, refGAPmatrix, END_OF_SEQUENCE, MATCH};
use crate::io::nuc::Nuc;
use crate::utils::vec2d::Vec2d;
use std::cmp;

fn index_to_shift(si: i32, bandWidth: i32, meanShift: i32) -> i32 {
  si - bandWidth + meanShift
}

struct DetermineBestAlignmentResult {
  si: i32,
  qPos: i32,
  rPos: i32,
  best_score: usize,
}

/// Determine the best alignment by picking the optimal score at the end of the query
fn determine_best_alignment(
  scores: &Vec2d<i32>,
  band_width: i32,
  mean_shift: i32,
  qry_len: i32,
) -> DetermineBestAlignmentResult {
  let num_cols = scores.num_cols() as i32;
  let num_rows = scores.num_rows() as i32;

  let mut lastScoreByShift: Vec<i32> = vec![0; num_rows as usize];
  let mut lastIndexByShift: Vec<i32> = vec![0; num_rows as usize];

  let mut si: i32 = 0;
  let mut best_score = END_OF_SEQUENCE;
  for i in 0..num_rows {
    let is = index_to_shift(i, band_width, mean_shift);
    // Determine the last index
    lastIndexByShift[i as usize] = cmp::min(num_rows as i32 - 1, qry_len as i32 + is);

    if (lastIndexByShift[i as usize] >= 0) && (lastIndexByShift[i as usize] < num_cols as i32) {
      lastScoreByShift[i as usize] = scores[(i, lastIndexByShift[i as usize])];

      if lastScoreByShift[i as usize] > best_score {
        best_score = lastScoreByShift[i as usize];
        si = i;
      }
    }
  }

  // determine position tuple qPos, rPos corresponding to the place it the matrix
  let shift = index_to_shift(si, band_width, mean_shift);
  let rPos = lastIndexByShift[si as usize] - 1;
  let qPos = rPos - shift;
  DetermineBestAlignmentResult {
    si: si as i32,
    qPos,
    rPos,
    best_score: best_score as usize,
  }
}

pub struct NextalignResult {
  qry_seq: Vec<Nuc>,
  ref_seq: Vec<Nuc>,
  alignment_score: usize,
}

pub fn backtrace(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  scores: &Vec2d<i32>,
  paths: &Vec2d<i32>,
  meanShift: i32,
) -> NextalignResult {
  let num_cols = scores.num_cols();
  let num_rows = scores.num_rows();
  let qry_len = qry_seq.len() as i32;
  let ref_len = ref_seq.len() as i32;
  let bandWidth = ((num_rows - 1) / 2) as i32;

  let aln_capacity = num_cols + 3 * bandWidth as usize;
  let mut aln_ref = Vec::<Nuc>::with_capacity(aln_capacity);
  let mut aln_qry = Vec::<Nuc>::with_capacity(aln_capacity);

  let DetermineBestAlignmentResult {
    mut si,
    mut qPos,
    mut rPos,
    best_score,
  } = determine_best_alignment(scores, bandWidth, meanShift, qry_len);

  // Add right overhang, i.e. unaligned parts of the query or reference
  if rPos < ref_len - 1 {
    for i in (rPos..ref_len - 1).rev() {
      aln_qry.push(Nuc::GAP);
      aln_ref.push(ref_seq[i as usize]);
    }
  } else if qPos < qry_len - 1 {
    for i in (qPos..qry_len - 1).rev() {
      aln_qry.push(qry_seq[i as usize]);
      aln_ref.push(Nuc::GAP);
    }
  }

  let mut origin: i32 = 0;
  let mut currentMatrix = 0;

  // Do backtrace in the aligned region
  while rPos >= 0 && qPos >= 0 {
    origin = paths[(si, rPos + 1)];

    if (origin & MATCH) != 0 && (currentMatrix == 0) {
      // Match -- decrement both strands and add match to alignment
      aln_qry.push(qry_seq[qPos as usize]);
      aln_ref.push(ref_seq[rPos as usize]);
      qPos -= 1;
      rPos -= 1;
    } else if ((origin & refGAPmatrix) != 0 && currentMatrix == 0) || currentMatrix == refGAPmatrix {
      // Insertion in ref -- decrement query, increase shift
      aln_qry.push(qry_seq[qPos as usize]);
      aln_ref.push(Nuc::GAP);
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
      aln_qry.push(Nuc::GAP);
      aln_ref.push(ref_seq[rPos as usize]);
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
      aln_qry.push(Nuc::GAP);
      aln_ref.push(ref_seq[i as usize]);
    }
  } else if qPos >= 0 {
    for i in (0..qPos).rev() {
      aln_qry.push(qry_seq[i as usize]);
      aln_ref.push(Nuc::GAP);
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
