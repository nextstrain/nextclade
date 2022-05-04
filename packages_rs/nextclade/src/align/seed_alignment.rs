use crate::align::align::AlignPairwiseParams;
use crate::align::band_2d::simple_stripes;
use crate::align::band_2d::Stripe;
use crate::align::seed_match::seed_match;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::make_error;
use eyre::Report;
use log::trace;
use num_traits::{abs, clamp, clamp_max, clamp_min};

use super::band_2d::Band2d;

fn get_map_to_good_positions<L: Letter<L>>(qry_seq: &[L], seed_length: usize) -> Vec<usize> {
  let qry_len = qry_seq.len();

  let mut map_to_good_positions = Vec::<usize>::with_capacity(qry_len);
  let mut distance_to_last_bad_pos: i32 = 0;

  for (i, letter) in qry_seq.iter().enumerate() {
    // TODO: Exclude ambiguous letters
    if letter.is_unknown() {
      distance_to_last_bad_pos = 0;
    } else if distance_to_last_bad_pos >= seed_length as i32 {
      map_to_good_positions.push(i - seed_length);
    }
    distance_to_last_bad_pos += 1;
  }

  map_to_good_positions
}

#[derive(Debug)]
pub struct SeedMatch {
  pub qry_pos: usize,
  pub ref_pos: usize,
  pub score: usize,
}

pub fn get_seed_matches<L: Letter<L>>(
  qry_seq: &[L],
  ref_seq: &[L],
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

  // TODO: Treat first match differently, to allow long indels at start
  // let mut end_pos = params.max_indel + kmer_spacing.round() as usize;
  for ni in 0..n_seeds {
    let good_position_index = (margin as f32 + (kmer_spacing * ni as f32)).round() as usize;
    let qry_pos = map_to_good_positions[good_position_index];

    let seed = &qry_seq[qry_pos..(qry_pos + params.seed_length)];
    // end_pos is not yet used in seed_match
    let tmp_match = seed_match(seed, ref_seq, start_pos, 0, params.mismatches_allowed);

    // Only use seeds with at most allowed_mismatches
    if tmp_match.score >= params.seed_length - params.mismatches_allowed {
      if let Some(prev_match) = seed_matches.last() {
        if tmp_match.ref_pos > prev_match.ref_pos {
          start_pos = prev_match.ref_pos;
        } else {
          seed_matches.pop();
        }
      }
      seed_matches.push(SeedMatch {
        qry_pos,
        ref_pos: tmp_match.ref_pos,
        score: tmp_match.score,
      });
      // end_pos = tmp_match.ref_pos + params.max_indel + kmer_spacing.round() as usize;
    } else {
      // end_pos += kmer_spacing.round() as usize;
    }
  }
  seed_matches
}

pub fn seed_alignment<L: Letter<L>>(
  qry_seq: &[L],
  ref_seq: &[L],
  params: &AlignPairwiseParams,
) -> Result<Vec<Stripe>, Report> {
  let qry_size = qry_seq.len() as i32;
  let ref_size = ref_seq.len() as i32;
  let n_seeds = if ref_size > (params.min_seeds * params.seed_spacing) {
    (ref_size as f32 / params.seed_spacing as f32) as i32
  } else {
    params.min_seeds
  };

  let margin = (ref_size as f32 / (n_seeds * 3) as f32).round() as i32;

  // In case of very short sequences
  let band_width = (((ref_size + qry_size) as f32 * 0.5) - 3.0).round() as usize;

  if band_width < (2 * params.seed_length) {
    let mean_shift = ((ref_size as f32 - qry_size as f32) * 0.5).round() as i32;
    let stripes = simple_stripes(mean_shift, band_width, ref_size as usize, qry_size as usize);

    return Ok(stripes);
  };

  let seed_matches = get_seed_matches(qry_seq, ref_seq, params, n_seeds, margin);
  dbg!(&seed_matches);

  let num_seed_matches = seed_matches.len();
  if num_seed_matches < 2 {
    return make_error!("Unable to align: no seed matches. Details: num seed matches: {num_seed_matches}");
  }

  // TODO: Pass as parameters
  let terminal_bandwidth: i32 = 50;
  let excess_bandwidth: i32 = 9;
  let stripes = create_stripes(&seed_matches, qry_size, ref_size, terminal_bandwidth, excess_bandwidth);

  Ok(stripes)
}

