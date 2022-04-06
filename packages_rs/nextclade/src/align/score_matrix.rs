use crate::align::align::AlignPairwiseParams;
use crate::io::letter::Letter;
use crate::utils::vec2d::Vec2d;
use log::trace;

// store direction info for backtrace as bits in paths matrix
// these indicate the currently optimal move
pub const MATCH: i32 = 1 << 0;
pub const REF_GAP_MATRIX: i32 = 1 << 1;
pub const QRY_GAP_MATRIX: i32 = 1 << 2;
// these are the override flags for gap extension
pub const REF_GAP_EXTEND: i32 = 1 << 3;
pub const QRY_GAP_EXTEND: i32 = 1 << 4;
pub const END_OF_SEQUENCE: i32 = -1;

pub struct ScoreMatrixResult {
  pub scores: Vec2d<i32>,
  pub paths: Vec2d<i32>,
}

pub fn score_matrix<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  gap_open_close: &[i32],
  band_width: usize,
  mean_shift: i32,
  params: &AlignPairwiseParams,
) -> ScoreMatrixResult {
  let query_size = qry_seq.len();
  let ref_size = ref_seq.len();
  let n_rows = band_width * 2 + 1;
  let n_cols = ref_size + 1;

  trace!(
    "Score matrix: stared: query_size={query_size}, ref_size={ref_size}, \
  band_width={band_width}, mean_shift={mean_shift}, n_rows={n_rows}, n_cols={n_cols}"
  );

  let mut paths = Vec2d::<i32>::new(n_rows, n_cols);
  let mut scores = Vec2d::<i32>::new(n_rows, n_cols);
  let mut qry_gaps = vec![0_i32; n_rows];

  // fill scores with alignment scores
  // The inner index scores[][ri] is the index of the reference sequence
  // the outer index si index the shift, together they define rPos=ri and qPos = ri-shift
  // if the colon marks the position in the sequence before rPos,qPos
  // R: ...ACT:X
  // Q: ...ACT:Y
  // 1) if X and Y are bases they either match or mismatch. shift doesn't change, rPos and qPos advance
  //    -> right horizontal step in the matrix
  // 2) if X is '-' and Y is a base, rPos stays the same and the shift decreases
  //    -> vertical step in the matrix from si+1 to si
  // 2) if X is a base and Y is '-', rPos advances the same and the shift increases
  //    -> diagonal step in the matrix from (ri,si-1) to (ri+1,si)
  let no_align = -(params.score_match + params.penalty_mismatch) * ref_size as i32;

  for si in band_width + 1..=2 * band_width {
    paths[(si, 0)] = QRY_GAP_MATRIX;
  }

  paths[(band_width, 0)] = MATCH;
  qry_gaps[band_width] = -params.penalty_gap_open;
  for si in (0..band_width).rev() {
    paths[(si, 0)] = REF_GAP_MATRIX;
    qry_gaps[si] = -params.penalty_gap_open;
  }

  for ri in 0..ref_size as i32 {
    let mut q_pos: i32 = ri - (band_width as i32 + mean_shift);
    let mut ref_gaps = -gap_open_close[ri as usize];

    for si in (0..=(2 * band_width as i32)).rev() {
      let mut tmp_path = 0;
      let mut score: i32;
      let mut origin: i32;
      let q_gap_extend: i32;
      let r_gap_extend: i32;
      let r_gap_open: i32;
      let q_gap_open: i32;
      let tmp_match: i32;
      let mut tmp_score: i32;

      if q_pos < 0 {
        // precedes query sequence -- no score, origin is query gap
        // we could fill all of this at once
        score = 0;
        tmp_path += QRY_GAP_EXTEND;
        ref_gaps = -gap_open_close[ri as usize];
        origin = QRY_GAP_MATRIX;
      } else if q_pos < query_size as i32 {
        // if the shifted position is within the query sequence

        // no gap -- match case
        let matrix_score = T::lookup_match_score(qry_seq[q_pos as usize], ref_seq[ri as usize]);
        tmp_match = if matrix_score > 0 {
          params.score_match
        } else {
          -params.penalty_mismatch
        };
        score = scores[(si, ri)] + tmp_match;
        origin = MATCH;

        // check the scores of a reference gap
        if si < 2 * band_width as i32 {
          r_gap_extend = ref_gaps - params.penalty_gap_extend;
          r_gap_open = scores[(si + 1, ri + 1)] - gap_open_close[(ri + 1) as usize];
          if r_gap_extend > r_gap_open {
            tmp_score = r_gap_extend;
            tmp_path += REF_GAP_EXTEND;
          } else {
            tmp_score = r_gap_open;
          }
          ref_gaps = tmp_score;
          if score < tmp_score {
            score = tmp_score;
            origin = REF_GAP_MATRIX;
          }
        } else {
          ref_gaps = no_align;
        }

        // check the scores of a query gap
        if si > 0 {
          q_gap_extend = qry_gaps[(si - 1) as usize] - params.penalty_gap_extend;
          q_gap_open = scores[(si - 1, ri)] - gap_open_close[ri as usize];
          if q_gap_extend > q_gap_open {
            tmp_score = q_gap_extend;
            tmp_path += QRY_GAP_EXTEND;
          } else {
            tmp_score = q_gap_open;
          }
          qry_gaps[si as usize] = tmp_score;
          if score < tmp_score {
            score = tmp_score;
            origin = QRY_GAP_MATRIX;
          }
        } else {
          qry_gaps[si as usize] = no_align;
        }
      } else {
        // past query sequence -- mark as sequence end
        score = END_OF_SEQUENCE;
        origin = END_OF_SEQUENCE;
      }
      tmp_path += origin;
      paths[(si, ri + 1)] = tmp_path;
      scores[(si, ri + 1)] = score;
      q_pos += 1;
    }
  }

  ScoreMatrixResult { scores, paths }
}

