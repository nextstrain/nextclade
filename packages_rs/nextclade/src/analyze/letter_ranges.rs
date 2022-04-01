use crate::io::aa::Aa;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::utils::range::Range;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct LetterRange<L: Letter<L>> {
  pub begin: usize,
  pub end: usize,
  pub letter: L,
}

impl<L: Letter<L>> LetterRange<L> {
  pub fn contains_pos(&self, x: usize) -> bool {
    x >= self.begin && x < self.end
  }
}

impl<L: Letter<L>> LetterRange<L> {
  #[inline]
  pub fn len(&self) -> usize {
    self.end - self.begin
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }

  #[inline]
  pub fn to_range(&self) -> Range {
    Range {
      begin: self.begin,
      end: self.end,
    }
  }
}

pub type NucRange = LetterRange<Nuc>;
pub type AaRange = LetterRange<Aa>;

// Finds contiguous ranges (segments) in the sequence, such that for every character inside every range,
// the predicate function returns true and every range contains only the same letter.
//
// The predicate is a function that takes a character and returns boolean.
//
// For example if predicate returns `true` for characters A and C, this function will find ranges `AAAA` and `CCCCC`,
// but not `ZZZ` or `ACCCAC`.
pub fn find_letter_ranges_by<L: Letter<L>>(seq: &[L], pred: impl Fn(L) -> bool) -> Vec<LetterRange<L>> {
  let len = seq.len();

  let mut result = Vec::<LetterRange<L>>::new();
  let mut i = 0_usize;
  let mut begin = 0_usize;
  let mut found_maybe = Option::<L>::default();
  while i < len {
    let letter = seq[i];

    // Find beginning of a range
    if pred(letter) {
      begin = i;
      found_maybe = Some(letter);
    }

    match found_maybe {
      // If there's a current range we are working on (for which we found a `begin`), extend it
      Some(found) => {
        // Rewind forward until we find a mismatch
        while i < len && seq[i] == found {
          i += 1;
        }

        // We found the end of the current range, so now it's complete
        let end = i;

        // Remember the range
        result.push(LetterRange::<L> { begin, end, letter });

        found_maybe = None;
      }
      None => {
        if i < len {
          i += 1;
        }
      }
    }
  }
  result
}

/// Finds contiguous ranges (segments) consisting of a given nucleotide in the sequence.
pub fn find_letter_ranges<L: Letter<L>>(qry_aln: &[L], letter: L) -> Vec<LetterRange<L>> {
  find_letter_ranges_by(qry_aln, |candidate| candidate == letter)
}