pub fn create_stripes(
  seed_matches: &[SeedMatch],
  qry_len: i32,
  ref_len: i32,
  terminal_bandwidth: i32,
  excess_bandwidth: i32,
) -> Vec<Stripe> {
  let mut stripes = add_start_stripe(
    seed_matches[0].ref_pos as i32,
    seed_matches[0].qry_pos as i32,
    qry_len,
    terminal_bandwidth,
  );

  for i in 1..seed_matches.len() {
    stripes = add_internal_stripes(
      stripes,
      seed_matches[i - 1].ref_pos as i32,
      seed_matches[i].ref_pos as i32,
      seed_matches[i - 1].qry_pos as i32,
      seed_matches[i].qry_pos as i32,
      qry_len,
      excess_bandwidth,
    );
  }
  stripes = add_end_stripe(
    stripes,
    seed_matches[seed_matches.len() - 1].ref_pos as i32,
    ref_len,
    seed_matches[seed_matches.len() - 1].qry_pos as i32,
    qry_len,
    terminal_bandwidth,
  );

  // stripes = regularize_stripes(stripes);

  stripes
}

fn regularize_stripes(mut stripes: Vec<Stripe>) -> Vec<Stripe> {
  // Chop off unreachable parts of the stripes
  // Overhanging parts are pruned
  let mut max = 0;
  for i in 0..stripes.len() {
    max = clamp_min(max, stripes[i].begin);
    stripes[i].begin = clamp_min(stripes[i].begin, max);
  }

  let mut min = stripes[stripes.len() - 1].end;
  for i in (0..stripes.len()).rev() {
    min = clamp_max(min, stripes[i].end);
    stripes[i].end = clamp_max(stripes[i].end, min);
  }

  stripes
}

fn add_internal_stripes(
  mut stripes: Vec<Stripe>,
  ref_start: i32,
  ref_end: i32,
  qry_start: i32,
  qry_end: i32,
  qry_len: i32,
  bandwidth: i32,
) -> Vec<Stripe> {
  let dq = qry_end - qry_start;
  let dr = ref_end - ref_start;

  let drift = dq - dr;

  // trace!("drift: {} at position: {} with width: {}", drift, ref_start, dr);
  let drift_begin = clamp_max(drift, 0);
  let drift_end = clamp_min(drift, 0);

  for i in 0..(ref_end - ref_start) {
    let center = qry_start + i;
    let begin = clamp(center + drift_begin - bandwidth, qry_start, qry_end);
    let end = clamp(center + drift_end + bandwidth, qry_start + 1, qry_end + 1);
    stripes.push(Stripe::new(begin, end));
  }
  stripes
}

fn add_start_stripe(ref_end: i32, qry_end: i32, qry_len: i32, bandwidth: i32) -> Vec<Stripe> {
  let mut stripes: Vec<Stripe> = vec![];

  let slope = 1;
  let shift = qry_end - ref_end;

  for i in 0..ref_end {
    let center = shift + i;
    let begin = clamp(center - bandwidth, 0, qry_end);
    let end = clamp(center + bandwidth, 1, qry_end + 1);
    let stripe = Stripe::new(begin, end);
    stripes.push(stripe);
  }

  // First stripe needs to go to origin
  stripes[0].begin = 0;

  stripes
}

fn add_end_stripe(
  mut stripes: Vec<Stripe>,
  ref_start: i32,
  ref_len: i32,
  qry_start: i32,
  qry_len: i32,
  bandwidth: i32,
) -> Vec<Stripe> {
  let slope = 1;
  let shift = qry_start - ref_start;

  for i in ref_start..ref_len + 1 {
    let center = shift + i;
    let begin = clamp(center - bandwidth, qry_start, qry_len);
    let end = clamp(center + bandwidth, qry_start + 1, qry_len + 1);
    stripes.push(Stripe::new(begin, end));
  }

  // Last stripe needs to go to terminus
  stripes[ref_len as usize].end = qry_len as usize + 1;

  stripes
}

#[cfg(test)]
mod tests {
  use super::*;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};

  #[rstest]
  fn test_create_stripes_basic() -> Result<(), Report> {
    let mut seed_matches = vec![];
    seed_matches.push(SeedMatch {
      qry_pos: 5,
      ref_pos: 10,
      score: 0,
    });
    seed_matches.push(SeedMatch {
      qry_pos: 20,
      ref_pos: 30,
      score: 0,
    });

    let terminal_bandwidth = 5;
    let excess_bandwidth = 2;
    let qry_len = 30;
    let ref_len = 40;

    let result = create_stripes(&seed_matches, qry_len, ref_len, terminal_bandwidth, excess_bandwidth);

    println!("{:?}", result);

    Ok(())
  }
}
