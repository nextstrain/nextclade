use crate::align::band_2d::full_matrix;
use crate::align::band_2d::Stripe;
use crate::align::params::AlignPairwiseParams;
use crate::align::seed_match::seed_match;
use crate::align::seed_match2::{get_seed_matches2, CodonSpacedIndex, SeedMatch2};
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::coord::position::LocalSpace;
use crate::make_error;
use crate::utils::collections::first;
use eyre::Report;
use log::trace;
use num_traits::abs;
use num_traits::clamp;
use num_traits::clamp_min;
use std::cmp::max;
use std::cmp::min;
use std::collections::BTreeMap;

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

fn abs_shift(seed1: &SeedMatch2, seed2: &SeedMatch2) -> isize {
  abs(seed2.offset - seed1.offset)
}

// Function that processes a seed, adds a band, rewind the band vector as necessary
// to accommodate any extended band width implied by look-back-length
struct RewindResult {
  look_back_length: isize,
  current_ref_end: isize,
}
fn extend_and_rewind(
  current_seed: &SeedMatch2,
  current_band: TrapezoidDirectParams,
  bands: &mut Vec<TrapezoidDirectParams>,
  mean_offset: isize,
  look_forward_length: isize,
  look_back_length: isize,
  minimal_bandwidth: isize,
  ref_len: isize,
) -> RewindResult {
  let current_seed_end = (current_seed.ref_pos + current_seed.length) as isize;
  let mut current_band = current_band;
  let mut look_back_length = look_back_length;
  // generate new current trapezoid for the body of the current seed
  let current_seed_end = (current_seed.ref_pos + current_seed.length) as isize;
  if current_seed_end > current_band.ref_end {
    bands.push(current_band);
    current_band = TrapezoidDirectParams {
      ref_start: current_band.ref_end,
      ref_end: current_seed_end,
      min_offset: current_seed.offset - minimal_bandwidth,
      max_offset: current_seed.offset + minimal_bandwidth,
    };
  }
  look_back_length = max(
    max(look_back_length, mean_offset - current_band.min_offset),
    current_band.max_offset - mean_offset,
  );

  // rewind the bands until the ref_start of the last one preceeds the one to add
  while current_band.ref_start > max(0, current_seed_end - look_back_length - 1) {
    current_band = if let Some(tmp_band) = bands.pop() {
      tmp_band
    } else {
      // we rewound all the way to the beginning, add a new terminal
      TrapezoidDirectParams {
        ref_start: 0,
        ref_end: min(current_seed.ref_pos as isize + look_forward_length, ref_len + 1),
        min_offset: current_seed.offset - look_back_length,
        max_offset: current_seed.offset + look_back_length,
      }
    };
    // increase look-back-length to cover absorbed previous bands
    look_back_length = max(
      max(look_back_length, mean_offset - current_band.min_offset),
      current_band.max_offset - mean_offset,
    );
  }
  // terminate previous trapezoid where the new one will start and push unless band is empty
  current_band.ref_end = max(0, current_seed_end - look_back_length);
  if current_band.ref_end > current_band.ref_start {
    bands.push(current_band);
  }
  // return the updated look-back-length and the end of the current band
  RewindResult {
    look_back_length,
    current_ref_end: current_band.ref_end,
  }
}

