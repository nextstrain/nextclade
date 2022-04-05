use crate::io::nuc::Nuc;

#[derive(Debug)]
pub struct SeedMatchResult {
  pub ref_pos: usize,
  pub score: usize,
}

/// Find best match in reference sequence, with at most `mismatches_allowed` mismatches.
/// Ambiguous nucleotides in kmer will never match.
/// Kmers never match outside reference terminals.
pub fn seed_match(kmer: &[Nuc], ref_seq: &[Nuc], start_pos: usize, mismatches_allowed: usize) -> SeedMatchResult {
  let ref_len = ref_seq.len();
  let kmer_len = kmer.len();

  let mut tmp_score: usize;
  let mut max_score = 0;
  let mut max_ref_pos = 0;

  let end_pos = ref_len - kmer_len;
  for ref_pos in start_pos..end_pos {
    tmp_score = 0;

    for pos in 0..kmer_len {
      if kmer[pos] == ref_seq[ref_pos + pos] {
        tmp_score += 1;
      }

      // abort as soon as there are more mismatches than allowed
      if tmp_score + mismatches_allowed <= pos {
        break;
      }
    }
    if tmp_score > max_score {
      max_score = tmp_score;
      max_ref_pos = ref_pos;

      // finish asap if perfect match found
      if tmp_score == kmer_len {
        break;
      }
    }
  }

  SeedMatchResult {
    ref_pos: max_ref_pos,
    score: max_score,
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::io::nuc::to_nuc_seq;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  fn seed_match_abort_asap() {
    let ref_seq = to_nuc_seq("AAACCCAAATGAA").unwrap();
    let kmer = to_nuc_seq("ACGA").unwrap();
    let mismatch_allowed = 0;

    let result = seed_match(&kmer, &ref_seq, 0, mismatch_allowed);

    assert_eq!(result.score, 2);
    assert_eq!(result.ref_pos, 2);
  }

  #[rstest]
  fn seed_match_mismatch_tolerated() {
    let ref_seq = to_nuc_seq("ACGCCGACCTCAGTT").unwrap();
    let kmer = to_nuc_seq("CGGT").unwrap();
    let mismatch_allowed = 1;

    let result = seed_match(&kmer, &ref_seq, 0, mismatch_allowed);

    assert_eq!(result.ref_pos, 10);
    assert_eq!(result.score, 3);
  }

  #[rstest]
  fn seed_match_pick_first_perfect_match() {
    let ref_seq = to_nuc_seq("AAACCCAAACCCAAA").unwrap();
    let kmer = to_nuc_seq("CCC").unwrap();
    let mismatch_allowed = 1;

    let result = seed_match(&kmer, &ref_seq, 0, mismatch_allowed);

    assert_eq!(result.score, 3);
    assert_eq!(result.ref_pos, 3);
  }

  #[rstest]
  fn seed_match_find_perfect_match_after_imperfect() {
    let ref_seq = to_nuc_seq("AAAACCAAACCCAAA").unwrap();
    let kmer = to_nuc_seq("CCC").unwrap();
    let mismatch_allowed = 1;

    let result = seed_match(&kmer, &ref_seq, 0, mismatch_allowed);

    assert_eq!(result.score, 3);
    assert_eq!(result.ref_pos, 9);
  }

  #[rstest]
  fn seed_match_accept_amb_and_gaps() {
    let ref_seq = to_nuc_seq("ACGCCGACCTCGGTTAAA").unwrap();
    let kmer = to_nuc_seq("CG-TYW").unwrap();
    let mismatch_allowed = 3;

    let result = seed_match(&kmer, &ref_seq, 0, mismatch_allowed);

    assert_eq!(result.ref_pos, 10);
    assert_eq!(result.score, 3);
  }

  #[rstest]
  fn seed_match_does_not_match_across_terminals() {
    let ref_seq = to_nuc_seq("ACGCCGACCTCGGT").unwrap();
    let kmer = to_nuc_seq("CGTTYW").unwrap();
    let mismatch_allowed = 3;

    let result = seed_match(&kmer, &ref_seq, 0, mismatch_allowed);

    assert_eq!(result.ref_pos, 1);
    assert_eq!(result.score, 2);
  }

  #[rstest]
  fn seed_match_general_case() {
    let ref_seq = to_nuc_seq("ACGCCGACCTCGGTT").unwrap();
    let kmer = to_nuc_seq("CGGT").unwrap();

    let result = seed_match(&kmer, &ref_seq, 0, 1);

    assert_eq!(result.ref_pos, 10);
    assert_eq!(result.score, 4);
  }
}
