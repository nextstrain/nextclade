use crate::align::align::AlignPairwiseParams;
use crate::align::band_2d::{Band2d, Stripe};
use crate::io::letter::Letter;
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
  pub scores: Band2d<i32>,
  pub paths: Band2d<i32>,
}

pub fn score_matrix<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  gap_open_close: &[i32],
  band_width: usize,
  mean_shift: i32,
  stripes: &[Stripe],
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

  let mut paths = Band2d::<i32>::new(stripes);
  let mut scores = Band2d::<i32>::new(stripes);
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

  const NO_ALIGN: i32 = -1000;

  paths[(0, 0)] = 0;
  scores[(0, 0)] = 0;

  // Initialize first row
  for qpos in (stripes[0].begin + 1..stripes[0].end).rev() {
    paths[(0, qpos)] = REF_GAP_EXTEND + REF_GAP_MATRIX;
    scores[(0, qpos)] = 0;
  }

  // Iterate over rows
  for ri in 1..ref_size + 1 {
    let mut ref_gaps = -gap_open_close[ri];

    for qpos in stripes[ri].begin..stripes[ri].end {
      let mut tmp_path = 0;
      let mut score: i32;
      let mut origin: i32;
      let q_gap_extend: i32;
      let r_gap_extend: i32;
      let r_gap_open: i32;
      let q_gap_open: i32;
      let tmp_match: i32;
      let mut tmp_score: i32;

      if qpos == 0 {
        // Initialize first column
        // precedes query sequence -- no score, origin is query gap
        score = 0;
        tmp_path += QRY_GAP_EXTEND;
        ref_gaps = -gap_open_close[ri]; //ref_gaps stands for ref_gap_score
        origin = QRY_GAP_MATRIX;
      } else if qpos < query_size {
        // if the position is within the query sequence
        // no gap -- match case
        // TODO: Handle case where strip ends shift more than one
        if T::lookup_match_score(qry_seq[qpos - 1], ref_seq[ri - 1]) > 0 {
          score = scores[(ri - 1, qpos - 1)] + params.score_match;
        } else {
          score = scores[(ri - 1, qpos - 1)] - params.penalty_mismatch;
        };
        origin = MATCH;

        // check the scores of a reference gap
        // if qpos == stripes.begin: ref gap not allowed
        // thus path skipped
        if qpos > stripes[ri].begin {
          r_gap_extend = ref_gaps - params.penalty_gap_extend;
          r_gap_open = scores[(ri, qpos - 1)] - gap_open_close[ri];
          if r_gap_extend > r_gap_open {
            // extension better than opening
            tmp_score = r_gap_extend;
            tmp_path += REF_GAP_EXTEND;
          } else {
            // opening better than extension
            tmp_score = r_gap_open;
          }
          // could factor out tmp_score, replacing with ref_gaps but maybe less readable
          ref_gaps = tmp_score;
          if score < tmp_score {
            score = tmp_score;
            origin = REF_GAP_MATRIX;
          }
        } else {
          ref_gaps = NO_ALIGN;
        }

        // check the scores of a query gap
        if qpos < stripes[ri - 1].end {
          q_gap_extend = qry_gaps[qpos] - params.penalty_gap_extend;
          q_gap_open = scores[(ri - 1, qpos)] - gap_open_close[ri - 1];
          if q_gap_extend > q_gap_open {
            tmp_score = q_gap_extend;
            tmp_path += QRY_GAP_EXTEND;
          } else {
            tmp_score = q_gap_open;
          }
          qry_gaps[qpos] = tmp_score;
          if score < tmp_score {
            score = tmp_score;
            origin = QRY_GAP_MATRIX;
          }
        } else {
          qry_gaps[qpos] = NO_ALIGN;
        }
      } else {
        // past query sequence -- mark as sequence end
        score = scores[(ri - 1, qpos)];
        origin = QRY_GAP_EXTEND;
      }
      tmp_path += origin;
      paths[(ri, qpos)] = tmp_path;
      scores[(ri, qpos)] = score;
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
    let qry_seq = to_nuc_seq("GAT")?;
    let ref_seq = to_nuc_seq("GCGAT")?;

    let band_width = 5;
    let mean_shift = 2;
    // Test for large dense matrix
    let stripes = vec![Stripe { begin: 0, end: 4 }; 6];

    let result = score_matrix(
      &qry_seq,
      &ref_seq,
      &ctx.gap_open_close,
      band_width,
      mean_shift,
      &stripes,
      &ctx.params,
    );

    let mut expected_scores = Band2d::<i32>::new(&stripes);
    expected_scores[(0, 1)] = 1;
    expected_scores[(0, 2)] = 2;

    // #[rustfmt::skip]
    //     let expected_scores = Band2d::<i32>::from_slice(&[
    //       0,  -1,   2,   1,  -1,  -1,  -1,  -1,  -1,  -1,
    //       0,  -1,  -2,  -1,   2,  -1,  -1,  -1,  -1,  -1,
    //       0,  -1,   2,   5,   8,  11,  -1,  -1,  -1,  -1,
    //       0,  -1,  -2,  -3,  -1,   2,   5,  -1,  -1,  -1,
    //       0,   0,   3,   2,   5,   4,   7,   6,  -1,  -1,
    //       0,   0,   0,  -1,  -2,   0,   3,   6,   9,  -1,
    //       0,   0,   0,   0,   3,   6,   9,  12,  15,  18,
    //       0,   0,   0,   0,   0,  -1,   0,   3,   6,   9,
    //       0,   0,   0,   0,   0,   0,   3,   2,   5,   6,
    //       0,   0,   0,   0,   0,   0,   0,  -1,   0,   3,
    //       0,   0,   0,   0,   0,   0,   0,   0,   3,   6,
    //     ], 11, 10);
    //  #[rustfmt::skip]
    //     let expected_paths = Vec2d::<i32>::from_slice(&[
    //       2,   9,   9,   9,  -1,  -1,  -1,  -1,  -1,  -1,
    //       2,   9,   9,   2,   2,  -1,  -1,  -1,  -1,  -1,
    //       2,   9,  25,  25,  25,   9,  -1,  -1,  -1,  -1,
    //       2,   1,  17,   1,   2,  12,  12,  -1,  -1,  -1,
    //       2,  20,  17,  25,  25,  25,  25,  25,  -1,  -1,
    //       1,  20,  20,   1,   1,   2,  18,  18,  18,  -1,
    //       4,  20,  20,  20,  17,  25,  25,  17,  17,  17,
    //       4,  20,  20,  20,  20,   1,   4,   4,   4,   4,
    //       4,  20,  20,  20,  20,  20,  17,  25,  25,  28,
    //       4,  20,  20,  20,  20,  20,  20,   1,  20,  20,
    //       4,  20,  20,  20,  20,  20,  20,  20,  17,  17,
    //     ], 11, 10);

    assert_eq!(expected_scores, result.scores);
    // assert_eq!(expected_paths, result.paths);
    Ok(())
  }
}
