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

  let stripes = create_stripes(
    &seed_matches,
    qry_len_i,
    ref_len_i,
    params.terminal_bandwidth,
    params.excess_bandwidth,
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

  // Vec shifts contains offsets of each seed match
  let mut shifts = vec![0; seed_matches.len() + 4];

  for i in 0..seed_matches.len() {
    let shift = seed_matches[i].qry_pos as i32 - seed_matches[i].ref_pos as i32;
    shifts[i + 2] = shift;
  }

  // Pad shifts at terminals for robust width determination
  shifts[0] = shifts[2];
  shifts[1] = shifts[2];
  let shifts_len = shifts.len();
  shifts[shifts_len - 2] = shifts[shifts_len - 3];
  shifts[shifts_len - 1] = shifts[shifts_len - 3];

  let mut robust_shifts = Vec::with_capacity(seed_matches.len() + 1);

  // For each stripe segment, consider seed offsets of previous and following segment
  for slice in shifts.windows(4) {
    let min = slice.iter().min().unwrap();
    let max = slice.iter().max().unwrap();
    robust_shifts.push((min, max));
  }

  let mut robust_stripes = Vec::with_capacity(robust_shifts.len());

  // Add start stripes
  robust_stripes = add_robust_stripes(
    robust_stripes,
    0,
    seed_matches[0].ref_pos as i32,
    qry_len,
    robust_shifts[0],
    terminal_bandwidth,
  );

  // Add internal stripes
  for i in 1..robust_shifts.len() - 1 {
    robust_stripes = add_robust_stripes(
      robust_stripes,
      seed_matches[i - 1].ref_pos as i32,
      seed_matches[i].ref_pos as i32,
      qry_len,
      robust_shifts[i],
      excess_bandwidth,
    );
  }

  // Add end stripes
  robust_stripes = add_robust_stripes(
    robust_stripes,
    seed_matches.last().unwrap().ref_pos as i32,
    ref_len + 1,
    qry_len,
    *robust_shifts.last().unwrap(),
    terminal_bandwidth,
  );

  robust_stripes = regularize_stripes(robust_stripes, qry_len as usize);

  robust_stripes
}

/// Chop off unreachable parts of the stripes.
/// Overhanging parts are pruned
fn regularize_stripes(mut stripes: Vec<Stripe>, qry_len: usize) -> Vec<Stripe> {
  stripes[0].begin = 0;
  let mut max = 0;
  for i in 1..stripes.len() {
    max = clamp_min(max, stripes[i].begin);
    stripes[i].begin = clamp(stripes[i].begin, max, qry_len);
  }

  let stripes_len = stripes.len();
  stripes[stripes_len - 1].end = qry_len + 1;
  let mut min = qry_len + 1;
  for i in (0..(stripes.len() - 1)).rev() {
    min = clamp_max(min, stripes[i].end);
    stripes[i].end = clamp(stripes[i].end, 1, min);
  }

  stripes
}

fn add_robust_stripes(
  mut stripes: Vec<Stripe>,
  ref_start: i32,
  ref_end: i32,
  qry_len: i32,
  shift: (&i32, &i32),
  extra_bandwidth: i32,
) -> Vec<Stripe> {
  for i in ref_start..ref_end {
    stripes.push(Stripe::new(
      clamp(i + shift.0 - extra_bandwidth, 0, qry_len),
      clamp(i + shift.1 + extra_bandwidth + 1, 1, qry_len + 1),
    ));
  }
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
