use crate::align::band_2d::full_matrix;
use crate::align::band_2d::Stripe;
use crate::align::params::AlignPairwiseParams;
use crate::align::seed_match::seed_match;
use crate::align::seed_match2::{get_seed_matches2, CodonSpacedIndex, SeedMatch2};
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::make_error;
use crate::utils::collections::first;
use eyre::Report;
use log::debug;
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

fn abs_shift(seed1: &SeedMatch2, seed2: &SeedMatch2) -> usize {
  abs(seed2.offset - seed1.offset) as usize
}

/// Takes in seed matches and returns a vector of stripes
/// Stripes define the query sequence range for each reference position
pub fn create_stripes(
  seed_matches: &[SeedMatch2],
  qry_len: i32,
  ref_len: i32,
  terminal_bandwidth: i32,
  excess_bandwidth: i32,
  max_indel: usize,
  allowed_mismatches: usize,
) -> Result<Vec<Stripe>, Report> {
  // High level idea:
  // 1. Stripes are half-width=allowed_mismatches/2 along the body of the seed matches
  // 2. Between seed matches, stripes are a trapezoid extended along each match with extra
  // half-width=excess_bandwidth
  // 3. Sequence terminal start and end are like body but with extra half-width=terminal_bandwidth
  // 4. To be safe, we don't use the narrow "body-width" for the terminal "allowed_mismatches" + abs(shift to adjacent stripe)
  // of each match, that is, the trapezoid is extended into seed matches by allowed_mimatches

  // Beware: offsets obey
  // qry_pos = ref_pos - offset
  // This is the opposite of the definition of shifts in previous version of create_stripes
  trace_matches(seed_matches);

  let body_bandwidth = (allowed_mismatches + 1) / 2;

  let seed1 = seed_matches.first().unwrap();

  // Add terminal start box
  let mut trapezoids = vec![TrapezoidOffsetParams {
    ref_start: 0,
    ref_end: seed1.ref_pos + allowed_mismatches,
    offset: seed1.offset,
    extra_bandwidth: terminal_bandwidth as usize,
  }
  .to_direct_params()];

  for w in seed_matches.windows(2) {
    let (seed1, seed2) = (w[0], w[1]);
    let abs_shift = abs_shift(&seed1, &seed2);

    // Add body trapezoid
    trapezoids.push(
      TrapezoidOffsetParams {
        ref_start: seed1.ref_pos,
        ref_end: seed1.ref_pos + seed1.length,
        offset: seed1.offset,
        extra_bandwidth: body_bandwidth,
      }
      .to_direct_params(),
    );

    trace!("Absolute shift: {}", abs_shift);

    let previous = trapezoids.last().unwrap();
    let box_start = previous.ref_end.saturating_sub(allowed_mismatches + abs_shift);
    let box_end = seed2.ref_pos + allowed_mismatches + abs_shift;

    // Add gap trapezoid
    trapezoids.push(TrapezoidDirectParams {
      ref_start: box_start,
      ref_end: box_end,
      qry_start: box_start as isize - max(seed1.offset, seed2.offset) - excess_bandwidth as isize,
      qry_end: box_start as isize - min(seed1.offset, seed2.offset) + excess_bandwidth as isize,
    });
  }

  let last_match = seed_matches.last().unwrap();
  // Add last body trapezoid
  trapezoids.push(
    TrapezoidOffsetParams {
      ref_start: last_match.ref_pos,
      ref_end: last_match.ref_pos + last_match.length,
      offset: last_match.offset,
      extra_bandwidth: body_bandwidth,
    }
    .to_direct_params(),
  );

  // Make last gap wider by making extra_bandwidth = terminal_bandwidth
  trapezoids.push(
    TrapezoidOffsetParams {
      ref_start: trapezoids.last().unwrap().ref_end - allowed_mismatches,
      ref_end: ref_len as usize + 1,
      offset: last_match.offset,
      extra_bandwidth: terminal_bandwidth as usize,
    }
    .to_direct_params(),
  );

  // dbg!(&trapezoids);

  // Create stripes from trapezoids
  // map from ref_pos to Vec<Stripe>
  // let multi_stripes:
  let multi_stripes = trapezoids
    .into_iter()
    .fold(BTreeMap::<usize, Vec<Stripe>>::new(), |acc, trapezoid_params| {
      add_direct_trapezoid_stripes(acc, trapezoid_params)
    });

  let mut stripes: Vec<Stripe> = vec![];
  for ref_pos in 0..=ref_len {
    let stripe = match multi_stripes.get(&(ref_pos as usize)) {
      Some(multi_stripe) => Stripe {
        begin: multi_stripe.iter().map(|stripe| stripe.begin).min().unwrap(),
        end: multi_stripe.iter().map(|stripe| stripe.end).max().unwrap(),
      },
      None => Stripe {
        begin: 0,
        end: qry_len as usize + 1,
      },
    };
    stripes.push(stripe);
  }

  // dbg!(&stripes);

  // Iterate over pairs of seeds
  // Need to add a final stripe to seed_matches to ensure that the last stripe is added

  // If debuggin

  // write_stripes_to_file(&stripes, "stripes.csv");
  let regularized_stripes = regularize_stripes(stripes, qry_len as usize);

  // For debugging of stripes and matches:
  #[cfg(debug_assertions)]
  write_stripes_to_file(&regularized_stripes, "stripes.csv");
  #[cfg(debug_assertions)]
  write_matches_to_file(seed_matches, "chained_matches.csv");
  // Usefully visualized using `python scripts/visualize-stripes.py`
  //
  trace_stripe_stats(&regularized_stripes);

  Ok(regularized_stripes)
}

