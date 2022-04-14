use crate::align::align::AlignPairwiseParams;
use crate::align::band_2d::simple_stripes;
use crate::align::band_2d::Stripe;
use crate::align::seed_match::seed_match;
use crate::io::nuc::Nuc;
use crate::make_error;
use eyre::Report;
use num_traits::{abs, clamp, clamp_min};

use super::band_2d::Band2d;

fn is_bad_letter(letter: Nuc) -> bool {
  letter == Nuc::N
}

fn get_map_to_good_positions(qry_seq: &[Nuc], seed_length: usize) -> Vec<usize> {
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

#[derive(Debug)]
pub struct SeedMatch {
  qry_pos: usize,
  ref_pos: usize,
  score: usize,
}

#[derive(Debug)]
pub struct SeedAlignmentResult {
  pub mean_shift: i32,
  pub band_width: usize,
  pub stripes: Vec<Stripe>,
}

pub fn get_seed_matches(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  params: &AlignPairwiseParams,
  n_seeds: i32,
  margin: i32,
) -> Vec<SeedMatch> {
  let query_size = qry_seq.len();
  let ref_size = ref_seq.len();
  let mut seed_matches = Vec::<SeedMatch>::new();

  let map_to_good_positions = get_map_to_good_positions(qry_seq, params.seed_length);
  let n_good_positions = map_to_good_positions.len() as i32;

  // Generate kmers equally spaced on the query
  let seed_cover = n_good_positions - 2 * margin;
  let kmer_spacing = ((seed_cover as f32) - 1.0) / ((n_seeds - 1) as f32);

  // loop over seeds and find matches, store in seed_matches
  let mut start_pos = 0;
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
  seed_matches
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

  if band_width < (2 * params.seed_length) {
    let mean_shift = ((ref_size as f32 - query_size as f32) * 0.5).round() as i32;
    let stripes = simple_stripes(mean_shift, band_width, ref_size, query_size);

    return Ok(SeedAlignmentResult {
      mean_shift,
      band_width,
      stripes,
    });
  };

  let seed_matches = get_seed_matches(qry_seq, ref_seq, params, n_seeds, margin);

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

  // let terminal_bandwidth: i32 = 20;
  // let excess_bandwidth: i32 = 9;
  // let stripes = make_stripes(qry_seq, ref_seq, params, terminal_bandwidth, excess_bandwidth);
  // println!("stripes, len {}", stripes.len());
  // println!("pos 0     {:?}", stripes[0]);
  // println!("pos 15000 {:?}", stripes[15000]);
  // println!("pos 29902 {:?}", stripes[29902]);

  let mean_shift = (0.5 * (min_shift + max_shift) as f64).round() as i32;
  let band_width = (max_shift - min_shift + 9) as usize;

  let stripes = simple_stripes(mean_shift, band_width, ref_size, query_size);

  Ok(SeedAlignmentResult {
    mean_shift,
    band_width,
    stripes,
  })
}

pub fn make_stripes(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  params: &AlignPairwiseParams,
  terminal_bandwidth: i32,
  excess_bandwidth: i32,
) -> Vec<Stripe> {
  let query_size = qry_seq.len() as i32;
  let ref_size = ref_seq.len() as i32;
  let n_seeds = if ref_size > (params.min_seeds * params.seed_spacing) {
    (ref_size as f32 / params.seed_spacing as f32) as i32
  } else {
    params.min_seeds
  };

  let margin = (ref_size as f32 / (n_seeds * 3) as f32).round() as i32;
  let band_width = (((ref_size + query_size) as f32 * 0.5) - 3.0).round() as usize;

  let seed_matches = get_seed_matches(qry_seq, ref_seq, params, n_seeds, margin);

  let mut stripes: Vec<Stripe> = vec![];

  let mut band_width = terminal_bandwidth;
  let mut shift = seed_matches[0].ref_pos as i32 - seed_matches[0].qry_pos as i32;
  // Initial strip -- needs to begin at 0
  stripes.push(Stripe::new(0, clamp(band_width - shift, 0, query_size)));
  println!("shift: {}, bandwidth {}", shift, band_width);

  let mut r: i32 = 0;
  let mut sm: usize = 0;
  while r < ref_size {
    let ref_pos = seed_matches[sm].ref_pos as i32;

    while r < ref_pos {
      let begin = clamp_min(r - shift - band_width, 0);
      let end = clamp(r - shift + band_width, 0, query_size);
      stripes.push(Stripe::new(begin, end));
      r += 1;
    }

    if sm + 1 < seed_matches.len() {
      let old_shift = seed_matches[sm].ref_pos as i32 - seed_matches[sm].qry_pos as i32;
      sm += 1;
      let new_shift = seed_matches[sm].ref_pos as i32 - seed_matches[sm].qry_pos as i32;
      shift = (old_shift + new_shift) / 2;
      band_width = abs(old_shift - new_shift) + excess_bandwidth;
      println!("shift: {}, bandwidth {}", shift, band_width);
    } else {
      let band_width = terminal_bandwidth;
      let shift = seed_matches[sm].ref_pos as i32 - seed_matches[sm].qry_pos as i32;
      while r < ref_size - 1 {
        let begin = clamp(r - shift - band_width, 0, query_size - terminal_bandwidth); // TODO: band_width == terminal_bandwidth?
        let end = clamp(r - shift + band_width, 0, query_size);
        stripes.push(Stripe::new(begin, end));
        r += 1;
      }
      let begin = clamp(r - shift - band_width, 0, query_size - terminal_bandwidth); // TODO: band_width == terminal_bandwidth?
      let end = query_size;
      stripes.push(Stripe::new(begin, end));
    }
  }
  stripes
}
