use crate::analyze::letter_ranges::{GeneAaRange, NucRange};
use crate::utils::range::Range;
use itertools::Itertools;

/// Decides whether a given position in nucleotide sequence is considered "sequenced".
/// The position is considered sequenced if it is not contained in any of the missing regions
/// and if it is within alignment range
pub fn is_nuc_sequenced(pos: usize, qry_missing: &[NucRange], aln_range: &Range) -> bool {
  let is_missing = qry_missing.iter().any(|missing| missing.contains_pos(pos));
  let within_alignment = aln_range.contains(pos);
  within_alignment && !is_missing
}

/// Decides whether a given position in peptide is considered "sequenced".
/// The position is considered sequenced if it is not contained in any of the unknown regions
pub fn is_aa_sequenced(pos: usize, aa_unknowns: &[&GeneAaRange]) -> bool {
  let is_missing = aa_unknowns.iter().any(|missing| missing.contains_pos(pos));
  !is_missing
}