#[derive(Clone, Copy, Debug)]
// Default qry_len is qry_len
struct TrapezoidOffsetParams {
  ref_start: usize,
  ref_end: usize,
  offset: isize,
  extra_bandwidth: usize,
}

#[derive(Clone, Copy, Debug)]
struct TrapezoidDirectParams {
  ref_start: usize,
  ref_end: usize,
  qry_start: isize,
  qry_end: isize,
}

// Implement a function on TrapezoidOffsetParams to convert to TrapezoidDirectParams
impl TrapezoidOffsetParams {
  const fn to_direct_params(self) -> TrapezoidDirectParams {
    TrapezoidDirectParams {
      ref_start: self.ref_start,
      ref_end: self.ref_end,
      qry_start: self.ref_start as isize - self.offset - self.extra_bandwidth as isize,
      qry_end: self.ref_start as isize - self.offset + self.extra_bandwidth as isize,
    }
  }
}

/// Adds trapezoid of stripes from ref_start to ref_end (exclusive)
/// and qry_start to qry_end (exclusive) with safety_margin
fn add_direct_trapezoid_stripes(
  mut stripe_map: BTreeMap<usize, Vec<Stripe>>,
  params: TrapezoidDirectParams,
) -> BTreeMap<usize, Vec<Stripe>> {
  let TrapezoidDirectParams {
    ref_start,
    ref_end,
    qry_start,
    qry_end,
  } = params;
  let mut ref_pos = ref_start;
  let mut qry_pos = qry_start;
  let full_width = qry_end - qry_start;
  assert!(ref_end > ref_start);
  for _ in ref_start..ref_end {
    let stripe = Stripe {
      begin: usize::try_from(qry_pos).unwrap_or(0),
      end: usize::try_from(qry_pos + full_width).unwrap_or(0),
    };
    stripe_map.entry(ref_pos).or_default().push(stripe);
    ref_pos += 1;
    qry_pos += 1;
  }
  stripe_map
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
  debug!("Stripe width stats: min: {min}, max: {max}, mean: {mean:.1}, median: {median}",);
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

#[cfg(debug_assertions)]
fn write_stripes_to_file(stripes: &[Stripe], filename: &str) {
  use std::io::Write;
  let mut file = std::fs::File::create(filename).unwrap();
  writeln!(file, "ref,begin,end").unwrap();
  for (i, stripe) in stripes.iter().enumerate() {
    writeln!(file, "{i},{begin},{end}", begin = stripe.begin, end = stripe.end).unwrap();
  }
}

#[cfg(debug_assertions)]
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
