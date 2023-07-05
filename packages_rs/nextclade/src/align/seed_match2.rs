use crate::align::params::AlignPairwiseParams;
use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::{from_nuc_seq, Nuc};
use crate::make_error;
use bio::alphabets;
use bio::data_structures::bwt::{bwt, less, Less, Occ, BWT};
use bio::data_structures::fmindex::{BackwardSearchResult, FMIndex, FMIndexable};
use bio::data_structures::suffix_array::suffix_array;
use eyre::Report;
use gcollections::ops::{Bounded, Intersection, IsEmpty, Union};
use interval::interval_set::{IntervalSet, ToIntervalSet};
use itertools::Itertools;
use std::cmp::min;
use std::collections::{BTreeMap, VecDeque};

/// Copied from https://stackoverflow.com/a/75084739/7483211
struct SkipEvery<I> {
  inner: I,
  every: usize,
  index: usize,
}

impl<I> SkipEvery<I> {
  fn new(inner: I, every: usize) -> Self {
    assert!(every > 1);
    let index = 0;
    Self { inner, every, index }
  }
}

impl<I: Iterator> Iterator for SkipEvery<I> {
  type Item = I::Item;

  fn next(&mut self) -> Option<Self::Item> {
    if self.index == self.every - 1 {
      self.index = 1;
      self.inner.nth(1)
    } else {
      self.index += 1;
      self.inner.next()
    }
  }
}

trait IteratorSkipEveryExt: Iterator + Sized {
  fn skip_every(self, every: usize) -> SkipEvery<Self> {
    SkipEvery::new(self, every)
  }
}

impl<I: Iterator + Sized> IteratorSkipEveryExt for I {}

struct Index {
  fm_index: FMIndex<BWT, Less, Occ>,
  suffix_array: Vec<usize>,
}

impl Index {
  /// Creates a new FM-index from a reference sequence
  fn from_sequence(ref_seq: &[Nuc], offset: usize, step: usize) -> Self {
    // Need to end the sequence that's indexed with the special/magic character `$`
    // otherwise the index doesn't work
    // It's wasteful that I need to clone the ref just to append `$` -> issue in bio crate?
    let mut ref_seq = from_nuc_seq(&ref_seq.iter().skip(offset).skip_every(step).copied().collect_vec());
    ref_seq.push('$');
    let ref_seq = ref_seq.as_bytes();

    let alphabet = alphabets::dna::iupac_alphabet();
    let suffix_array = suffix_array(ref_seq);
    let burrow_wheeler_transform = bwt(ref_seq, &suffix_array);
    let less = less(&burrow_wheeler_transform, &alphabet);
    let occ = Occ::new(&burrow_wheeler_transform, 1, &alphabet);
    let fm_index = FMIndex::new(burrow_wheeler_transform, less, occ);

    Self { fm_index, suffix_array }
  }

