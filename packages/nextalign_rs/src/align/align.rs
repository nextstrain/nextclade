#![allow(non_snake_case)]

use crate::align::backtrace::{backtrace, NextalignResult};
use crate::align::score_matrix::{score_matrix, ScoreMatrixResult};
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

struct SeedMatchResult {
  shift: usize,
  score: usize,
}

fn seedMatch(kmer: &[Nuc], ref_seq: &[Nuc], start_pos: usize, mismatches_allowed: usize) -> SeedMatchResult {
  let ref_len = ref_seq.len();
  let kmer_len = kmer.len();

  #[allow(unused_assignments)]
  let mut tmp_score: usize = 0;
  let mut max_score: usize = 0;
  let mut max_shift: usize = 0;

  let end_pos = ref_len - kmer_len;
  for shift in start_pos..end_pos {
    tmp_score = 0;

    for pos in 0..kmer_len {
      if kmer[pos] == ref_seq[shift + pos] {
        tmp_score += 1;
      }

      // TODO: this speeds up seed-matching by disregarding bad seeds.
      if tmp_score + mismatches_allowed < pos {
        break;
      }
    }
    if tmp_score > max_score {
      max_score = tmp_score;
      max_shift = shift;

      // if maximal score is reached
      if tmp_score == kmer_len {
        break;
      }
    }
  }

  SeedMatchResult {
    shift: max_shift,
    score: max_score,
  }
}

fn is_bad_letter(letter: &Nuc) -> bool {
  letter == &Nuc::N
}

fn get_map_to_good_positions(qry_seq: &[Nuc], seed_length: usize) -> Vec<usize> {
  let qry_len = qry_seq.len();

  let mut map_to_good_positions = Vec::<usize>::with_capacity(qry_len);
  let mut distance_to_last_bad_pos: i64 = 0;

  for (i, letter) in qry_seq.iter().enumerate() {
    if is_bad_letter(letter) {
      distance_to_last_bad_pos = -1;
    } else if distance_to_last_bad_pos > seed_length as i64 {
      map_to_good_positions.push(i - seed_length);
    }
    distance_to_last_bad_pos += 1;
  }

  map_to_good_positions
}

struct SeedAlignmentResult {
  meanShift: i32,
  bandWidth: usize,
}

fn seedAlignment(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  params: &AlignPairwiseParams,
) -> Result<SeedAlignmentResult, Report> {
  let querySize = qry_seq.len();
  let refSize = ref_seq.len();

  let nSeeds = if refSize > (params.minSeeds * params.seedSpacing) as usize {
    (refSize as f32 / params.seedSpacing as f32) as i32
  } else {
    params.minSeeds
  };

  let margin = (refSize as f32 / (nSeeds * 3) as f32).round() as i32;
  let bandWidth = (((refSize + querySize) as f32 * 0.5) - 3.0).round() as usize;

  let mut start_pos = 0;

  if bandWidth < (2 * params.seedLength) {
    return Ok(SeedAlignmentResult {
      meanShift: ((refSize - querySize) as f32 * 0.5).round() as i32,
      bandWidth,
    });
  };

  let map_to_good_positions = get_map_to_good_positions(qry_seq, params.seedLength);
  let n_good_positions = map_to_good_positions.len() as i32;

  // Generate kmers equally spaced on the query
  let seedCover = n_good_positions - 2 * margin;
  let kmerSpacing = ((seedCover as f32) - 1.0) / ((nSeeds - 1) as f32);

  if seedCover < 0 || kmerSpacing < 0.0 {
    return error!(
      "Unable to align: poor seed matches. Details: seed cover: {seedCover}, k-mer spacing: {kmerSpacing}."
    );
  }

  // TODO: Maybe use something other than tuple? A struct with named fields to make
  //  the code in the end of the function less confusing?
  let mut seedMatches = Vec::<(usize, usize, i64, usize)>::new();
  for ni in 0..nSeeds {
    let goodPositionIndex = (margin as f32 + (kmerSpacing * ni as f32)).round() as usize;
    let qPos = map_to_good_positions[goodPositionIndex];

    let seed = &qry_seq[qPos..qPos + params.seedLength];
    let tmpMatch = seedMatch(seed, ref_seq, start_pos, params.mismatchesAllowed);

    // Only use seeds with at most allowed_mismatches
    if tmpMatch.score >= params.seedLength - params.mismatchesAllowed {
      seedMatches.push((
        qPos,
        tmpMatch.shift,
        (tmpMatch.shift as i64 - qPos as i64),
        tmpMatch.score,
      ));
      start_pos = tmpMatch.shift as usize;
    }
  }

  let num_seed_matches = seedMatches.len();
  if num_seed_matches < 2 {
    return error!("Unable to align: no seed matches. Details: num seed matches: {num_seed_matches}");
  }

  // Given the seed matches, determine the maximal and minimal shifts.
  // This shift is the typical amount the query needs shifting to match ref.
  //
  // Example:
  // ref:   ACTCTACTGC-TCAGAC
  // qry:   ----TCACTCATCT-ACACCGAT
  // => shift = 4, then 3, 4 again
  let (minShift, maxShift) = seedMatches.iter().fold(
    (refSize as i64, -(refSize as i64)),
    |(min, max): (i64, i64), clamp: &(usize, usize, i64, usize)| {
      let shift = clamp.2;
      (min.min(shift), max.max(shift))
    },
  );

  Ok(SeedAlignmentResult {
    meanShift: (0.5 * (minShift + maxShift) as f64).round() as i32,
    bandWidth: (maxShift - minShift + 9) as usize,
  })
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
