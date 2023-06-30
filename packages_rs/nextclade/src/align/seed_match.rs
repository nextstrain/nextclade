use std::cmp;

use crate::io::letter::Letter;

pub struct SeedMatchResult {
  pub ref_pos: usize,
  pub score: usize,
}

pub fn seed_match<L: Letter<L>>(
  kmer: &[L],
  ref_seq: &[L],
  start_pos: usize,
  end_pos: usize,
  mismatches_allowed: usize,
) -> SeedMatchResult {
  let ref_len = ref_seq.len();
  let kmer_len = kmer.len();

  let mut tmp_score: usize;
  let mut max_score = 0;
  let mut max_ref_pos = 0;

  let end_pos = cmp::min(end_pos, ref_len - kmer_len);

  // search from left to right (start_pos to end_pos)
  for ref_pos in start_pos..end_pos {
    tmp_score = 0;

    for pos in 0..kmer_len {
      // IDEA: use is_match if ref/qry are allowed to contain ambiguous characters
      if kmer[pos] == ref_seq[ref_pos + pos] {
        tmp_score += 1;
      }

      // this speeds up seed-matching by disregarding bad seeds.
      let current_mismatches = 1 + pos - tmp_score;
      if current_mismatches > mismatches_allowed {
        break;
      }
    }
    // remember current match if better than previous best match
    if tmp_score > max_score {
      max_score = tmp_score;
      max_ref_pos = ref_pos;

      // Performance: accept semi-optimal within mismatches_allowed to speed up
      // But: Disabled because it fired falsely in certain cases
      // if max_score >= kmer_len - mismatches_allowed {
      //   break;
      // }
      if max_score == kmer_len {
        // Only accept perfect matches
        break;
      }
      // IDEA: count acceptable matches and report back to be able to ignore ambiguous ones
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
  use crate::io::nuc::{from_nuc_seq, to_nuc_seq};
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};

  #[rstest]
  fn test_simple_seed_match() -> Result<(), Report> {
    let kmer = to_nuc_seq("ACG")?;
    let ref_seq = to_nuc_seq("AAAAAAACGAAAAA")?;

    let mismatches_allowed = 0;
    let start_pos = 0;

    let result = seed_match(&kmer, &ref_seq, start_pos, ref_seq.len(), mismatches_allowed);

    assert_eq!(result.ref_pos, 6);
    assert_eq!(result.score, 3);

    Ok(())
  }

  #[rstest]
  fn test_accept_suboptimal_match() -> Result<(), Report> {
    let kmer = to_nuc_seq("ACG")?;
    let ref_seq = to_nuc_seq("AACTGCAA")?;

    let mismatches_allowed = 1;
    let start_pos = 0;

    let result = seed_match(&kmer, &ref_seq, start_pos, ref_seq.len(), mismatches_allowed);

    assert_eq!(result.ref_pos, 1);
    assert_eq!(result.score, 2);

    Ok(())
  }
}
