use bio::alphabets;
use bio::data_structures::bwt::{bwt, less, Less, Occ, BWT};
use bio::data_structures::fmindex::{BackwardSearchResult, FMIndex, FMIndexable};
use bio::data_structures::suffix_array::{suffix_array, RawSuffixArray};
use bio::io::fasta;
use bio::io::fasta::Records;
use std::fs::File;
use std::io::BufReader;

fn read_fasta(filename: &str) -> Records<BufReader<File>> {
    let path = std::path::Path::new(filename);
    let reader = fasta::Reader::new(File::open(path).unwrap());

    reader.records()
}

struct Index {
    fm_index: FMIndex<BWT, Less, Occ>,
    suffix_array: RawSuffixArray,
}

impl Index {
    /// Creates a new FMindex from a reference sequence
    fn from_sequence(reference: &[u8]) -> Self {
        let alphabet = alphabets::dna::iupac_alphabet();

        let mut reference_owned = reference.to_owned();

        //Need to end the sequence that's indexed with the special/magic character `$`
        //otherwise the index doesn't work
        reference_owned.push(b'$');

        let suffix_array = suffix_array(&reference_owned);
        let burrow_wheeler_transform = bwt(&reference_owned, &suffix_array);
        let less = less(&burrow_wheeler_transform, &alphabet);
        let occ = Occ::new(&burrow_wheeler_transform, 1, &alphabet);
        let fm_index = FMIndex::new(burrow_wheeler_transform, less, occ);

        Self {
            fm_index,
            suffix_array,
        }
    }

    /// Internal function to perform a backward search on the index
    fn backward_search(&self, query: &[u8]) -> BackwardSearchResult {
        self.fm_index.backward_search(query.iter())
    }

    /// Returns the starting indeces of all full matches of the query in the reference
    /// Returns an empty vector if no matches are found
    fn full_matches(&self, query: &[u8]) -> Vec<usize> {
        let backward_search_result = self.backward_search(query);
        match backward_search_result {
            BackwardSearchResult::Complete(suffix_array_interval) => {
                suffix_array_interval.occ(&self.suffix_array)
            }
            _ => Vec::<usize>::new(),
        }
    }

    /// Returns matching index if there is exactly one match, otherwise returns None
    fn single_match(&self, query: &[u8]) -> Option<usize> {
        let matches = self.full_matches(query);
        if matches.len() == 1 {
            Some(matches[0])
        } else {
            None
        }
    }
}

fn main() {
    // let reference_path = "data/reference.fasta";
    // let query_path = "data/query.fasta";
    let reference_path = "data/sc2_reference.fasta";
    let query_path = "data/sc2_query_long.fasta";

    let reference = read_fasta(reference_path).next().unwrap().unwrap();
    let query = read_fasta(query_path);

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

    let q = 10;

    let index = Index::from_sequence(reference.seq());

    for record in query {
        let record = record.expect("Problem parsing sequence");
        println!("Processing sequence: {}", record.id());

        let mut qstart = 0;
        let mut qry_right = 0;

        while qstart < record.seq().len().saturating_sub(q as usize) {
            let seed = &record.seq()[qstart..qstart + q as usize];
            let ref_match = index.single_match(seed);

            // extend matches till first mismatch
            match ref_match {
                Some(match_index) => {
                    // extend backwards
                    let mut ref_left = match_index;
                    let mut qry_left = qstart;
                    let mut mismatches: u32 = 0;
                    loop {
                        if mismatches > 1 || qry_left < qry_right || ref_left == 0 || qry_left == 0
                        {
                            break;
                        }
                        if reference.seq()[ref_left - 1] != record.seq()[qry_left - 1] {
                            mismatches += 1;
                        }
                        ref_left -= 1;
                        qry_left -= 1;
                    }

                    // extend forwards
                    mismatches = 0;
                    let mut ref_right = match_index + q;
                    qry_right = qstart + q;
                    let mut last_mismatch = qry_right;
                    loop {
                        if mismatches > 1
                            || ref_right == reference.seq().len()
                            || qry_right == record.seq().len()
                        {
                            break;
                        }
                        if reference.seq()[ref_right] != record.seq()[qry_right] {
                            mismatches += 1;
                        }
                        // Allow 1 mismatch every 50 bases
                        if qry_right.saturating_sub(last_mismatch) > 50 {
                            mismatches = mismatches.saturating_sub(1);
                            last_mismatch = qry_right;
                        }
                        ref_right += 1;
                        qry_right += 1;
                    }

                    if qry_right - qry_left > 25 {
                        println!(
                            "diff:{:>5} len:{:>7} ref_index:{:>7} qry_index:{:>7}",
                            ref_left as i32 - qry_left as i32,
                            ref_right - ref_left,
                            ref_left,
                            qry_left,
                            // qry_left,
                            // qry_right,
                            // ref_left,
                            // ref_right,
                            // reference.seq()[ref_left..ref_right]
                            //     .iter()
                            //     .map(|&x| x as char)
                            //     .collect::<String>()
                        );
                        qstart = qry_right;
                    }
                    qstart += 1;
                }
                _ => {
                    qstart += 20;
                }
            }
        }
        // Post process matches: join overlapping, remove short ones, remove outliers
        // Design windows based on joined matches, allowing bands, somewhat into the matches where there are gaps
    }
}
