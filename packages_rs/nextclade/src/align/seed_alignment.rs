use crate::align::band_2d::{simple_stripes, Stripe};
use crate::align::params::AlignPairwiseParams;
use crate::align::seed_match::seed_match;
use crate::io::letter::Letter;
use crate::make_error;
use eyre::Report;
use log::warn;
use num_traits::{clamp, clamp_max, clamp_min};

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

#[derive(Debug, Clone, Copy)]
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
  let mut seed_matches = Vec::<SeedMatch>::new();

  let map_to_good_positions = get_map_to_good_positions(qry_seq, params.seed_length);
  let n_good_positions = map_to_good_positions.len() as i32;

  // Generate kmers equally spaced on the query
  let seed_cover = n_good_positions - 2 * margin;
  let kmer_spacing = ((seed_cover as f32) - 1.0) / ((n_seeds - 1) as f32);

  // loop over seeds and find matches, store in seed_matches
  let mut start_pos = 0;
  let mut end_pos = ref_seq.len();
  let mut qry_pos = 0;

  for ni in 0..n_seeds {
    let good_position_index = (margin as f32 + (kmer_spacing * ni as f32)).round() as usize;

    let qry_pos_diff = map_to_good_positions[good_position_index] - qry_pos;

    qry_pos += qry_pos_diff;
    end_pos += qry_pos_diff;

    let seed = &qry_seq[qry_pos..(qry_pos + params.seed_length)];
    let tmp_match = seed_match(seed, ref_seq, start_pos, end_pos, params.mismatches_allowed);

    // Only use seeds with at most allowed_mismatches
    if tmp_match.score >= params.seed_length - params.mismatches_allowed {
      if let Some(prev_match) = seed_matches.last() {
        if tmp_match.ref_pos > prev_match.ref_pos {
          start_pos = prev_match.ref_pos;
        } else {
          warn!("Crossed over seed removed. {:?}", prev_match);
          seed_matches.pop();
        }
      }
      let seed_match = SeedMatch {
        qry_pos,
        ref_pos: tmp_match.ref_pos,
        score: tmp_match.score,
      };
      if seed_matches
        .last()
        .map_or(true, |prev_match| prev_match.ref_pos < tmp_match.ref_pos)
      {
        //ensure seed positions increase strictly monotonically
        seed_matches.push(seed_match);
      } else {
        warn!(
          "Seed not used because of identical ref_pos with previous seed: {:?}",
          seed_match
        );
      }
      end_pos = tmp_match.ref_pos + params.max_indel;
    }
  }
  seed_matches
}

pub fn seed_alignment<L: Letter<L>>(
  qry_seq: &[L],
  ref_seq: &[L],
  params: &AlignPairwiseParams,
) -> Result<Vec<Stripe>, Report> {
  let qry_len_u = qry_seq.len();
  let ref_len_u = ref_seq.len();
  let qry_len_i = qry_len_u as i32;
  let ref_len_i = ref_len_u as i32;
  let qry_len_f = qry_len_u as f32;
  let ref_len_f = ref_len_u as f32;

  let n_seeds = if ref_len_i > (params.min_seeds * params.seed_spacing) {
    (ref_len_f / params.seed_spacing as f32) as i32
  } else {
    params.min_seeds
  };

  let margin = (ref_len_f / (n_seeds * 3) as f32).round() as i32;

  // In case of very short sequences
  let band_width = (((ref_len_f + qry_len_f) * 0.5) - 3.0).round() as usize;

  if band_width < (2 * params.seed_length) {
    let mean_shift = ((ref_len_f - qry_len_f) * 0.5).round() as i32;
    let stripes = simple_stripes(mean_shift, band_width, ref_len_u, qry_len_u);

    return Ok(stripes);
  };

  let seed_matches = get_seed_matches(qry_seq, ref_seq, params, n_seeds, margin);

  let num_seed_matches = seed_matches.len();
  if num_seed_matches < 2 {
    return make_error!("Unable to align: no seed matches. Details: num seed matches: {num_seed_matches}");
  }

  // TODO: Pass as parameters
  let terminal_bandwidth: i32 = 50;
  let excess_bandwidth: i32 = 9;
  let stripes = create_stripes(
    &seed_matches,
    qry_len_i,
    ref_len_i,
    terminal_bandwidth,
    excess_bandwidth,
  );

  Ok(stripes)
}

pub fn create_stripes(
  seed_matches: &[SeedMatch],
  qry_len: i32,
  ref_len: i32,
  terminal_bandwidth: i32,
  excess_bandwidth: i32,
) -> Vec<Stripe> {
  let mut seed_matches = seed_matches.to_vec();

  // Discard seed matches right at the terminals of the ref sequence
  if seed_matches[0].ref_pos == 0 {
    seed_matches = seed_matches[1..].to_vec();
  }
  if seed_matches[seed_matches.len() - 1].ref_pos == ref_len as usize - 1 {
    seed_matches = seed_matches[0..(seed_matches.len() - 1)].to_vec();
  }

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
  use rstest::rstest;

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
