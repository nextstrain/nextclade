use crate::align::band_2d::Band2d;
use crate::align::score_matrix::{
  END_OF_SEQUENCE, MATCH, QRY_GAP_EXTEND, QRY_GAP_MATRIX, REF_GAP_EXTEND, REF_GAP_MATRIX,
};
use crate::io::letter::Letter;
use crate::utils::vec2d::Vec2d;
use serde::{Deserialize, Serialize};
use std::cmp;

const fn index_to_shift(si: i32, band_width: i32, mean_shift: i32) -> i32 {
  si - band_width + mean_shift
}

struct DetermineBestAlignmentResult {
  si: i32,
  q_pos: i32,
  r_pos: i32,
  best_score: usize,
}

/// Determine the best alignment by picking the optimal score at the end of the query
fn determine_best_alignment(
  scores: &Band2d<i32>,
  band_width: i32,
  mean_shift: i32,
  qry_len: i32,
) -> DetermineBestAlignmentResult {
  let num_cols = scores.num_cols() as i32;
  let num_rows = scores.num_rows() as i32;

  let mut last_score_by_shift: Vec<i32> = vec![0; num_rows as usize];
  let mut last_index_by_shift: Vec<i32> = vec![0; num_rows as usize];

  let mut si: i32 = 0;
  let mut best_score = END_OF_SEQUENCE;
  for i in 0..num_rows {
    let is = index_to_shift(i, band_width, mean_shift);
    // Determine the last index
    last_index_by_shift[i as usize] = cmp::min(num_cols - 1, qry_len + is);

    if (last_index_by_shift[i as usize] >= 0) && (last_index_by_shift[i as usize] < num_cols) {
      last_score_by_shift[i as usize] = scores[(i, last_index_by_shift[i as usize])];

      if last_score_by_shift[i as usize] > best_score {
        best_score = last_score_by_shift[i as usize];
        si = i;
      }
    }
  }

  // determine position tuple q_pos, r_pos corresponding to the place it the matrix
  let shift = index_to_shift(si, band_width, mean_shift);
  let r_pos = last_index_by_shift[si as usize] - 1;
  let q_pos = r_pos - shift;
  DetermineBestAlignmentResult {
    si,
    q_pos,
    r_pos,
    best_score: best_score as usize,
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
pub struct AlignmentOutput<T> {
  pub qry_seq: Vec<T>,
  pub ref_seq: Vec<T>,
  pub alignment_score: usize,
}

pub fn backtrace<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  scores: &Band2d<i32>,
  paths: &Band2d<i32>,
  mean_shift: i32,
) -> AlignmentOutput<T> {
  let num_cols = scores.num_cols();
  let num_rows = scores.num_rows();
  let qry_len = qry_seq.len() as i32;
  let ref_len = ref_seq.len() as i32;
  let band_width = ((num_rows - 1) / 2) as i32;

  let aln_capacity = num_cols + 3 * band_width as usize;
  let mut aln_ref = Vec::<T>::with_capacity(aln_capacity);
  let mut aln_qry = Vec::<T>::with_capacity(aln_capacity);

  let DetermineBestAlignmentResult {
    mut si,
    mut q_pos,
    mut r_pos,
    best_score,
  } = determine_best_alignment(scores, band_width, mean_shift, qry_len);

  // Add right overhang, i.e. unaligned parts of the query or reference
  if r_pos < ref_len - 1 {
    for i in (r_pos + 1..ref_len).rev() {
      aln_qry.push(T::GAP);
      aln_ref.push(ref_seq[i as usize]);
    }
  } else if q_pos < qry_len - 1 {
    for i in (q_pos + 1..qry_len).rev() {
      aln_qry.push(qry_seq[i as usize]);
      aln_ref.push(T::GAP);
    }
  }

  let mut origin: i32;
  let mut current_matrix = 0;

  // Do backtrace in the aligned region
  while r_pos >= 0 && q_pos >= 0 {
    origin = paths[(si, r_pos + 1)];

    if (origin & MATCH) != 0 && (current_matrix == 0) {
      // Match -- decrement both strands and add match to alignment
      aln_qry.push(qry_seq[q_pos as usize]);
      aln_ref.push(ref_seq[r_pos as usize]);
      q_pos -= 1;
      r_pos -= 1;
    } else if ((origin & REF_GAP_MATRIX) != 0 && current_matrix == 0) || current_matrix == REF_GAP_MATRIX {
      // Insertion in ref -- decrement query, increase shift
      aln_qry.push(qry_seq[q_pos as usize]);
      aln_ref.push(T::GAP);
      q_pos -= 1;
      si += 1;
      current_matrix = if (origin & REF_GAP_EXTEND) != 0 {
        // Remain in gap-extension mode and ignore best-overall score
        REF_GAP_MATRIX
      } else {
        // Close gap, return to best-overall score
        0
      }
    } else if ((origin & QRY_GAP_MATRIX) != 0 && current_matrix == 0) || current_matrix == QRY_GAP_MATRIX {
      // Deletion in query -- decrement reference, reduce shift
      aln_qry.push(T::GAP);
      aln_ref.push(ref_seq[r_pos as usize]);
      r_pos -= 1;
      si -= 1;
      current_matrix = if (origin & QRY_GAP_EXTEND) != 0 {
        // Remain in gap-extension mode and ignore best-overall score
        QRY_GAP_MATRIX
      } else {
        // Close gap, return to best-overall score
        0
      }
    } else {
      break;
    }
  }

  // Add left overhang, i.e. unaligned parts of the query or reference
  if r_pos >= 0 {
    for i in (0..=r_pos).rev() {
      aln_qry.push(T::GAP);
      aln_ref.push(ref_seq[i as usize]);
    }
  } else if q_pos >= 0 {
    for i in (0..=q_pos).rev() {
      aln_qry.push(qry_seq[i as usize]);
      aln_ref.push(T::GAP);
    }
  }

  aln_qry.reverse();
  aln_ref.reverse();

  AlignmentOutput {
    qry_seq: aln_qry,
    ref_seq: aln_ref,
    alignment_score: best_score,
  }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::needless_pass_by_value)] // rstest fixtures are passed by value
  use super::*;
  use crate::align::align::AlignPairwiseParams;
  use crate::align::band_2d::simple_stripes;
  use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, GapScoreMap};
  use crate::align::score_matrix;
  use crate::gene::gene_map::GeneMap;
  use crate::io::nuc::{to_nuc_seq, Nuc};
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};

  struct Context {
    params: AlignPairwiseParams,
    gene_map: GeneMap,
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

    Context {
      params,
      gene_map,
      gap_open_close,
    }
  }

  #[rstest]
  fn test_backtrace(ctx: Context) -> Result<(), Report> {
    let qry_seq = to_nuc_seq("CTCGCT")?;
    let ref_seq = to_nuc_seq("ACGCTCGCT")?;

    let band_width = 5;
    let mean_shift = 2;

    let stripes = simple_stripes(mean_shift, band_width, ref_seq.len(), qry_seq.len());

    let mut scores = Band2d::<i32>::new(&stripes);
    scores.data = vec![
      0, 0, 0, 0, 0, -1, -1, -1, -1, 0, 3, -2, 2, -2, 2, 0, -1, 2, -3, 5, -1, 1, 0, 3, -2, 5, -1, 8, 2, 0, -1, 6, 0, 4,
      2, 11, 0, 3, 0, 9, 3, 7, 5, 0, -1, 2, 3, 12, 6, 6, 3, 0, 5, 6, 15, 9, 6, 3, 6, 9, 18,
    ];

    let mut paths = Band2d::<i32>::new(&stripes);
    paths.data = vec![
      0, 10, 10, 10, 20, 1, 9, 9, 9, 20, 17, 17, 25, 9, 9, 20, 1, 25, 1, 25, 2, 9, 20, 17, 1, 25, 2, 25, 2, 20, 1, 25,
      2, 25, 12, 9, 20, 17, 4, 25, 18, 25, 12, 20, 1, 25, 4, 17, 18, 25, 17, 20, 25, 4, 17, 18, 17, 20, 28, 4, 17,
    ];

    let expected_output = AlignmentOutput {
      qry_seq: to_nuc_seq("---CTCGCT")?,
      ref_seq: to_nuc_seq("ACGCTCGCT")?,
      alignment_score: 18,
    };

    let output = backtrace(&qry_seq, &ref_seq, &scores, &paths, mean_shift);

    assert_eq!(expected_output, output);
    // assert_eq!(expected_paths, result.paths);

    Ok(())
  }
}
