use bio::alignment::pairwise::banded::Aligner;
use bio::alignment::pairwise::{Scoring, MIN_SCORE};
use bio::alignment::sparse::{hash_kmers, HashMapFx};
use bio::utils::TextSlice;

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

pub fn align<'a>(qry_seq: &'a [u8], ref_seq: &'a [u8], ref_kmers_hash: &BioKmerPrehash, params: &NextalignParams) {
  println!("Params: {:#?}", params);

  let scoring = Scoring::new(params.gap_open_score, params.gap_extension_score, &score)
    .xclip_prefix(params.qry_clip_penalty_prefix)
    .xclip_suffix(params.qry_clip_penalty_suffix)
    .yclip_prefix(params.ref_clip_penalty_prefix)
    .yclip_suffix(params.ref_clip_penalty_suffix);

  let mut aligner = Aligner::with_scoring(scoring, params.kmer_size, params.band_size);
  let alignment = aligner.custom_with_prehash(qry_seq, ref_seq, ref_kmers_hash);

  println!("{:#?}", alignment.score);
  println!("{:}", alignment.pretty(qry_seq, ref_seq));
}

fn main() {
  let qry_seq: &[u8] = b"AGCACACGTGTGCGCTATACAGTAAGTAGTAGTACACGTGTCACAGTTGTACTAGCATGAC";
  let ref_seq: &[u8] = b"AGCACACGTGTGCGCTATACAGTACACGTGTCACAGTTGTACTAGCATGAC";

  let params_semiglobal = NextalignParams {
    gap_open_score: -5,
    gap_extension_score: -1,
    kmer_size: 8,
    band_size: 6,
    score_fn: score,

    // Local
    // qry_clip_penalty_prefix: 0,
    // qry_clip_penalty_suffix: 0,
    // ref_clip_penalty_prefix: 0,
    // ref_clip_penalty_suffix: 0,

    // Semiglobal
    qry_clip_penalty_prefix: MIN_SCORE,
    qry_clip_penalty_suffix: MIN_SCORE,
    ref_clip_penalty_prefix: 0,
    ref_clip_penalty_suffix: 0,
    //
    // Global
    // qry_clip_penalty_prefix: MIN_SCORE,
    // qry_clip_penalty_suffix: MIN_SCORE,
    // ref_clip_penalty_prefix: MIN_SCORE,
    // ref_clip_penalty_suffix: MIN_SCORE,
  };

  let ref_kmers_hash = hash_kmers(ref_seq, params_semiglobal.kmer_size);

  align(qry_seq, ref_seq, &ref_kmers_hash, &params_semiglobal);

  println!("Done");
}