  /// Returns the starting indices of all full matches of the query in the reference
  /// Returns an empty vector if no matches are found
  fn full_matches(&self, qry_seq: &[Nuc]) -> Option<Vec<usize>> {
    if qry_seq.iter().any(Nuc::is_unknown) {
      return None;
    }

    let qry_seq = from_nuc_seq(qry_seq);
    let qry_seq = qry_seq.as_bytes();

    let backward_search_result = self.fm_index.backward_search(qry_seq.iter());
    match backward_search_result {
      BackwardSearchResult::Complete(suffix_array_interval) => Some(suffix_array_interval.occ(&self.suffix_array)),
      _ => None,
    }
  }
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct SeedMatch2 {
  pub ref_pos: usize,
  pub qry_pos: usize,
  pub length: usize,
  pub offset: isize,
}

impl SeedMatch2 {
  fn extend_seed<L: Letter<L>>(&self, qry_seq: &[L], ref_seq: &[L], config: &AlignPairwiseParams) -> SeedMatch2 {
    let SeedMatch2 {
      mut ref_pos,
      mut qry_pos,
      mut length,
      ..
    } = self.clone();

    let max_length = min(ref_seq.len() - ref_pos, qry_seq.len() - qry_pos);

    // vector of boolean indicating whether the large window_size position in the
    // extension was matching or not.
    let mut mismatch_queue = VecDeque::from(vec![false; config.window_size]);
    // counter to keep track of total number of mismatches in window
    let mut forward_mismatches = 0;

    while forward_mismatches < config.allowed_mismatches && length < max_length {
      // remove first position in queue, decrement mismatch counter in case of mismatch
      if mismatch_queue.pop_front().unwrap() {
        forward_mismatches = forward_mismatches.saturating_sub(1);
      }

      // determine whether extension is match
      if ref_seq[ref_pos + length] != qry_seq[qry_pos + length] {
        forward_mismatches += 1;
        mismatch_queue.push_back(true);
      } else {
        mismatch_queue.push_back(false);
      }

      length += 1;
    }
    // determine the longest stretch of matches in the window before extension stopped
    // crop the extended seed at the end of the that stretch.
    let mut crop = 0;
    let mut longest_match_stretch = 0;
    let mut current_match_stretch = 0;
    for (pos, &mismatch) in mismatch_queue.iter().enumerate() {
      if mismatch {
        current_match_stretch = 0;
      } else {
        current_match_stretch += 1;
      }
      if current_match_stretch > longest_match_stretch {
        longest_match_stretch = current_match_stretch;
        crop = pos + 1;
      }
    }
    // reduce the length of the seed
    length -= config.window_size - crop;

    // repeat in other direction
    mismatch_queue = VecDeque::from(vec![false; config.window_size]);
    let mut backward_mismatches = 0;
    while backward_mismatches < config.allowed_mismatches && ref_pos > 0 && qry_pos > 0 {
      if mismatch_queue.pop_front().unwrap() {
        backward_mismatches = backward_mismatches.saturating_sub(1);
      }

      if ref_seq[ref_pos - 1] != qry_seq[qry_pos - 1] {
        backward_mismatches += 1;
        mismatch_queue.push_back(true);
      } else {
        mismatch_queue.push_back(false);
      }

      ref_pos -= 1;
      qry_pos -= 1;
      length += 1;
    }

    let mut crop = 0;
    let mut longest_match_stretch = 0;
    let mut current_match_stretch = 0;
    for (pos, &mismatch) in mismatch_queue.iter().enumerate() {
      if mismatch {
        current_match_stretch = 0;
      } else {
        current_match_stretch += 1;
      }
      if current_match_stretch > longest_match_stretch {
        longest_match_stretch = current_match_stretch;
        crop = pos + 1;
      }
    }

    length -= config.window_size - crop;
    ref_pos += config.window_size - crop;
    qry_pos += config.window_size - crop;

    SeedMatch2 {
      ref_pos,
      qry_pos,
      length,
      offset: self.offset,
    }
  }
}

pub struct CodonSpacedIndex {
  indexes: [Index; 3],
}

impl CodonSpacedIndex {
  pub fn from_sequence(ref_seq: &[Nuc]) -> Self {
    // Instead of taking every third, skip every third
    let indexes = [
      Index::from_sequence(ref_seq, 0, 3),
      Index::from_sequence(ref_seq, 1, 3),
      Index::from_sequence(ref_seq, 2, 3),
    ];
    Self { indexes }
  }

  /// Returns Index hits in unskipped coordinates
  fn index_matches(&self, qry_seq: &[Nuc], config: &AlignPairwiseParams) -> Vec<SeedMatch2> {
    let mut matches = Vec::<SeedMatch2>::new();

    let skipped_queries: [Vec<Nuc>; 3] = [
      qry_seq.iter().skip_every(3).copied().collect(),
      qry_seq.iter().skip(1).skip_every(3).copied().collect(),
      qry_seq.iter().skip(2).skip_every(3).copied().collect(),
    ];

    for (skipped_qry_offset, skipped_qry_seq) in skipped_queries.iter().enumerate() {
      for (skipped_ref_offset, skipped_fm_index) in self.indexes.iter().enumerate() {
        let mut skipped_qry_index = 0;
        while skipped_qry_index + config.kmer_length < skipped_qry_seq.len() {
          if let Some(skipped_seed_matches) =
            skipped_fm_index.full_matches(&skipped_qry_seq[skipped_qry_index..(skipped_qry_index + config.kmer_length)])
          {
            for skipped_ref_index in skipped_seed_matches {
              let unskipped_qry_index = skipped_qry_index * 3 / 2 + skipped_qry_offset;
              let unskipped_ref_index = skipped_ref_index * 3 / 2 + skipped_ref_offset;
              matches.push(SeedMatch2 {
                qry_pos: unskipped_qry_index,
                ref_pos: unskipped_ref_index,
                length: 0,
                offset: unskipped_ref_index as isize - unskipped_qry_index as isize,
              });
            }
          }
          skipped_qry_index += config.kmer_distance;
        }
      }
    }
    matches
  }

