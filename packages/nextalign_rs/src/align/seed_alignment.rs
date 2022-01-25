#![allow(non_snake_case)]
#![allow(non_upper_case_globals)]
#![allow(clippy::separated_literal_suffix)]

use crate::align::align::AlignPairwiseParams;
use crate::align::seed_match::seedMatch;
use crate::error;
use crate::io::nuc::Nuc;
use eyre::Report;

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

pub struct SeedAlignmentResult {
  pub meanShift: i32,
  pub bandWidth: usize,
}

pub fn seedAlignment(
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
