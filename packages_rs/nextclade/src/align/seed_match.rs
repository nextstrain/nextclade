use crate::io::nuc::Nuc;

pub struct SeedMatchResult {
  pub ref_pos: usize,
  pub score: usize,
}

/// Find best match in reference sequence, with at most `mismatches_allowed` mismatches
/// Ambiguous nucleotides in kmer will never match
///
/// # Examples
///
/// ```
/// let ref_seq = nextclade::io::nuc::to_nuc_seq("ACGCCGACCTCGGTT").unwrap();
/// let kmer = nextclade::io::nuc::to_nuc_seq("CGGT").unwrap();
///
/// let result = nextclade::align::seed_match::seed_match(&kmer, &ref_seq, 0, 1);
///
/// assert_eq!(result.ref_pos, 10);
/// assert_eq!(result.score, 4);
/// ```
///
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

      // this speeds up seed-matching by disregarding bad seeds.
      if tmp_score + mismatches_allowed <= pos {
        break;
      }
    }
    if tmp_score > max_score {
      max_score = tmp_score;
      max_ref_pos = ref_pos;

      // if maximal score is reached
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
