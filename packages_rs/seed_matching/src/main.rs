#![warn(dead_code, unused_imports, unused_variables, deprecated_in_future)]

use bio::alphabets;
use bio::data_structures::bwt::{bwt, less, Less, Occ, BWT};
use bio::data_structures::fmindex::{BackwardSearchResult, FMIndex, FMIndexable};
use bio::data_structures::suffix_array::{suffix_array, RawSuffixArray};
use bio::io::fasta;
use bio::io::fasta::Records;
use gcollections::ops::*;
use interval::interval_set::*;
use std::collections::{BTreeMap, VecDeque};
use std::fs::File;
use std::io::BufReader;

const REFERENCE_PATH: &str = "data/sc2_reference.fasta";
const QUERY_PATH: &str = "data/sc2_query_long.fasta";

// const REFERENCE_PATH: &str = "/Users/corneliusromer/code/nextclade_data/data/datasets/rsv_a/references/EPI_ISL_412866/versions/2022-12-20T22:00:12Z/files/reference.fasta";
// const QUERY_PATH: &str = "//Users/corneliusromer/code/nextclade_data/data/datasets/rsv_b/references/EPI_ISL_1653999/versions/2022-12-20T22:00:12Z/files/reference.fasta";

const SEED_MATCH_CONFIG: SeedMatchConfig = SeedMatchConfig {
    // Purposefully lax, to allow for some off-target matches
    kmer_length: 10,   // Should not be much larger than 1/divergence of amino acids
    kmer_distance: 10, // Distance between successive kmers
    min_match_length: 40, // Experimentally determined, to keep off-target matches reasonably low
    allowed_mismatches: 8, // Ns count as mismatches
    window_size: 30,
};

fn read_fasta(filename: &str) -> Records<BufReader<File>> {
    let path = std::path::Path::new(filename);
    let reader = fasta::Reader::new(File::open(path).unwrap());

    reader.records()
}

/// Copied from https://stackoverflow.com/a/75084739/7483211
pub struct SkipEvery<I> {
    inner: I,
    every: usize,
    index: usize,
}