#[cfg(test)]
mod tests {
  #![allow(clippy::needless_pass_by_value)] // rstest fixtures are passed by value
  use super::*;
  use crate::align::gap_open::{get_gap_open_close_scores_codon_aware, GapScoreMap};
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
  fn pads_missing_left(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let qry_seq = to_nuc_seq("CTCGCT")?;
    let ref_seq = to_nuc_seq("ACGCTCGCT")?;

    let band_width = 5;
    let mean_shift = 2;

    let result = score_matrix(
      &qry_seq,
      &ref_seq,
      &ctx.gap_open_close,
      band_width,
      mean_shift,
      &ctx.params,
    );

    #[rustfmt::skip]
    let expected_scores = Vec2d::<i32>::from_slice(&[
      0,  -1,   2,   1,  -1,  -1,  -1,  -1,  -1,  -1,
      0,  -1,  -2,  -1,   2,  -1,  -1,  -1,  -1,  -1,
      0,  -1,   2,   5,   8,  11,  -1,  -1,  -1,  -1,
      0,  -1,  -2,  -3,  -1,   2,   5,  -1,  -1,  -1,
      0,   0,   3,   2,   5,   4,   7,   6,  -1,  -1,
      0,   0,   0,  -1,  -2,   0,   3,   6,   9,  -1,
      0,   0,   0,   0,   3,   6,   9,  12,  15,  18,
      0,   0,   0,   0,   0,  -1,   0,   3,   6,   9,
      0,   0,   0,   0,   0,   0,   3,   2,   5,   6,
      0,   0,   0,   0,   0,   0,   0,  -1,   0,   3,
      0,   0,   0,   0,   0,   0,   0,   0,   3,   6,
    ], 11, 10);

    #[rustfmt::skip]
    let expected_paths = Vec2d::<i32>::from_slice(&[
      2,   9,   9,   9,  -1,  -1,  -1,  -1,  -1,  -1,
      2,   9,   9,   2,   2,  -1,  -1,  -1,  -1,  -1,
      2,   9,  25,  25,  25,   9,  -1,  -1,  -1,  -1,
      2,   1,  17,   1,   2,  12,  12,  -1,  -1,  -1,
      2,  20,  17,  25,  25,  25,  25,  25,  -1,  -1,
      1,  20,  20,   1,   1,   2,  18,  18,  18,  -1,
      4,  20,  20,  20,  17,  25,  25,  17,  17,  17,
      4,  20,  20,  20,  20,   1,   4,   4,   4,   4,
      4,  20,  20,  20,  20,  20,  17,  25,  25,  28,
      4,  20,  20,  20,  20,  20,  20,   1,  20,  20,
      4,  20,  20,  20,  20,  20,  20,  20,  17,  17,
    ], 11, 10);

    assert_eq!(expected_scores, result.scores);
    assert_eq!(expected_paths, result.paths);
    Ok(())
  }
}
