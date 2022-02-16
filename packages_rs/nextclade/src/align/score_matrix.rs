#![allow(clippy::separated_literal_suffix)]
#![allow(non_snake_case)]
#![allow(non_upper_case_globals)]
#![allow(unused_assignments)]
#![allow(unused_imports)]

use crate::align::align::AlignPairwiseParams;
use crate::align::match_nuc::lookup_match_score_nuc;
use crate::io::nuc::Nuc;
use crate::utils::vec2d::Vec2d;
use log::trace;
use std::io;
use std::io::Write;

// store direction info for backtrace as bits in paths matrix
// these indicate the currently optimal move
pub const MATCH: i32 = 1 << 0;
pub const refGAPmatrix: i32 = 1 << 1;
pub const qryGAPmatrix: i32 = 1 << 2;
// these are the override flags for gap extension
pub const refGAPextend: i32 = 1 << 3;
pub const qryGAPextend: i32 = 1 << 4;
pub const END_OF_SEQUENCE: i32 = -1;

pub struct ScoreMatrixResult {
  pub scores: Vec2d<i32>,
  pub paths: Vec2d<i32>,
}

pub fn score_matrix(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  gapOpenClose: &[i32],
  bandWidth: usize,
  meanShift: i32,
  params: &AlignPairwiseParams,
) -> ScoreMatrixResult {
  let querySize = qry_seq.len();
  let refSize = ref_seq.len();
  let n_rows = bandWidth * 2 + 1;
  let n_cols = refSize + 1;

  trace!(
    "Score matrix: stared: querySize={querySize}, refSize={refSize}, \
  bandWidth={bandWidth}, meanShift={meanShift}, n_rows={n_rows}, n_cols={n_cols}"
  );

  let mut paths = Vec2d::<i32>::new(n_rows, n_cols);
  let mut scores = Vec2d::<i32>::new(n_rows, n_cols);
  let mut qryGaps = vec![0_i32; n_rows];

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
  let NO_ALIGN = -(params.scoreMatch + params.penaltyMismatch) * refSize as i32;

  for si in bandWidth + 1..=2 * bandWidth {
    paths[(si, 0)] = qryGAPmatrix;
  }

  paths[(bandWidth, 0)] = MATCH;
  qryGaps[bandWidth] = -params.penaltyGapOpen;
  for si in (0..bandWidth).rev() {
    paths[(si, 0)] = refGAPmatrix;
    qryGaps[si] = -params.penaltyGapOpen;
  }

  for ri in 0..refSize as i32 {
    let mut qPos: i32 = ri as i32 - (bandWidth as i32 + meanShift);
    let mut refGaps = -gapOpenClose[ri as usize];

    for si in (0..=(2 * bandWidth as i32)).rev() {
      let mut tmpPath = 0;
      let mut score = 0;
      let mut origin = 0;
      let mut qGapExtend = 0;
      let mut rGapExtend = 0;
      let mut rGapOpen = 0;
      let mut qGapOpen = 0;
      let mut tmpMatch = 0;
      let mut tmpScore = 0;

      if qPos < 0 {
        // precedes query sequence -- no score, origin is query gap
        // we could fill all of this at once
        score = 0;
        tmpPath += qryGAPextend;
        refGaps = -gapOpenClose[ri as usize];
        origin = qryGAPmatrix;
      } else if qPos < querySize as i32 {
        // if the shifted position is within the query sequence

        // no gap -- match case
        let matrix_score = lookup_match_score_nuc(qry_seq[qPos as usize], ref_seq[ri as usize]);
        tmpMatch = if matrix_score > 0 {
          params.scoreMatch
        } else {
          -params.penaltyMismatch
        };
        score = scores[(si, ri)] + tmpMatch;
        origin = MATCH;

        // check the scores of a reference gap
        if si < 2 * bandWidth as i32 {
          rGapExtend = refGaps - params.penaltyGapExtend;
          rGapOpen = scores[(si + 1, ri + 1)] - gapOpenClose[(ri + 1) as usize];
          if rGapExtend > rGapOpen {
            tmpScore = rGapExtend;
            tmpPath += refGAPextend;
          } else {
            tmpScore = rGapOpen;
          }
          refGaps = tmpScore;
          if score < tmpScore {
            score = tmpScore;
            origin = refGAPmatrix;
          }
        } else {
          refGaps = NO_ALIGN;
        }

        // check the scores of a reference gap
        if si > 0 {
          qGapExtend = qryGaps[(si - 1) as usize] - params.penaltyGapExtend;
          qGapOpen = scores[(si - 1, ri)] - gapOpenClose[ri as usize];
          tmpScore = qGapExtend.max(qGapOpen);
          if qGapExtend > qGapOpen {
            tmpScore = qGapExtend;
            tmpPath += qryGAPextend;
          } else {
            tmpScore = qGapOpen;
          }
          qryGaps[si as usize] = tmpScore;
          if score < tmpScore {
            score = tmpScore;
            origin = qryGAPmatrix;
          }
        } else {
          qryGaps[si as usize] = NO_ALIGN;
        }
      } else {
        // past query sequence -- mark as sequence end
        score = END_OF_SEQUENCE;
        origin = END_OF_SEQUENCE;
      }
      tmpPath += origin;
      paths[(si, ri + 1)] = tmpPath;
      scores[(si, ri + 1)] = score;
      qPos += 1;
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
  use crate::io::nuc::{from_nuc_seq, to_nuc_seq};
  use crate::utils::global_init::global_init;
  use ctor::ctor;
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

    let dummy_ref_seq = vec![Nuc::GAP; 100];
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
