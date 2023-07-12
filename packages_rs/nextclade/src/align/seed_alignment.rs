use crate::align::band_2d::full_matrix;
use crate::align::band_2d::Stripe;
use crate::align::params::AlignPairwiseParams;
use crate::align::seed_match::seed_match;
use crate::align::seed_match2::{get_seed_matches2, CodonSpacedIndex, SeedMatch2};
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::make_error;
use crate::utils::collections::last;
use assert2::__assert2_impl::print;
use eyre::Report;
use itertools::all;
use log::trace;
use num_traits::clamp;

/// generate a vector of query sequence positions that are followed by at least `seed_length`
/// valid characters. Positions in this vector are thus "good" positions to start a query k-mer.
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

/// Determine seed matches between query and reference sequence. will only attempt to
/// match k-mers without ambiguous characters. Search is performed via a left-to-right
/// search starting and the previous valid seed and extending at most to the maximally
/// allowed insertion/deletion (shift) distance.
pub fn get_seed_matches<L: Letter<L>>(
  qry_seq: &[L],
  ref_seq: &[L],
  params: &AlignPairwiseParams,
) -> (Vec<SeedMatch>, i32) {
  let mut seed_matches = Vec::<SeedMatch>::new();

  // get list of valid k-mer start positions
  let map_to_good_positions = get_map_to_good_positions(qry_seq, params.seed_length);
  let n_good_positions = map_to_good_positions.len();
  if n_good_positions < params.seed_length {
    return (seed_matches, 0);
  }

  // use 1/seed_spacing for long sequences, min_seeds otherwise
  let n_seeds = if ref_seq.len() > (params.min_seeds * params.seed_spacing) as usize {
    (ref_seq.len() as f32 / params.seed_spacing as f32) as i32
  } else {
    params.min_seeds
  };

  // distance of first seed from the end of the sequence (third of seed spacing)
  let margin = (ref_seq.len() as f32 / (n_seeds * 3) as f32).round() as i32;

  // Generate kmers equally spaced on the query
  let effective_margin = (margin as f32).min(n_good_positions as f32 / 4.0);
  let seed_cover = n_good_positions as f32 - 2.0 * effective_margin;
  let kmer_spacing = (seed_cover - 1.0) / ((n_seeds - 1) as f32);

  // loop over seeds and find matches, store in seed_matches
  let mut start_pos = 0; // start position of ref search
  let mut end_pos = ref_seq.len(); // end position of ref search
  let qry_pos = 0;

  for ni in 0..n_seeds {
    // pick index of of seed in map
    let good_position_index = (effective_margin + (kmer_spacing * ni as f32)).round() as usize;
    // get new query kmer-position
    let qry_pos_old = qry_pos;
    let qry_pos = map_to_good_positions[good_position_index];
    // increment upper bound for search in reference
    end_pos += qry_pos - qry_pos_old;

    //extract seed and find match
    let seed = &qry_seq[qry_pos..(qry_pos + params.seed_length)];
    let tmp_match = seed_match(seed, ref_seq, start_pos, end_pos, params.mismatches_allowed);

    // Only use seeds with at most allowed_mismatches
    if tmp_match.score >= params.seed_length - params.mismatches_allowed {
      // if this isn't the first match, check that reference position of current match after previous
      // if previous seed matched AFTER current seed, remove previous seed
      if let Some(prev_match) = seed_matches.last() {
        if tmp_match.ref_pos > prev_match.ref_pos {
          start_pos = prev_match.ref_pos;
        } else {
          // warn!("Crossed over seed removed. {:?}", prev_match);
          seed_matches.pop();
        }
      }

      let seed_match = SeedMatch {
        qry_pos,
        ref_pos: tmp_match.ref_pos,
        score: tmp_match.score,
      };

      // check that current seed matches AFTER previous seed (-2 if already triggered above)
      // and add current seed to list of matches
      if seed_matches
        .last()
        .map_or(true, |prev_match| prev_match.ref_pos < tmp_match.ref_pos)
      {
        //ensure seed positions increase strictly monotonically
        seed_matches.push(seed_match);
        // } else {
        //   warn!(
        //     "Seed not used because of identical ref_pos with previous seed: {:?}",
        //     seed_match
        //   );
      }
      // increment the "reference search end-pos" as the current reference + maximally allowed indel
      end_pos = tmp_match.ref_pos + params.max_indel;
    }
  }
  (seed_matches, n_seeds)
}

