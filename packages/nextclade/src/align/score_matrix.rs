use crate::align::band_2d::{Band2d, Stripe};
use crate::align::params::{AlignPairwiseParams, GapAlignmentSide};
use crate::alphabet::letter::Letter;
use log::trace;

// store direction info for backtrace as bits in paths matrix
// these indicate the currently optimal move
pub const MATCH: i8 = 1 << 0;
pub const REF_GAP_MATRIX: i8 = 1 << 1;
pub const QRY_GAP_MATRIX: i8 = 1 << 2;
// these are the override flags for gap extension
pub const REF_GAP_EXTEND: i8 = 1 << 3;
pub const QRY_GAP_EXTEND: i8 = 1 << 4;
pub const BOUNDARY: i8 = 1 << 5;

const NO_ALIGN: i32 = -1_000_000_000; //very negative to be able to process unalignable seqs

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
  assert!(gap_open_close.len() > 0);
  assert!(stripes.len() > 0);

  let query_size = qry_seq.len();
  let ref_len = ref_seq.len();
  let n_rows = ref_len + 1;
  let n_cols = query_size + 1;

  trace!("Score matrix: started: query_size={query_size}, ref_len={ref_len}, n_rows={n_rows}, n_cols={n_cols}");

  let mut paths = Band2d::<i8>::new(stripes);
  let mut scores = Band2d::<i32>::new(stripes);
  let band_size = paths.data_len();

  trace!("Score matrix: allocated alignment band of size={band_size}");

  // The variable left_align changes the < effectively into <= in the conditions where it's used,
  // in order to select preferred alignment where there's two equally good possibilities.
  let left_align = match params.gap_alignment_side {
    GapAlignmentSide::Left => 1,
    GapAlignmentSide::Right => 0,
  };

  // fill scores with alignment scores
  // if the colon marks the position in the sequence before rPos,qPos
  // R: ...ACT:X
  // Q: ...ACT:Y
  // 1) if X and Y are bases they either match or mismatch. shift doesn't change, rPos and qPos advance
  //    -> right horizontal step in the matrix
  // 2) if X is '-' and Y is a base, rPos stays the same and the shift decreases
  //    -> vertical step in the matrix from si+1 to si
  // 2) if X is a base and Y is '-', rPos advances the same and the shift increases
  //    -> diagonal step in the matrix from (ri,si-1) to (ri+1,si)

  paths[(0, 0)] = 0;
  scores[(0, 0)] = 0;

  // Initialize first row (start at + 1 since [(0,0)] is already set)
  for qpos in (stripes[0].begin + 1)..stripes[0].end {
    paths[(0, qpos)] = REF_GAP_EXTEND + REF_GAP_MATRIX;
    if params.left_terminal_gaps_free {
      // Left terminal qry insertion  is free
      scores[(0, qpos)] = 0;
    } else {
      // Left terminal qry insertion is not free
      // TODO: Consider whether qry insertion should ever be free, not only qry deletion!
      if qpos == 1 {
        scores[(0, 1)] = -gap_open_close[0];
      } else {
        scores[(0, qpos)] = scores[(0, qpos - 1)] - params.penalty_gap_extend;
      }
    }
  }
  let mut qry_gaps = vec![NO_ALIGN; n_cols];

  // Iterate over rows
  for ri in 1..=ref_len {
    let mut ref_gaps = NO_ALIGN;

    for qpos in stripes[ri].begin..stripes[ri].end {
      let mut tmp_path = 0;
      let mut score = NO_ALIGN; // Needs to be very negative so that one path is always the best
      let mut origin = 0;
      let q_gap_extend: i32;
      let r_gap_extend: i32;
      let r_gap_open: i32;
      let q_gap_open: i32;
      let mut tmp_score: i32;

      if qpos == 0 {
        // Initialize first column
        // precedes query sequence -- no score, origin is query gap
        tmp_path = QRY_GAP_EXTEND;
        origin = QRY_GAP_MATRIX;
        if params.left_terminal_gaps_free {
          // Left terminal qry gap is free
          score = 0;
        } else {
          // Left terminal qry gap is not free
          if ri == 1 {
            score = -gap_open_close[0];
          } else {
            score = scores[(ri - 1, 0)] - params.penalty_gap_extend;
          }
        }
      } else {
        // if the position is within the query sequence
        // no gap -- match case

        // ^ If stripes allow to move up diagonally to upper left
        if qpos > stripes[ri - 1].begin && qpos - 1 < stripes[ri - 1].end {
          score = if qry_seq[qpos - 1].is_unknown() || ref_seq[ri - 1].is_unknown() {
            // no need to look-up match score since unknown matches with everything.
            // reduce match score by 1 to de-prioritize matches with unknown states.
            scores[(ri - 1, qpos - 1)] + params.score_match - 1
          } else if T::lookup_match_score(qry_seq[qpos - 1], ref_seq[ri - 1]) > 0 {
            scores[(ri - 1, qpos - 1)] + params.score_match
          } else {
            scores[(ri - 1, qpos - 1)] - params.penalty_mismatch
          };
          origin = MATCH;
        } else if ri < n_rows - 1 && qpos < n_cols - 1 {
          // Can't move diagonally. The last reference row and last query column are sequence ends:
          // `simple_stripes` clamps stripes there, so a missing predecessor is not an interior band edge.
          tmp_path = tmp_path | BOUNDARY;
        }

        // check the scores of a reference gap
        // if qpos == stripes.begin: ref gap not allowed
        // thus path skipped
        if qpos > stripes[ri].begin {
          if ri != ref_len || !params.right_terminal_gaps_free {
            //normal case, not at end of ref sequence
            r_gap_extend = ref_gaps - params.penalty_gap_extend;
            r_gap_open = scores[(ri, qpos - 1)] - gap_open_close[ri];
          } else {
            // at end of ref sequence if right terminal gaps are free
            // TODO: Consider whether qry insertion should ever be free, not only qry deletion!
            r_gap_extend = ref_gaps;
            r_gap_open = scores[(ri, qpos - 1)];
          }
          if r_gap_extend >= r_gap_open && qpos > stripes[ri].begin + 1 {
            // extension better than opening (and ^ extension allowed positionally)
            tmp_score = r_gap_extend;
            tmp_path += REF_GAP_EXTEND;
          } else {
            // opening better than extension
            tmp_score = r_gap_open;
          }
          // could factor out tmp_score, replacing with ref_gaps but maybe less readable
          ref_gaps = tmp_score;
          if score - left_align < tmp_score {
            score = tmp_score;
            origin = REF_GAP_MATRIX;
          }
        } else if ri < n_rows - 1 && qpos < n_cols - 1 {
          // Can't move left. Collapsed terminal stripes sit on the last query column; that is a sequence end.
          tmp_path = tmp_path | BOUNDARY;
        }

        // check the scores of a query gap
        if qpos < stripes[ri - 1].end {
          // need stripe above to move from, otherwise no scores[(ri-1, qpos)] not existing
          if qpos != query_size || !params.right_terminal_gaps_free {
            //normal case, not at end of query sequence
            q_gap_extend = qry_gaps[qpos] - params.penalty_gap_extend;
            q_gap_open = scores[(ri - 1, qpos)] - gap_open_close[ri - 1];
          } else {
            //end of query sequence make right terminal gap free
            q_gap_extend = qry_gaps[qpos];
            q_gap_open = scores[(ri - 1, qpos)];
          }
          if q_gap_extend >= q_gap_open && qpos < stripes[ri - 2].end {
            // extension better than opening (and ^ extension allowed positionally)
            tmp_score = q_gap_extend;
            tmp_path += QRY_GAP_EXTEND;
          } else {
            tmp_score = q_gap_open;
          }
          qry_gaps[qpos] = tmp_score;
          if score - left_align < tmp_score {
            score = tmp_score;
            origin = QRY_GAP_MATRIX;
          }
        } else if qpos < n_cols - 1 {
          // Stripe hole: this query-gap state cannot be extended from the row above.
          qry_gaps[qpos] = NO_ALIGN;
          if ri < n_rows - 1 {
            // Can't move up. The last reference row is extended to the query end, so it is not a band edge.
            tmp_path = tmp_path | BOUNDARY;
          }
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
  use crate::align::band_2d::{full_matrix, simple_stripes};
  use crate::align::gap_open::{GapScoreMap, get_gap_open_close_scores_codon_aware};

  use crate::alphabet::nuc::{Nuc, to_nuc_seq};
  use crate::gene::gene_map::GeneMap;
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
  fn pads_missing_left(ctx: Context) -> Result<(), Report> {
    let qry_seq = to_nuc_seq("CTCGCTG")?;
    let ref_seq = to_nuc_seq("ACGCTCGCTG")?;

    let band_width = 5;
    let mean_shift = 2;

    let mut stripes = simple_stripes(mean_shift, band_width, ref_seq.len(), qry_seq.len());
    stripes[2].end = stripes[2].end - 1;
    stripes[8].begin = stripes[8].begin + 1;
    let result = score_matrix(&qry_seq, &ref_seq, &ctx.gap_open_close, &stripes, &ctx.params);

    #[rustfmt::skip]
    let expected_scores = Band2d::<i32>::with_data(
      &stripes,
      &[
         0,  0,  0,  0,
         0, -1, -1, -1, -1,
         0,  3, -2,  2, -2,
         0, -1,  2, -3,  5, -1, -1,
         0,  3, -2,  5, -1,  8,  2,  2,
         0, -1,  6,  0,  4,  2, 11,  5,
         0,  3,  0,  9,  3,  7,  5, 10,
         0, -1,  2,  3, 12,  6,  6, 10,
                 0,  5,  6, 15,  9, 10,
                 0,  3,  6,  9, 18, 12,
                     3,  6,  9, 12, 21,
      ],
    );

    #[rustfmt::skip]
    let expected_paths = Band2d::<i8>::with_data(
      &stripes,
      &[
           0, 10, 10, 10,
          20,  1,  9,  9, 41,
          20, 17, 17, 25,  9,
          20,  1, 25,  1, 25, 34, 42,
          20, 17,  1, 25,  4,  9,  2, 10,
          20, 17, 25,  2, 25, 12,  9,  2,
          20, 17,  4, 25, 18, 25, 12,  9,
          20, 17, 25,  4, 17, 18, 26, 12,
                  52, 17,  4, 17, 18, 28,
                  52, 20, 20,  4, 17, 18,
                      20, 20, 20,  4,  1,
      ],
    );

    assert_eq!(expected_scores, result.scores);
    assert_eq!(expected_paths, result.paths);

    Ok(())
  }

  #[rstest]
  fn pads_missing_left_with_alignment_gap_right(mut ctx: Context) -> Result<(), Report> {
    let qry_seq = to_nuc_seq("CTCGCTG")?;
    let ref_seq = to_nuc_seq("ACGCTCGCTG")?;

    let band_width = 5;
    let mean_shift = 2;

    let mut stripes = simple_stripes(mean_shift, band_width, ref_seq.len(), qry_seq.len());
    stripes[2].end = stripes[2].end - 1;
    stripes[8].begin = stripes[8].begin + 1;

    ctx.params.gap_alignment_side = GapAlignmentSide::Right;
    let result = score_matrix(&qry_seq, &ref_seq, &ctx.gap_open_close, &stripes, &ctx.params);

    #[rustfmt::skip]
    let expected_scores = Band2d::<i32>::with_data(
      &stripes,
      &[
         0,  0,  0,  0,
         0, -1, -1, -1, -1,
         0,  3, -2,  2, -2,
         0, -1,  2, -3,  5, -1, -1,
         0,  3, -2,  5, -1,  8,  2,  2,
         0, -1,  6,  0,  4,  2, 11,  5,
         0,  3,  0,  9,  3,  7,  5, 10,
         0, -1,  2,  3, 12,  6,  6, 10,
                 0,  5,  6, 15,  9, 10,
                 0,  3,  6,  9, 18, 12,
                     3,  6,  9, 12, 21,
      ],
    );

    #[rustfmt::skip]
    let expected_paths = Band2d::<i8>::with_data(
      &stripes,
      &[
         0, 10, 10, 10,
        20,  1,  9,  9, 41,
        20, 17, 17, 25,  9,
        20,  1, 25,  1, 25, 34, 42,
        20, 17,  1, 25,  2,  9,  2, 10,
        20, 17, 25,  2, 25, 12,  9,  2,
        20, 17,  4, 25, 18, 25, 12,  9,
        20, 17, 25,  4, 17, 18, 25, 12,
                52, 17,  4, 17, 18, 28,
                52, 20, 20,  4, 17, 18,
                    20, 17, 20,  4,  1
      ],
    );

    assert_eq!(expected_scores, result.scores);
    assert_eq!(expected_paths, result.paths);

    Ok(())
  }

  /// Collapsed terminal stripes and the forced last row are sequence ends. Their missing predecessors must not
  /// set `BOUNDARY`, while the move bits and the alignment score stay the same.
  #[rstest]
  fn terminal_stripes_omit_boundary_but_keep_moves_and_score(ctx: Context) -> Result<(), Report> {
    let qry_seq = to_nuc_seq("ACGT")?;
    let ref_seq = to_nuc_seq("ACGTAAAA")?;
    let stripes = simple_stripes(0, 1, ref_seq.len(), qry_seq.len());
    let result = score_matrix(&qry_seq, &ref_seq, &ctx.gap_open_close, &stripes, &ctx.params);

    let query_size = qry_seq.len();
    let ref_len = ref_seq.len();
    assert!(stripes.iter().filter(|stripe| stripe.begin == query_size).count() > 2);

    for (ri, stripe) in stripes.iter().enumerate() {
      if stripe.begin != query_size {
        continue;
      }
      let path = result.paths[(ri, query_size)];
      assert_eq!(
        path & BOUNDARY,
        0,
        "collapsed row {ri} marked a sequence end as a band edge"
      );
      // Only a query gap can enter a stripe that is the single last query column.
      if ri > 0 && stripes[ri - 1].begin == query_size {
        assert!(
          path == QRY_GAP_MATRIX || path == (QRY_GAP_MATRIX | QRY_GAP_EXTEND),
          "collapsed row {ri} changed move bits: {path}"
        );
      }
    }

    for qpos in stripes[ref_len].begin..stripes[ref_len].end {
      assert_eq!(result.paths[(ref_len, qpos)] & BOUNDARY, 0, "last row qpos {qpos}");
    }

    // Left edge of an interior stripe still cannot move left, so the band restriction stays.
    let interior = (2, stripes[2].begin);
    assert!(stripes[2].begin > 0 && stripes[2].begin < query_size);
    assert_ne!(result.paths[interior] & BOUNDARY, 0);
    assert_ne!(result.paths[interior] & (MATCH | REF_GAP_MATRIX | QRY_GAP_MATRIX), 0);

    let full = score_matrix(
      &qry_seq,
      &ref_seq,
      &ctx.gap_open_close,
      &full_matrix(ref_len, query_size),
      &ctx.params,
    );
    assert_eq!(full.scores[(ref_len, query_size)], result.scores[(ref_len, query_size)]);

    Ok(())
  }

  /// Trailing query bases are reached by extending the last reference row. Cells past the previous stripe have no
  /// upward or diagonal predecessor; that clamp is not a band edge, and horizontal move bits stay put.
  #[rstest]
  fn last_row_extension_omits_boundary_but_keeps_ref_gap(ctx: Context) -> Result<(), Report> {
    let qry_seq = to_nuc_seq("ACGTAAAA")?;
    let ref_seq = to_nuc_seq("ACGT")?;
    let stripes = simple_stripes(0, 1, ref_seq.len(), qry_seq.len());
    let result = score_matrix(&qry_seq, &ref_seq, &ctx.gap_open_close, &stripes, &ctx.params);

    let ref_len = ref_seq.len();
    let query_size = qry_seq.len();
    let prev_end = stripes[ref_len - 1].end;
    assert!(stripes[ref_len].end == query_size + 1);
    assert!(prev_end + 1 < stripes[ref_len].end);

    for qpos in stripes[ref_len].begin..stripes[ref_len].end {
      let path = result.paths[(ref_len, qpos)];
      assert_eq!(path & BOUNDARY, 0, "last row qpos {qpos} path {path}");
      if qpos > prev_end {
        assert!(
          path == REF_GAP_MATRIX || path == (REF_GAP_MATRIX | REF_GAP_EXTEND),
          "extended last-row qpos {qpos} changed move bits: {path}"
        );
      }
    }

    let full = score_matrix(
      &qry_seq,
      &ref_seq,
      &ctx.gap_open_close,
      &full_matrix(ref_len, query_size),
      &ctx.params,
    );
    assert_eq!(full.scores[(ref_len, query_size)], result.scores[(ref_len, query_size)]);

    Ok(())
  }
}
