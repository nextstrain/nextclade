use bio::alignment::pairwise::banded::Aligner;
use bio::alignment::pairwise::{Scoring, MIN_SCORE};
use bio::alignment::sparse::{hash_kmers, HashMapFx};
use bio::io::fasta;
use bio::io::fasta::FastaRead;
use std::error::Error;

pub type BioKmerPrehash<'a> = HashMapFx<&'a [u8], Vec<u32>>;

#[derive(Debug)]
pub struct NextalignParams {
  ///
  /// ### Substitution scoring parameters
  ///

  /// Scoring function (matrix). Returns the score for substitutions.
  pub score_fn: fn(a: u8, b: u8) -> i32,

  ///
  /// ### Gap scoring parameters
  ///
  /// An affine gap score model is used so that the gap score for a length k is:
  ///   GapScore(k) = gap_open_score + gap_extension_score * k

  /// Score for opening a gap (should not be positive)
  pub gap_open_score: i32,

  /// Score for extending a gap (should not be positive)
  pub gap_extension_score: i32,

  ///
  /// ### Clipping parameters
  ///
  /// Clipping is a special boundary condition where you are allowed to clip off the beginning/end of
  /// the sequence for a fixed penalty. This allows for fine-grained configuration of alignment mode:
  /// global, semiglobal, local.
  ///
  /// The 3 default presets can be configured as follows:
  ///
  ///  Local:
  ///  qry_clip_penalty_prefix: 0,
  ///  qry_clip_penalty_suffix: 0,
  ///  ref_clip_penalty_prefix: 0,
  ///  ref_clip_penalty_suffix: 0,
  ///
  ///  Semiglobal:
  ///  qry_clip_penalty_prefix: MIN_SCORE,
  ///  qry_clip_penalty_suffix: MIN_SCORE,
  ///  ref_clip_penalty_prefix: 0,
  ///  ref_clip_penalty_suffix: 0,
  ///
  ///  Global:
  ///  qry_clip_penalty_prefix: MIN_SCORE,
  ///  qry_clip_penalty_suffix: MIN_SCORE,
  ///  ref_clip_penalty_prefix: MIN_SCORE,
  ///  ref_clip_penalty_suffix: MIN_SCORE,
  ///
  /// where MIN_SCORE is a very large negative number (~0.4 of i32 max)
  ///

  /// Prefix clipping penalty for query (should not be positive)
  pub qry_clip_penalty_prefix: i32,

  /// Suffix clipping penalty for query (should not be positive)
  pub qry_clip_penalty_suffix: i32,

  /// Prefix clipping penalty for reference (should not be positive)
  pub ref_clip_penalty_prefix: i32,

  /// Suffix clipping penalty for reference (should not be positive)
  pub ref_clip_penalty_suffix: i32,

  ///
  /// ### Banded alignment parameters.
  ///

  /// kmer length used in constructing the band
  pub kmer_size: usize,

  /// Width of the band
  pub band_size: usize,
}

pub fn score(a: u8, b: u8) -> i32 {
  // Predefined BLOSUM62 scoring matrix from seqan
  // return blosum62(a, b);

  // Predefined PAM200 scoring matrix from seqan
  // return pam200(a, b);

  // Or custom logic
  if a == b {
    1
  } else {
    -1
  }
}

pub fn read_one_fasta(filepath: &str) -> Result<Vec<u8>, Box<dyn Error>> {
  let mut reader = fasta::Reader::from_file(filepath)?;
  let mut record = fasta::Record::new();
  reader.read(&mut record)?;
  Ok(record.seq().to_owned())
}

fn main() -> Result<(), Box<dyn Error>> {
  let params = NextalignParams {
    gap_open_score: -5,
    gap_extension_score: -1,
    kmer_size: 50,
    band_size: 8,
    score_fn: score,
    qry_clip_penalty_prefix: MIN_SCORE,
    qry_clip_penalty_suffix: MIN_SCORE,
    ref_clip_penalty_prefix: MIN_SCORE,
    ref_clip_penalty_suffix: MIN_SCORE,
  };

  let ref_path = "../../data/sars-cov-2/reference.fasta";
  let qry_path = "../../data/sars-cov-2/sequences.fasta";
  let out_path = "sequences.aligned.fasta";

  println!("Ref   : {}", &ref_path);
  println!("Qry   : {}", &qry_path);
  println!("Out   : {}", &out_path);
  println!("Params:\n{:#?}", &params);

  println!("Reading ref sequence");
  let ref_seq = &read_one_fasta(ref_path)?;

  println!("Hashing kmers");
  let ref_kmers_hash = &hash_kmers(ref_seq, params.kmer_size);

  println!("Creating aligner");
  let scoring = Scoring::new(params.gap_open_score, params.gap_extension_score, &params.score_fn)
    .xclip_prefix(params.qry_clip_penalty_prefix)
    .xclip_suffix(params.qry_clip_penalty_suffix)
    .yclip_prefix(params.ref_clip_penalty_prefix)
    .yclip_suffix(params.ref_clip_penalty_suffix);

  let mut aligner = Aligner::with_scoring(scoring, params.kmer_size, params.band_size);

  println!("Creating readers");
  let mut reader = fasta::Reader::from_file(qry_path)?;
  let mut writer = fasta::Writer::to_file(out_path)?;
  let mut record = fasta::Record::new();

  println!("Starting main loop");
  while let Ok(()) = reader.read(&mut record) {
    if record.is_empty() {
      break;
    }

    println!("Reading  '{}'", &record.id());
    let qry_seq: &[u8] = record.seq();

    println!("Aligning '{}'", &record.id());
    aligner.custom_with_prehash(qry_seq, ref_seq, ref_kmers_hash);

    // println!("{:}", alignment.pretty(qry_seq, ref_seq));
    // let mut alignment_for_display = alignment.clone();
    // alignment_for_display.operations = vec![]; // Too noisy
    // println!("{:#?}", alignment_for_display);

    println!("Writing  '{}'", &record.id());
    writer.write(record.id(), record.desc(), qry_seq)?;
  }

  println!("Done '{}'", &record.id());

  Ok(())
}
