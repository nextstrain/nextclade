use bio::alphabets;
use bio::data_structures::bwt::{bwt, less, Occ};
use bio::data_structures::fmindex::{BackwardSearchResult, FMIndex, FMIndexable};
use bio::data_structures::suffix_array::suffix_array;
use bio::io::fasta;
use bio::io::fasta::Records;
use std::fs::File;
use std::io::BufReader;

fn read_fasta(filename: &str) -> Records<BufReader<File>> {
    let path = std::path::Path::new(filename);
    let reader = fasta::Reader::new(File::open(path).unwrap());

    reader.records()
}

fn main() {
    // let reference_path = "data/reference.fasta";
    // let query_path = "data/query.fasta";
    let reference_path = "data/sc2_reference.fasta";
    let query_path = "data/sc2_query_long.fasta";

    let reference = read_fasta(reference_path).next().unwrap().unwrap();
    let query = read_fasta(query_path);

    let alphabet = alphabets::dna::iupac_alphabet();

    let mut ref_seq = reference.seq().to_owned();
    ref_seq.push(b'$');

    let sa = suffix_array(&ref_seq);
    let bwt = bwt(&ref_seq, &sa);
    let less = less(&bwt, &alphabet);
    let occ = Occ::new(&bwt, 1, &alphabet);
    let fm = FMIndex::new(&bwt, &less, &occ);

    let q = 10;

    for record in query {
        let record = record.expect("Problem parsing sequence");
        println!("Processing sequence: {}", record.id());

        let mut qstart = 0;
        let mut qry_right = 0;

        while qstart < record.seq().len().saturating_sub(q as usize) {
            let qgram = &record.seq()[qstart..qstart + q as usize];
            let bsr = fm.backward_search(qgram.iter());
            let matches = match bsr {
                BackwardSearchResult::Complete(sai) => sai.occ(&sa),
                BackwardSearchResult::Partial(_, _) => Vec::<usize>::new(),
                BackwardSearchResult::Absent => Vec::<usize>::new(),
            };

            // extend matches till first mismatch
            if matches.len() == 1 {
                // extend backwards
                let mut ref_left = matches[0];
                let mut qry_left = qstart;
                let mut mismatches: u32 = 0;
                loop {
                    if mismatches > 1 || qry_left < qry_right || ref_left == 0 || qry_left == 0 {
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
                let mut ref_right = matches[0] + q;
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
            } else {
                qstart += 20;
            }
        }
        // Post process matches: join overlapping, remove short ones, remove outliers
        // Design windows based on joined matches, allowing bands, somewhat into the matches where there are gaps
    }
}
