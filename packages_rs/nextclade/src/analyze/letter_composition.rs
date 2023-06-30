use crate::alphabet::letter::Letter;
use std::collections::BTreeMap;

/// Counts occurrences of letters in the sequence
pub fn get_letter_composition<L: Letter<L>>(seq: &[L]) -> BTreeMap<L, usize> {
  let mut occurrences = BTreeMap::<L, usize>::new();
  for letter in seq {
    *occurrences.entry(*letter).or_default() += 1;
  }
  occurrences
}