/// Takes in seed matches and returns a vector of stripes
/// Stripes define the query sequence range for each reference position
pub fn create_alignment_band(
  chain: &[SeedMatch2],
  qry_len: isize,
  ref_len: isize,
  terminal_bandwidth: isize,
  excess_bandwidth: isize,
  minimal_bandwidth: isize,
) -> (Vec<Stripe>, usize) {
  // This function steps through the chained seeds and determines and appropriate band
  // defined via stripes in query coordinates. These bands will later be chopped to reachable ranges

  // the broad idea is the following:
  // pre: deal with a special case the beginning and allow for terminal bandwidth
  // within: for each pair of chained seed (current and next), add a Trapezoid centered at the junction
  //         and a body Trapezoid for next. Extend the gap Trapezoid into the current and next
  // post: deal with the terminal trapezoid and allow of terminal bandwidth

  let mut bands = Vec::<TrapezoidDirectParams>::with_capacity(2 * chain.len() + 2);
  // make initial trapezoid starting at 0 and extending into match by terminal_bandwidth
  let mut current_seed = &chain[0];
  let mut look_back_length = terminal_bandwidth;
  let mut look_forward_length = terminal_bandwidth;
  let mut current_ref_end = min(current_seed.ref_pos as isize + look_forward_length, ref_len + 1);
  let mut current_band = TrapezoidDirectParams {
    ref_start: 0,
    ref_end: current_ref_end,
    min_offset: current_seed.offset - terminal_bandwidth,
    max_offset: current_seed.offset + terminal_bandwidth,
  };

  // loop over remaining seeds in chain
  for next_seed in chain.iter().skip(1) {
    let mean_offset = (next_seed.offset + current_seed.offset) / 2; // offset of gap seed
    let shift = abs_shift(current_seed, next_seed) / 2; // distance from mean offset
    look_forward_length = shift + excess_bandwidth;

    // attempt to add new a band for current_seed, then rewind as necessary to accommodate shift
    RewindResult {
      look_back_length,
      current_ref_end,
    } = extend_and_rewind(
      current_seed,
      current_band,
      &mut bands,
      mean_offset,
      look_forward_length,
      shift + excess_bandwidth,
      minimal_bandwidth,
      ref_len,
    );

    // generate trapezoid for the gap between seeds that goes look-forward-length into the next seed
    current_band = TrapezoidDirectParams {
      ref_start: current_ref_end,
      ref_end: next_seed.ref_pos as isize + look_forward_length,
      min_offset: mean_offset - max(look_back_length, excess_bandwidth),
      max_offset: mean_offset + max(look_back_length, excess_bandwidth),
    };
    current_seed = next_seed;
  }

  // process the final seed (different offset)
  RewindResult {
    look_back_length,
    current_ref_end,
  } = extend_and_rewind(
    current_seed,
    current_band,
    &mut bands,
    current_seed.offset,
    look_forward_length,
    max(terminal_bandwidth, look_back_length),
    minimal_bandwidth,
    ref_len,
  );
  // add band that extends all the way to the end
  current_band = TrapezoidDirectParams {
    ref_start: current_ref_end,
    ref_end: ref_len + 1,
    min_offset: current_seed.offset - look_back_length,
    max_offset: current_seed.offset + look_back_length,
  };
  bands.push(current_band);

  // construct strips from the ordered bands
  let mut stripes = Vec::<Stripe>::with_capacity(ref_len as usize + 1);
  for band in bands {
    for ref_pos in band.ref_start..band.ref_end {
      stripes.push(Stripe {
        begin: (ref_pos + band.min_offset).clamp(0, qry_len - minimal_bandwidth) as usize,
        end: (ref_pos + band.max_offset).clamp(0, qry_len) as usize + 1,
      });
    }
  }
  // write_stripes_to_file(&stripes, "stripes.csv");

  // trim stripes to reachable regions
  regularize_stripes(stripes, qry_len as usize)
}

#[derive(Clone, Copy, Debug)]
struct TrapezoidDirectParams {
  ref_start: isize,
  ref_end: isize,
  min_offset: isize,
  max_offset: isize,
}

/// Chop off unreachable parts of the stripes.
/// Overhanging parts are pruned
fn regularize_stripes(mut stripes: Vec<Stripe>, qry_len: usize) -> (Vec<Stripe>, usize) {
  // assure stripe begin are non-decreasing -- such states would be unreachable in the alignment
  let stripes_len = stripes.len();
  stripes[0].begin = 0;
  for i in 1..stripes_len {
    stripes[i].begin = clamp(stripes[i].begin, stripes[i - 1].begin, qry_len);
  }

  // analogously, assure that strip ends are non-decreasing. this needs to be done in reverse.
  stripes[stripes_len - 1].end = qry_len + 1;
  let mut band_area = stripes[stripes_len - 1].end - stripes[stripes_len - 1].begin;
  for i in (0..(stripes_len - 1)).rev() {
    stripes[i].end = clamp(stripes[i].end, stripes[i].begin + 1, stripes[i + 1].end);
    band_area += stripes[i].end - stripes[i].begin;
  }

  (stripes, band_area)
}

fn trace_stripe_stats(stripes: &[Stripe]) {
  let mut stripe_lengths = Vec::new();
  for stripe in stripes {
    assert!(
      stripe.begin <= stripe.end,
      "Stripe begin must be <= stripe end for stripe {stripe:?}",
    );
    stripe_lengths.push(stripe.end - stripe.begin);
  }
  stripe_lengths.sort_unstable();
  let median = stripe_lengths[stripe_lengths.len() / 2];
  let mean = stripe_lengths.iter().sum::<usize>() as f32 / stripe_lengths.len() as f32;
  let max = stripe_lengths[stripe_lengths.len() - 1];
  let min = stripe_lengths[0];
  trace!("Stripe width stats: min: {min}, max: {max}, mean: {mean:.1}, median: {median}",);
}

fn trace_matches(matches: &[SeedMatch2]) {
  for (i, seed) in matches.iter().enumerate() {
    trace!(
      "Match {}: ref_pos: {}, qry_offset: {}, length: {}",
      i,
      seed.ref_pos,
      -seed.offset,
      seed.length,
    );
  }
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

    let result = create_alignment_band(
      &seed_matches,
      qry_len,
      ref_len,
      terminal_bandwidth,
      excess_bandwidth,
      allowed_mismatches,
    );

    Ok(())
  }
}
