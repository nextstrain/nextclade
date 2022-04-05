use crate::align::align::AlignPairwiseParams;
use crate::align::seed_match::seed_match;
use crate::io::nuc::Nuc;
use crate::make_error;
use eyre::Report;

fn is_bad_letter(letter: Nuc) -> bool {
  letter == Nuc::N
}

/// Find substrings of length `seed_length` that don't contain any `N`s (_bad letters_)
/// # Examples
/// ```
/// let qry_example = Nuc::from_string("ACGTTNACCTT");
/// let seed_length = 3;
/// let result = get_map_to_good_positions(qry_example, seed_length);
///
/// assert_eq!([0,1,2,6,7].to_vec(), result);
///
fn get_map_to_good_positions(qry_seq: &[Nuc], seed_length: usize) -> Vec<usize> {
  let qry_example = Nuc::from_string("ACGTTNACCTT");

  let qry_len = qry_seq.len();

  let mut map_to_good_positions = Vec::<usize>::with_capacity(qry_len);
  let mut distance_to_last_bad_pos: i64 = 0;

  for (i, letter) in qry_seq.iter().enumerate() {
    if is_bad_letter(*letter) {
      distance_to_last_bad_pos = -1;
    } else if distance_to_last_bad_pos > seed_length as i64 {
      map_to_good_positions.push(i - seed_length);
    }
    distance_to_last_bad_pos += 1;
  }

  map_to_good_positions
}

pub struct SeedMatch {
  qry_pos: usize,
  ref_pos: usize,
  score: usize,
}

pub struct SeedAlignmentResult {
  pub mean_shift: i32,
  pub band_width: usize,
}

pub fn seed_alignment(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  params: &AlignPairwiseParams,
) -> Result<SeedAlignmentResult, Report> {
  let query_size = qry_seq.len();
  let ref_size = ref_seq.len();

  let n_seeds = if ref_size > (params.min_seeds * params.seed_spacing) as usize {
    (ref_size as f32 / params.seed_spacing as f32) as i32
  } else {
    params.min_seeds
  };

  let margin = (ref_size as f32 / (n_seeds * 3) as f32).round() as i32;
  let band_width = (((ref_size + query_size) as f32 * 0.5) - 3.0).round() as usize;

  let mut start_pos = 0;

  if band_width < (2 * params.seed_length) {
    return Ok(SeedAlignmentResult {
      mean_shift: ((ref_size as f32 - query_size as f32) * 0.5).round() as i32,
      band_width,
    });
  };

  let map_to_good_positions = get_map_to_good_positions(qry_seq, params.seed_length);
  let n_good_positions = map_to_good_positions.len() as i32;

  // Generate kmers equally spaced on the query
  let seed_cover = n_good_positions - 2 * margin;
  let kmer_spacing = ((seed_cover as f32) - 1.0) / ((n_seeds - 1) as f32);

  if seed_cover < 0 || kmer_spacing < 0.0 {
    return make_error!(
      "Unable to align: poor seed matches. Details: seed cover: {seed_cover}, k-mer spacing: {kmer_spacing}."
    );
  }

  // TODO: Maybe use something other than tuple? A struct with named fields to make
  //  the code in the end of the function less confusing?
  let mut seed_matches = Vec::<SeedMatch>::new();
  for ni in 0..n_seeds {
    let good_position_index = (margin as f32 + (kmer_spacing * ni as f32)).round() as usize;
    let qry_pos = map_to_good_positions[good_position_index];

    let seed = &qry_seq[qry_pos..qry_pos + params.seed_length];
    let tmp_match = seed_match(seed, ref_seq, start_pos, params.mismatches_allowed);

    // Only use seeds with at most allowed_mismatches
    if tmp_match.score >= params.seed_length - params.mismatches_allowed {
      seed_matches.push(SeedMatch {
        qry_pos,
        ref_pos: tmp_match.ref_pos,
        score: tmp_match.score,
      });
      start_pos = tmp_match.ref_pos;
    }
  }

  let num_seed_matches = seed_matches.len();
  if num_seed_matches < 2 {
    return make_error!("Unable to align: no seed matches. Details: num seed matches: {num_seed_matches}");
  }

  // Given the seed matches, determine the maximal and minimal shifts.
  // This shift is the typical amount the query needs shifting to match ref.
  //
  // Example:
  // ref:   ACTCTACTGC-TCAGAC
  // qry:   ----TCACTCATCT-ACACCGAT
  // => shift = 4, then 3, 4 again
  let (min_shift, max_shift) = seed_matches.iter().fold(
    (ref_size as i64, -(ref_size as i64)),
    |(min, max): (i64, i64), clamp: &SeedMatch| {
      let shift = (clamp.ref_pos as i64) - (clamp.qry_pos as i64);
      (min.min(shift), max.max(shift))
    },
  );

  Ok(SeedAlignmentResult {
    mean_shift: (0.5 * (min_shift + max_shift) as f64).round() as i32,
    band_width: (max_shift - min_shift + 9) as usize,
  })
}