/// Determine rough positioning of qry to reference sequence by approximate seed matching
/// Returns vector of stripes, that is a band within which the alignment is expected to lie
pub fn seed_alignment(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  seed_index: &CodonSpacedIndex,
  params: &AlignPairwiseParams,
) -> Result<Vec<Stripe>, Report> {
  let qry_len_u = qry_seq.len();
  let ref_len_u = ref_seq.len();
  let qry_len_i = qry_len_u as i32;
  let ref_len_i = ref_len_u as i32;

  if ref_len_u + qry_len_u < (5 * params.seed_length) {
    // for very short sequences, use full square
    let stripes = full_matrix(ref_len_u, qry_len_u);
    trace!("Band construction: Short qry&ref sequence (< 5*seed_length), thus using full matrix");
    Ok(stripes)
  } else {
    // otherwise, determine seed matches roughly regularly spaced along the query sequence
    let seed_matches = get_seed_matches2(qry_seq, ref_seq, seed_index, params)?;
    create_stripes(
      &seed_matches,
      qry_len_i,
      ref_len_i,
      params.terminal_bandwidth,
      params.excess_bandwidth,
      params.max_indel,
      params.allowed_mismatches,
    )
  }
}

/// construct the band in the alignment matrix. this band is organized as "stripes"
/// that define the query sequence range for each reference position
pub fn create_stripes(
  seed_matches: &[SeedMatch2],
  qry_len: i32,
  ref_len: i32,
  terminal_bandwidth: i32,
  excess_bandwidth: i32,
  max_indel: usize,
  allowed_mismatches: usize,
) -> Result<Vec<Stripe>, Report> {
  // Beware: offsets obey
  // qry_pos = ref_pos - offset
  // Hence the use of -offset below
  // This is the opposite of the definition of shifts in previous version of create_stripes

  // Add terminal stripe
  // Start at 0, end at ref_start of first seed
  let mut stripes = Vec::new();

  // Stripe index along ref sequence
  let mut i = 0;

  let first_seed = seed_matches
    .first()
    .expect("No seed matches found, but should have been caught earlier");
  // TODO: Extend to within the seed body, maybe by allowed mismatches
  while i < first_seed.ref_pos + allowed_mismatches {
    stripes.push(Stripe::new(
      clamp(
        i as isize - first_seed.offset - terminal_bandwidth as isize,
        0,
        qry_len as isize,
      ),
      clamp(
        i as isize - first_seed.offset + terminal_bandwidth as isize + 1,
        1,
        qry_len as isize + 1,
      ),
    ));
    i += 1;
  }

  // Iterate over pairs of seeds
  // Need to add a final stripe to seed_matches to ensure that the last stripe is added
  let body_bandwidth = (allowed_mismatches + 1) / 2;
  for seed_match in seed_matches.windows(2) {
    let min = seed_match.iter().map(|x| -x.offset).min().unwrap();
    let max = seed_match.iter().map(|x| -x.offset).max().unwrap();
    let width = max - min;
    // Prevent huge widths, which would require massive amount of memory
    if width as usize > max_indel {
      return make_error!("Unable to align: seed matches suggest large indels or are ambiguous due to duplications. This is likely due to a low quality of the provided sequence, or due to using incorrect reference sequence.");
    }
    // First stripe along the seed body
    i = add_stripes_for_match(
      i,
      &mut stripes,
      &seed_match[0],
      body_bandwidth,
      qry_len,
      min,
      max,
      excess_bandwidth,
      seed_match[1].ref_pos + allowed_mismatches,
    );
  }
  // Introduce last_seed variable
  let last_seed = seed_matches.last().unwrap();

  // Add stripes for last seed
  add_stripes_for_match(
    i,
    &mut stripes,
    last_seed,
    body_bandwidth,
    qry_len,
    -last_seed.offset,
    -last_seed.offset,
    terminal_bandwidth,
    ref_len as usize + 1,
  );

  let robust_stripes = regularize_stripes(stripes, qry_len as usize);

  // For debugging of stripes and matches:
  // write_stripes_to_file(&robust_stripes, "stripes.csv");
  // write_matches_to_file(seed_matches, "matches.csv");
  // Usefully visualized using `python scripts/visualize-stripes.py`
  //
  // print_stripe_stats(&robust_stripes);

  Ok(robust_stripes)
}