impl<I> SkipEvery<I> {
    fn new(inner: I, every: usize) -> Self {
        assert!(every > 1);
        let index = 0;
        Self {
            inner,
            every,
            index,
        }
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

pub trait IteratorSkipEveryExt: Iterator + Sized {
    fn skip_every(self, every: usize) -> SkipEvery<Self> {
        SkipEvery::new(self, every)
    }
}

impl<I: Iterator + Sized> IteratorSkipEveryExt for I {}

struct Index {
    fm_index: FMIndex<BWT, Less, Occ>,
    suffix_array: RawSuffixArray,
}

struct SeedMatchConfig {
    kmer_length: usize,
    kmer_distance: usize,
    min_match_length: usize,
    allowed_mismatches: usize,
    window_size: usize,
}

#[derive(Clone, Copy, Debug, PartialEq, Eq)]
struct SeedMatch {
    ref_index: usize,
    qry_index: usize,
    length: usize,
    offset: isize,
}

impl Index {
    /// Creates a new FMindex from a reference sequence
    fn from_sequence(mut reference: Vec<u8>) -> Self {
        let alphabet = alphabets::dna::iupac_alphabet();

        //Need to end the sequence that's indexed with the special/magic character `$`
        //otherwise the index doesn't work
        // It's wasteful that I need to clone the ref just to append `$` -> issue in bio crate?
        reference.push(b'$');

        let suffix_array = suffix_array(&reference);
        let burrow_wheeler_transform = bwt(&reference, &suffix_array);
        let less = less(&burrow_wheeler_transform, &alphabet);
        let occ = Occ::new(&burrow_wheeler_transform, 1, &alphabet);
        let fm_index = FMIndex::new(burrow_wheeler_transform, less, occ);

        Self {
            fm_index,
            suffix_array,
        }
    }

    /// Returns the starting indeces of all full matches of the query in the reference
    /// Returns an empty vector if no matches are found
    fn full_matches(&self, query: &[u8]) -> Option<Vec<usize>> {
        if query.iter().any(|&x| x == b'N') {
            return None;
        }
        let backward_search_result = self.fm_index.backward_search(query.iter());
        match backward_search_result {
            BackwardSearchResult::Complete(suffix_array_interval) => {
                Some(suffix_array_interval.occ(&self.suffix_array))
            }
            _ => None,
        }
    }
}

impl SeedMatch {
    fn extend_seed(&self, qry_seq: &[u8], ref_seq: &[u8], config: &SeedMatchConfig) -> SeedMatch {
        let SeedMatch {
            mut ref_index,
            mut qry_index,
            mut length,
            ..
        } = self.clone();

        let ref_seq_len = ref_seq.len();
        let qry_seq_len = qry_seq.len();

        let mut mismatch_queue = VecDeque::from(vec![false; config.window_size]);

        let mut forward_mismatches = 0;

        while forward_mismatches < config.allowed_mismatches
            && ref_index + length < ref_seq_len
            && qry_index + length < qry_seq_len
        {
            if mismatch_queue.pop_front().unwrap() {
                forward_mismatches = forward_mismatches.saturating_sub(1);
            }

            if ref_seq[ref_index + length] != qry_seq[qry_index + length] {
                forward_mismatches += 1;
                mismatch_queue.push_back(true);
            } else {
                mismatch_queue.push_back(false);
            }

            length += 1;
        }

        mismatch_queue = VecDeque::from(vec![false; config.window_size]);

        let mut backward_mismatches = 0;

        while backward_mismatches < config.allowed_mismatches && ref_index > 0 && qry_index > 0 {
            if mismatch_queue.pop_front().unwrap() {
                backward_mismatches = backward_mismatches.saturating_sub(1);
            }

            if ref_seq[ref_index - 1] != qry_seq[qry_index - 1] {
                backward_mismatches += 1;
                mismatch_queue.push_back(true);
            } else {
                mismatch_queue.push_back(false);
            }

            ref_index -= 1;
            qry_index -= 1;
            length += 1;
        }

        length = length.saturating_sub(2 * config.window_size);

        SeedMatch {
            ref_index,
            qry_index,
            length,
            offset: self.offset,
        }
    }
}

struct CodonSpacedIndex {
    indexes: [Index; 3],
    ref_seq: Vec<u8>,
}

// every third position of reference

impl CodonSpacedIndex {
    fn from_sequence(reference: Vec<u8>) -> Self {
        // Instead of taking every third, skip every third
        let indexes = [
            Index::from_sequence(reference.iter().skip_every(3).copied().collect()),
            Index::from_sequence(reference.iter().skip(1).skip_every(3).copied().collect()),
            Index::from_sequence(reference.iter().skip(2).skip_every(3).copied().collect()),
        ];

        Self {
            indexes,
            ref_seq: reference,
        }
    }

    /// Returns Index hits in unskipped coordinates
    fn index_matches(&self, qry_seq: &[u8], config: &SeedMatchConfig) -> Vec<SeedMatch> {
        let mut matches = Vec::<SeedMatch>::new();

        let skipped_queries: [Vec<u8>; 3] = [
            qry_seq.iter().skip_every(3).copied().collect(),
            qry_seq.iter().skip(1).skip_every(3).copied().collect(),
            qry_seq.iter().skip(2).skip_every(3).copied().collect(),
        ];

        for (skipped_qry_offset, skipped_qry_seq) in skipped_queries.iter().enumerate() {
            for (skipped_ref_offset, skipped_fm_index) in self.indexes.iter().enumerate() {
                let mut skipped_qry_index = 0;
                while skipped_qry_index + config.kmer_length < skipped_qry_seq.len() {
                    if let Some(skipped_seed_matches) = skipped_fm_index.full_matches(
                        &skipped_qry_seq
                            [skipped_qry_index..(skipped_qry_index + config.kmer_length)],
                    ) {
                        for skipped_ref_index in skipped_seed_matches {
                            let unskipped_qry_index =
                                skipped_qry_index * 3 / 2 + skipped_qry_offset;
                            let unskipped_ref_index =
                                skipped_ref_index * 3 / 2 + skipped_ref_offset;
                            matches.push(SeedMatch {
                                qry_index: unskipped_qry_index,
                                ref_index: unskipped_ref_index,
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
    fn extended_matches(&self, qry_seq: &[u8], config: &SeedMatchConfig) -> Vec<SeedMatch> {
        let index_matches = self.index_matches(qry_seq, config);

        let mut matches = BTreeMap::<isize, IntervalSet<usize>>::new();

        for index_match in index_matches {
            // Check if offset already in matches
            // Check if qry_index within range

            // If match is already in extended range, move on
            if matches.contains_key(&index_match.offset) {
                let good_ranges = matches.get(&index_match.offset).unwrap();
                // Find largest qrypos smaller or equal to index_match.qrypos
                // good_ranges.
                let this_match = vec![(
                    index_match.qry_index,
                    index_match.qry_index + config.kmer_length,
                )]
                .to_interval_set();

                let overlap = this_match.intersection(good_ranges);

                if !overlap.is_empty() {
                    continue;
                }
            }

            let extended_match = index_match.extend_seed(qry_seq, &self.ref_seq, config);

            // Insert extended range into matches map
            // Simple case if there's no good range with this offset yet
            if !matches.contains_key(&index_match.offset) {
                matches.insert(
                    index_match.offset,
                    vec![(
                        extended_match.qry_index,
                        extended_match.qry_index + extended_match.length,
                    )]
                    .to_interval_set(),
                );
            // Get ranges overlapped by extended match
            } else {
                let good_ranges = matches.get(&index_match.offset).unwrap();
                matches.insert(
                    index_match.offset,
                    vec![(
                        extended_match.qry_index,
                        extended_match.qry_index + extended_match.length,
                    )]
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
                    .map(|interval| SeedMatch {
                        qry_index: interval.lower(),
                        ref_index: (interval.lower() as isize + offset) as usize,
                        length: interval.upper() - interval.lower(),
                        offset: *offset,
                    })
                    .collect::<Vec<SeedMatch>>()
            })
            .collect()
    }
}

/// Chain seeds using algorithm in "Algorithms on Strings, Trees and Sequences" by Dan Gusfield, chapter 13.3, page 326, "The two-dimensional chain problem"
/// Right now, overlap leads to exclusivity. We should add matches chopped at overlap start/end points.
/// Input matches are already merged
/// Optional TODO: Use binary search tree instead of vecs
fn chain_seeds(matches: Vec<SeedMatch>) {
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
            qry_pos: match_.qry_index.to_owned(),
            side: EndpointSide::Start,
            j: match_no,
        });
        endpoints.push(Endpoint {
            qry_pos: match_.qry_index + match_.length,
            side: EndpointSide::End,
            j: match_no,
        });
    }
    // dbg!(&endpoints);

    endpoints.sort_by(|a, b| a.qry_pos.cmp(&b.qry_pos));

    // Triplets contains the best possible chains, with decreasing ref_end
    // Small ref_end means more matches can still come after, hence for equal score, this is better
    let mut triplets = Vec::<Triplet>::with_capacity(matches.len());

    for endpoint in endpoints {
        // dbg!(endpoint);
        // if endpoint.side == EndpointSide::End {
        //     dbg!(scores[endpoint.j]);
        // }
        // dbg!(&matches[endpoint.j]);
        // dbg!(&triplets);
        match endpoint.side {
            EndpointSide::Start => {
                // Find first triplet where ref_end is < endpoint.j's ref_index
                // We're looking for the highest scoring chain that we can legally extend with this match

                let (best_chain_score, index) = triplets
                    .as_slice()
                    .into_iter()
                    .filter(|triplet| triplet.ref_end <= matches[endpoint.j].ref_index)
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
                    .into_iter()
                    .filter(|triplet| {
                        triplet.ref_end < matches[endpoint.j].ref_index + matches[endpoint.j].length
                    })
                    .map(|triplet| triplet.score <= scores[endpoint.j])
                    .next()
                    .unwrap_or(true);

                if add_match {
                    let added_triplet = Triplet {
                        ref_end: matches[endpoint.j].ref_index + matches[endpoint.j].length,
                        score: scores[endpoint.j],
                        j: endpoint.j,
                    };
                    triplets.push(added_triplet.clone());
                    // Sort descending by ref_end
                    triplets.sort_by(|b, a| a.ref_end.cmp(&b.ref_end));
                    triplets.retain(|triplet| {
                        triplet.ref_end < added_triplet.ref_end
                            || triplet.score >= added_triplet.score
                    });
                }
            }
        }
    }

    // Reconstruct optimal chain
    let mut optimal_chain = Vec::<SeedMatch>::new();

    let mut chain_end_index = Some(triplets.get(0).unwrap().j);

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

    // dbg!(triplets);
    let mut end = 0;
    let mut penalty = 0;
    for seed in optimal_chain.iter() {
        let gap = seed.qry_index - end;
        penalty += gap * gap;
        println!("Gap: {gap}");
        end = seed.qry_index + seed.length;
        println!("Match: {seed:?}");
    }
    println!("Penalty: {penalty}");
    // println!("{optimal_chain:?}");
}

fn main() {
    // Should be abstracted away for our purposes into a class/structure
    // Allow initialization with one of:
    // - Path of fastas [take first] (for convenience)
    // - vec of u8 chars (interfacing with Nextclade)
    // Save everything internally
    // fn fm_index.full_matches(subsequence) -> vec[int] (indeces of full matches)

    // for logging: fn fm_index.best_matches(subsequence) -> IndexSearchResult::{Complete(vec[starting_indeces],Partial(vec[start,len)),Absent}

    // Optional: Abstraction of groups of 3s, same interface, return index of matches spaced by 3 (0::3::-1,1::3::-1,2::3::-1)
    // Optional: extension around the edges of matches, allow partial mismatches and extend from there - start with accepting only full matches
    // Get chains of matches, need to optimize some loss function through dynamical programming
    // Especially tricky: duplications (like in RSV)

    let reference = read_fasta(REFERENCE_PATH).next().unwrap().unwrap();
    let query = read_fasta(QUERY_PATH);

    let index = CodonSpacedIndex::from_sequence(reference.seq().to_vec());

    for record in query {
        let record = record.expect("Problem parsing sequence");
        println!("Processing sequence: {:?}", record.id());

        let mut matches = index.extended_matches(&record.seq(), &SEED_MATCH_CONFIG);

        assert!(matches.len() > 0);

        // matches = combine_seeds(matches);

        matches = matches
            .into_iter()
            .filter(|m| m.length > SEED_MATCH_CONFIG.min_match_length)
            .collect();

        for seed_match in matches.iter() {
            println!(
                "diff:{:>5} len:{:>7} ref_index:{:>7} qry_index:{:>7}",
                seed_match.ref_index as isize - seed_match.qry_index as isize,
                seed_match.length,
                seed_match.ref_index,
                seed_match.qry_index,
                // qry_left,
                // qry_right,
                // ref_left,
                // ref_right,
                // reference.seq()[ref_left..ref_right]
                //     .iter()
                //     .map(|&x| x as char)
                //     .collect::<String>()
            );
        }

        // println!(
        //     "Covered: {}",
        //     matches.iter().fold(0, |acc, m| acc + m.length)
        // );

        chain_seeds(matches);
        // Post process matches: join overlapping, remove short ones, remove outliers
        // Design windows based on joined matches, allowing bands, somewhat into the matches where there are gaps
    }
}
