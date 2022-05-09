use crate::align::band_2d::{Band2d, Stripe};
use crate::align::params::AlignPairwiseParams;
use crate::io::letter::Letter;
use log::trace;

// store direction info for backtrace as bits in paths matrix
// these indicate the currently optimal move
pub const MATCH: i8 = 1 << 0;
pub const REF_GAP_MATRIX: i8 = 1 << 1;
pub const QRY_GAP_MATRIX: i8 = 1 << 2;
// these are the override flags for gap extension
pub const REF_GAP_EXTEND: i8 = 1 << 3;
pub const QRY_GAP_EXTEND: i8 = 1 << 4;

pub struct ScoreMatrixResult {
  pub scores: Band2d<i32>,
  pub paths: Band2d<i8>,
}

pub fn score_matrix<T: Letter<T>>(
  qry_seq: &[T],
  ref_seq: &[T],
  gap_open_close: &[i32],
  stripes: &[Stripe],
  params: &AlignPairwiseParams,
) -> ScoreMatrixResult {
  let query_size = qry_seq.len();
  let ref_len = ref_seq.len();
  let n_rows = ref_len + 1;
  let n_cols = query_size + 1;

  trace!("Score matrix: started: query_size={query_size}, ref_len={ref_len}, n_rows={n_rows}, n_cols={n_cols}");

  let mut paths = Band2d::<i8>::new(stripes);
  let mut scores = Band2d::<i32>::new(stripes);

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

  const NO_ALIGN: i32 = -1_000_000_000; //very negative to be able to process unalignable seqs

  paths[(0, 0)] = 0;
  scores[(0, 0)] = 0;

  // Initialize first row
  for qpos in (stripes[0].begin + 1)..stripes[0].end {
    paths[(0, qpos)] = REF_GAP_EXTEND + REF_GAP_MATRIX;
    if params.left_terminal_gaps_free {
      // Left terminal gap is free
      scores[(0, qpos)] = 0;
    } else {
      // Left terminal gap is not free
      if qpos == 1 {
        scores[(0, 1)] = -gap_open_close[0];
      } else {
        scores[(0, qpos)] = scores[(0, qpos - 1)] - params.penalty_gap_extend;
      }
    }
  }
  let mut qry_gaps = vec![NO_ALIGN; n_cols];

  // Iterate over rows
  for ri in 1..ref_len + 1 {
    let mut ref_gaps = NO_ALIGN;

    for qpos in stripes[ri].begin..stripes[ri].end {
      let mut tmp_path = 0;
      let mut score = NO_ALIGN; // Needs to be very negative so that one path is always the best
      let mut origin = 0;
      let q_gap_extend: i32;
      let r_gap_extend: i32;
      let r_gap_open: i32;
      let q_gap_open: i32;
      let tmp_match: i32;
      let mut tmp_score: i32;

      if qpos == 0 {
        // Initialize first column
        // precedes query sequence -- no score, origin is query gap
        tmp_path = QRY_GAP_EXTEND;
        origin = QRY_GAP_MATRIX;
        if params.left_terminal_gaps_free {
          // Left terminal gap is free
          score = 0;
        } else {
          // Left terminal gap is not free
          if ri == 1 {
            score = -gap_open_close[0];
          } else {
            score = scores[(ri - 1, 0)] - params.penalty_gap_extend;
          }
        }
      } else {
        // if the position is within the query sequence
        // no gap -- match case

        // TODO: Double bounds check -> wasteful, make better
        if qpos - 1 >= stripes[ri - 1].begin && qpos - 1 < stripes[ri - 1].end {
          // ^ If stripes allow to move up diagonally to upper left
          if T::lookup_match_score(qry_seq[qpos - 1], ref_seq[ri - 1]) > 0 {
            score = scores[(ri - 1, qpos - 1)] + params.score_match;
          } else {
            score = scores[(ri - 1, qpos - 1)] - params.penalty_mismatch;
          };
          origin = MATCH;
        }

        // check the scores of a reference gap
        // if qpos == stripes.begin: ref gap not allowed
        // thus path skipped
        if qpos > stripes[ri].begin {
          if ri != ref_len {
            //normal case, not at end of ref sequence
            r_gap_extend = ref_gaps - params.penalty_gap_extend;
            r_gap_open = scores[(ri, qpos - 1)] - gap_open_close[ri];
          } else {
            // at end of ref sequence, gaps are free
            r_gap_extend = ref_gaps;
            r_gap_open = scores[(ri, qpos - 1)];
          }
          if r_gap_extend >= r_gap_open && qpos > stripes[ri].begin + 1 {
            // extension better than opening (and ^ extension allowed positionally)
            tmp_score = r_gap_extend;
            tmp_path = REF_GAP_EXTEND;
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
        }

        // check the scores of a query gap
        if qpos < stripes[ri - 1].end {
          // need stripe above to move from, otherwise no scores[(ri-1, qpos)] not existing
          if qpos != query_size {
            //normal case, not at end of query sequence
            q_gap_extend = qry_gaps[qpos] - params.penalty_gap_extend;
            q_gap_open = scores[(ri - 1, qpos)] - gap_open_close[ri - 1];
          } else {
            //at end of query sequence make qry gap free
            q_gap_extend = qry_gaps[qpos];
            q_gap_open = scores[(ri - 1, qpos)]
          }
          if q_gap_extend >= q_gap_open && qpos < stripes[ri - 2].end {
            // extension better than opening (and ^ extension allowed positionally)
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
  fn pads_missing_left(ctx: Context) -> Result<(), Report> {
    let qry_seq = to_nuc_seq("CTCGCT")?;
    let ref_seq = to_nuc_seq("ACGCTCGCT")?;

    let band_width = 5;
    let mean_shift = 2;

    let stripes = simple_stripes(mean_shift, band_width, ref_seq.len(), qry_seq.len());
    let result = score_matrix(&qry_seq, &ref_seq, &ctx.gap_open_close, &stripes, &ctx.params);

    let mut expected_scores = Band2d::<i32>::new(&stripes);
    expected_scores.data = vec![
      0, 0, 0, 0, 0, -1, -1, -1, -1, 0, 3, -2, 2, -2, 2, 0, -1, 2, -3, 5, -1, 1, 0, 3, -2, 5, -1, 8, 2, 0, -1, 6, 0, 4,
      2, 11, 0, 3, 0, 9, 3, 7, 11, 0, -1, 2, 3, 12, 6, 11, 3, 0, 5, 6, 15, 11, 6, 6, 6, 9, 18,
    ];

    let mut expected_paths = Band2d::<i8>::new(&stripes);
    expected_paths.data = vec![
      0, 10, 10, 10, 20, 1, 9, 9, 9, 20, 17, 17, 25, 9, 9, 20, 1, 25, 1, 25, 2, 9, 20, 17, 1, 25, 2, 25, 2, 20, 17, 25,
      2, 25, 12, 9, 20, 17, 4, 25, 18, 25, 12, 20, 17, 25, 4, 17, 18, 28, 17, 20, 25, 4, 17, 20, 17, 18, 26, 12, 17,
    ];

    // println!("{:?}", result.scores.data);
    // println!("{:?}", result.paths.data);

    assert_eq!(expected_scores, result.scores);
    assert_eq!(expected_paths, result.paths);

    Ok(())
  }
}