fn add_stripes_for_match(
  i: usize,
  stripes: &mut Vec<Stripe>,
  seed_match: &SeedMatch2,
  body_bandwidth: usize,
  qry_len: i32,
  min: isize,
  max: isize,
  excess_bandwidth: i32,
  i_stop: usize,
) -> usize {
  let mut i = i;
  while i < seed_match.ref_pos + seed_match.length - 2 * body_bandwidth {
    stripes.push(Stripe::new(
      clamp(
        i as isize - seed_match.offset - body_bandwidth as isize,
        0,
        qry_len as isize,
      ),
      clamp(
        i as isize - seed_match.offset + body_bandwidth as isize + 1,
        1,
        qry_len as isize + 1,
      ),
    ));
    i += 1;
  }
  // Then stripe the box between seeds
  // while i < seed_match[1].ref_pos + body_bandwidth {
  while i < i_stop {
    stripes.push(Stripe::new(
      clamp(i as isize + min - excess_bandwidth as isize, 0, qry_len as isize),
      clamp(
        i as isize + max + excess_bandwidth as isize + 1,
        1,
        qry_len as isize + 1,
      ),
    ));
    i += 1;
  }
  i
}

fn print_stripe_stats(stripes: &[Stripe]) {
  let mut stripe_lengths = Vec::new();
  for stripe in stripes {
    stripe_lengths.push(stripe.end - stripe.begin);
  }
  stripe_lengths.sort_unstable();
  let median = stripe_lengths[stripe_lengths.len() / 2];
  let mean = stripe_lengths.iter().sum::<usize>() as f32 / stripe_lengths.len() as f32;
  let max = stripe_lengths[stripe_lengths.len() - 1];
  let min = stripe_lengths[0];
  println!("Stripe width stats: min: {min}, max: {max}, mean: {mean:.1}, median: {median}",);
}

fn write_stripes_to_file(stripes: &[Stripe], filename: &str) {
  use std::io::Write;
  let mut file = std::fs::File::create(filename).unwrap();
  writeln!(file, "ref,begin,end").unwrap();
  for (i, stripe) in stripes.iter().enumerate() {
    writeln!(file, "{i},{begin},{end}", begin = stripe.begin, end = stripe.end).unwrap();
  }
}

pub fn write_matches_to_file(matches: &[SeedMatch2], filename: &str) {
  use std::io::Write;
  let mut file = std::fs::File::create(filename).unwrap();
  writeln!(file, "ref_pos,qry_pos,length").unwrap();
  for match_ in matches {
    writeln!(file, "{},{},{}", match_.ref_pos, match_.qry_pos, match_.length).unwrap();
  }
}

/// Chop off unreachable parts of the stripes.
/// Overhanging parts are pruned
fn regularize_stripes(mut stripes: Vec<Stripe>, qry_len: usize) -> Vec<Stripe> {
  // assure stripe begin are non-decreasing -- such states would be unreachable in the alignment
  let stripes_len = stripes.len();
  stripes[0].begin = 0;
  for i in 1..stripes_len {
    stripes[i].begin = clamp(stripes[i].begin, stripes[i - 1].begin, qry_len);
  }

  // analogously, assure that strip ends are non-decreasing. this needs to be done in reverse.
  stripes[stripes_len - 1].end = qry_len + 1;
  for i in (0..(stripes_len - 1)).rev() {
    stripes[i].end = clamp(stripes[i].end, 1, stripes[i + 1].end);
  }

  stripes
}

/// add stripes of constant width between ref_start and ref_stop
/// incrementing the query position along with ref_pos
fn add_robust_stripes(
  mut stripes: Vec<Stripe>,
  ref_start: i32,
  ref_end: i32,
  qry_len: i32,
  shift: (i32, i32),
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
    let seed_matches = vec![
      SeedMatch2 {
        qry_pos: 5,
        ref_pos: 10,
        length: 0,
        offset: 0,
      },
      SeedMatch2 {
        qry_pos: 20,
        ref_pos: 30,
        length: 0,
        offset: 0,
      },
    ];

    let terminal_bandwidth = 5;
    let excess_bandwidth = 2;
    let allowed_mismatches = 2;
    let max_indel = 100;
    let qry_len = 30;
    let ref_len = 40;

    let result = create_stripes(
      &seed_matches,
      qry_len,
      ref_len,
      terminal_bandwidth,
      excess_bandwidth,
      max_indel,
      allowed_mismatches,
    );

    Ok(())
  }
}