  /// Returns extended matches for given query sequence in natural coordinates
  fn extended_matches(&self, qry_seq: &[Nuc], ref_seq: &[Nuc], config: &AlignPairwiseParams) -> Vec<SeedMatch2> {
    let index_matches = self.index_matches(qry_seq, config);

    let mut matches = BTreeMap::<isize, IntervalSet<usize>>::new();

    for index_match in index_matches {
      // Check if offset already in matches
      // Check if qry_index within range

      // If match is already in extended range, move on
      if matches.contains_key(&index_match.offset) {
        let good_ranges = &matches[&index_match.offset];
        // Find largest qrypos smaller or equal to index_match.qrypos
        // good_ranges.
        let this_match = vec![(index_match.qry_pos, index_match.qry_pos + config.kmer_length)].to_interval_set();

        let overlap = this_match.intersection(good_ranges);

        if !overlap.is_empty() {
          continue;
        }
      }

      let extended_match = index_match.extend_seed(qry_seq, ref_seq, config);

      // Insert extended range into matches map
      // Simple case if there's no good range with this offset yet
      if !matches.contains_key(&index_match.offset) {
        matches.insert(
          index_match.offset,
          vec![(extended_match.qry_pos, extended_match.qry_pos + extended_match.length)].to_interval_set(),
        );
      // Get ranges overlapped by extended match
      } else {
        let good_ranges = &matches[&index_match.offset];
        matches.insert(
          index_match.offset,
          vec![(extended_match.qry_pos, extended_match.qry_pos + extended_match.length)]
            .to_interval_set()
            .union(good_ranges),
        );
      }
    }

    // Transform to Vec<SeedMatch>
    matches
      .iter()
      .flat_map(|(offset, intervals)| {
        intervals
          .iter()
          .map(|interval| SeedMatch2 {
            qry_pos: interval.lower(),
            ref_pos: (interval.lower() as isize + offset) as usize,
            length: interval.upper() - interval.lower(),
            offset: *offset,
          })
          .collect::<Vec<SeedMatch2>>()
      })
      .collect()
  }
}

/// Chain seeds using algorithm in "Algorithms on Strings, Trees and Sequences" by Dan Gusfield, chapter 13.3, page 326, "The two-dimensional chain problem"
/// Right now, overlap leads to exclusivity. We should add matches chopped at overlap start/end points.
/// Input matches are already merged
/// Optional TODO: Use binary search tree instead of vecs
fn chain_seeds(matches: &[SeedMatch2]) -> Vec<SeedMatch2> {
  #[derive(Clone, Copy, Debug)]
  struct Triplet {
    ref_end: usize,
    score: usize,
    j: usize,
  }

  #[derive(Clone, Copy, Debug, PartialEq, Eq)]
  enum EndpointSide {
    Start,
    End,
  }

  #[derive(Clone, Copy, Debug)]
  struct Endpoint {
    qry_pos: usize,
    side: EndpointSide,
    j: usize,
  }

  // Scores vec maps a particular seed match to optimal score
  let mut scores: Vec<usize> = vec![0; matches.len()];
  // previous_match is used for backtracking
  let mut previous_match: Vec<Option<usize>> = vec![None; matches.len()];

  // Construct endpoint vec
  let mut endpoints = Vec::<Endpoint>::with_capacity(2 * matches.len());
  for (match_no, match_) in matches.iter().enumerate() {
    endpoints.push(Endpoint {
      qry_pos: match_.qry_pos.to_owned(),
      side: EndpointSide::Start,
      j: match_no,
    });
    endpoints.push(Endpoint {
      qry_pos: match_.qry_pos + match_.length,
      side: EndpointSide::End,
      j: match_no,
    });
  }

  endpoints.sort_by(|a, b| a.qry_pos.cmp(&b.qry_pos));

  // Triplets contains the best possible chains, with decreasing ref_end
  // Small ref_end means more matches can still come after, hence for equal score, this is better
  let mut triplets = Vec::<Triplet>::with_capacity(matches.len());

  for endpoint in endpoints {
    match endpoint.side {
      EndpointSide::Start => {
        // Find first triplet where ref_end is < endpoint.j's ref_index
        // We're looking for the highest scoring chain that we can legally extend with this match

        let (best_chain_score, index) = triplets
          .as_slice()
          .iter()
          .filter(|triplet| triplet.ref_end <= matches[endpoint.j].ref_pos)
          .map(|triplet| (triplet.score, Some(triplet.j)))
          .next()
          .unwrap_or((0, None));

        scores[endpoint.j] = matches[endpoint.j].length + best_chain_score;
        previous_match[endpoint.j] = index;
      }
      EndpointSide::End => {
        // Check whether this match is optimal and if so, insert into triplets vec
        // Find last triplet that ends after this match's ref_end as later triplets have superior ref_ends

        // Find out if this seed match is optimal in any sense
        // Only keep triplets that

        // Find out whether this seed match should be used or not
        // Should not be used if there's a triplet with ref_end < this match's ref_end and score >= this match's score
        // or ref_end == this match's ref_end and score > this match's score

        let add_match = triplets
          .as_slice()
          .iter()
          .filter(|triplet| triplet.ref_end < matches[endpoint.j].ref_pos + matches[endpoint.j].length)
          .map(|triplet| triplet.score <= scores[endpoint.j])
          .next()
          .unwrap_or(true);

        if add_match {
          let added_triplet = Triplet {
            ref_end: matches[endpoint.j].ref_pos + matches[endpoint.j].length,
            score: scores[endpoint.j],
            j: endpoint.j,
          };
          triplets.push(added_triplet);
          // Sort descending by ref_end
          triplets.sort_by(|b, a| a.ref_end.cmp(&b.ref_end));
          triplets.retain(|triplet| triplet.ref_end < added_triplet.ref_end || triplet.score >= added_triplet.score);
        }
      }
    }
  }

  // Reconstruct optimal chain
  let mut optimal_chain = Vec::<SeedMatch2>::new();

  let mut chain_end_index = Some(triplets[0].j);

  loop {
    if chain_end_index.is_none() {
      break;
    }
    let index = chain_end_index.unwrap();
    let next_match = matches[index].clone();
    optimal_chain.push(next_match);

    chain_end_index = previous_match[index];
  }
  optimal_chain.reverse();

  optimal_chain
}

pub fn get_seed_matches2(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  seed_index: &CodonSpacedIndex,
  params: &AlignPairwiseParams,
) -> Result<Vec<SeedMatch2>, Report> {
  let matches = seed_index
    .extended_matches(qry_seq, ref_seq, params)
    .into_iter()
    .filter(|m| m.length > params.min_match_length)
    .collect_vec();

  if matches.is_empty() {
    return make_error!(
      "Unable to align: seed alignment was unable to find any matches that were extendable to at least {} nucleotides.",
      params.min_match_length
    );
  }

  let seed_matches = chain_seeds(&matches);

  let sum_of_seed_length: usize = seed_matches.iter().map(|sm| sm.length).sum();
  if (sum_of_seed_length as f64) < ((qry_seq.len() as f64) * params.min_seed_cover) {
    return make_error!(
      "Unable to align: seed alignment covers {:.2}% of the query sequence, which is less than expected {:.2}% \
      (configurable using 'min seed cover' CLI flag or virus property). This is likely due to low quality of the \
      provided sequence, or due to using incorrect reference sequence.",
      100.0 * (sum_of_seed_length as f64) / (qry_seq.len() as f64),
      100.0 * params.min_seed_cover
    );
  }

  Ok(seed_matches)
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::to_nuc_seq;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  fn extends_seed_general_case() -> Result<(), Report> {
    //             0         1         2         3         4         5         6         7         8         9
    //             0123456789012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789
    //                                                     |-------|
    let ref_seq = "CGCATCGCTGATCGTACGATCGTACTGGTACTGCACTCTAAAAAAAAAACGTGCTGACTGCACTGCATTTATACGATTCTCTCTTCCGACTGTCGACTG";
    let qry_seq =    "TCGCTGATCGTACGATCCGTACTGGTACTGCACTCAAAAAAAAAAAGGTGCTGACTGCACTGCATTTATAGATTCTCTCTTCCGACTGTCGA";
    //                                 |----------------------------------------------------|
    //                012345678901234567890123456789012345678901234567890123456789012345678901234567890123456789012
    //                0         1         2         3         4         5         6         7         8         9

    let input    = SeedMatch2 { ref_pos: 40, qry_pos: 37, length: 8, offset: 0 };
    let expected = SeedMatch2 { ref_pos: 20, qry_pos: 17, length: 53, offset: 0 };
    let actual = input.extend_seed(&to_nuc_seq(qry_seq)?, &to_nuc_seq(ref_seq)?, &AlignPairwiseParams::default());

    assert_eq!(expected, actual);
    Ok(())
  }
}
