use crate::align::band_2d::{Band2d, Stripe};
use crate::align::score_matrix::{BOUNDARY, MATCH, QRY_GAP_EXTEND, QRY_GAP_MATRIX, REF_GAP_EXTEND, REF_GAP_MATRIX};
use crate::alphabet::letter::Letter;
use crate::utils::vec2d::Vec2d;
use log::warn;
use serde::{Deserialize, Serialize};
use std::cmp;

const fn index_to_shift(si: i32, band_width: i32, mean_shift: i32) -> i32 {
  si - band_width + mean_shift
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, PartialEq, Eq)]
pub struct AlignmentOutput<T> {
  pub qry_seq: Vec<T>,
  pub ref_seq: Vec<T>,
  pub alignment_score: i32,
  pub is_reverse_complement: bool,
  pub hit_boundary: bool,
}

pub fn backtrace<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  scores: &Band2d<i32>,
  paths: &Band2d<i8>,
) -> AlignmentOutput<T> {
  let num_cols = scores.num_cols();
  let num_rows = scores.num_rows();
  let qry_len = qry_seq.len() as i32;
  let ref_len = ref_seq.len() as i32;

  // max length of the alignment is the sum of query and reference length
  let aln_capacity = scores.num_cols() + scores.num_rows();
  let mut aln_ref = Vec::<T>::with_capacity(aln_capacity);
  let mut aln_qry = Vec::<T>::with_capacity(aln_capacity);

  // Add right overhang, i.e. unaligned parts of the query or reference
  let mut r_pos = num_rows - 1;
  let mut q_pos = num_cols - 1;

  let mut origin: i8;
  let mut current_matrix = 0;
  let mut hit_boundary = false;
  // Do backtrace in the aligned region
  while r_pos > 0 || q_pos > 0 {
    origin = paths[(r_pos, q_pos)];
    if (origin & BOUNDARY) > 0 {
      hit_boundary = true;
    }

    if (origin & MATCH) != 0 && (current_matrix == 0) {
      // Match -- decrement both strands and add match to alignment
      q_pos -= 1;
      r_pos -= 1;
      aln_qry.push(qry_seq[q_pos]);
      aln_ref.push(ref_seq[r_pos]);
    } else if ((origin & REF_GAP_MATRIX) != 0 && current_matrix == 0) || current_matrix == REF_GAP_MATRIX {
      // Insertion in ref -- decrement query, increase shift
      q_pos -= 1;
      aln_qry.push(qry_seq[q_pos]);
      aln_ref.push(T::GAP);
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
      r_pos -= 1;
      aln_ref.push(ref_seq[r_pos]);
      current_matrix = if (origin & QRY_GAP_EXTEND) != 0 {
        // Remain in gap-extension mode and ignore best-overall score
        QRY_GAP_MATRIX
      } else {
        // Close gap, return to best-overall score
        0
      }
    } else {
      // This should never be reached
      // origin = 0 and current_matrix = 0
      // Why would this ever happen?
      // Mistake in score_matrix?
      // TODO: This actually does seem to be reachable, at least when band is width 0, i.e. a line
      unreachable!("Problem in backtrace: origin = 0 and current_matrix = 0 before (0,0) reached. Please share the sequence with the developers.\nr_pos = {}, q_pos = {}, origin = {}, current_matrix = {}", r_pos, q_pos, origin, current_matrix);
    }
  }

  aln_qry.reverse();
  aln_ref.reverse();

  AlignmentOutput {
    qry_seq: aln_qry,
    ref_seq: aln_ref,
    alignment_score: scores[(num_rows - 1, num_cols - 1)],
    is_reverse_complement: false,
    hit_boundary,
  }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::needless_pass_by_value)] // rstest fixtures are passed by value
  use super::*;
  use crate::align::band_2d::simple_stripes;
  use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, GapScoreMap};
  use crate::align::params::AlignPairwiseParams;
  use crate::align::score_matrix;
  use crate::alphabet::nuc::{to_nuc_seq, Nuc};
  use crate::gene::gene_map::GeneMap;
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

    let scores = Band2d::<i32>::with_data(
      &stripes,
      &[
        0, 0, 0, 0, 0, -1, -1, -1, -1, 0, 3, -2, 2, -2, 2, 0, -1, 2, -3, 5, -1, 1, 0, 3, -2, 5, -1, 8, 2, 0, -1, 6, 0,
        4, 2, 11, 0, 3, 0, 9, 3, 7, 11, 0, -1, 2, 3, 12, 6, 11, 3, 0, 5, 6, 15, 11, 6, 6, 6, 9, 18,
      ],
    );

    let paths = Band2d::<i8>::with_data(
      &stripes,
      &[
        0, 10, 10, 10, 20, 1, 9, 9, 9, 20, 17, 17, 25, 9, 9, 20, 1, 25, 1, 25, 2, 9, 20, 17, 1, 25, 2, 25, 2, 20, 17,
        25, 2, 25, 12, 9, 20, 17, 4, 25, 18, 25, 12, 20, 17, 25, 4, 17, 18, 28, 17, 20, 25, 4, 17, 20, 17, 18, 26, 12,
        17,
      ],
    );

    let expected_output = AlignmentOutput {
      qry_seq: to_nuc_seq("---CTCGCT")?,
      ref_seq: to_nuc_seq("ACGCTCGCT")?,
      alignment_score: 18,
      is_reverse_complement: false,
      hit_boundary: false,
    };

    let output = backtrace(&qry_seq, &ref_seq, &scores, &paths);

    assert_eq!(expected_output, output);
    // assert_eq!(expected_paths, result.paths);

    Ok(())
  }
}
