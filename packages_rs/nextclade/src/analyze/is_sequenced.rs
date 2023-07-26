use crate::alphabet::letter::Letter;
use crate::analyze::letter_ranges::{GeneAaRange, NucRange};
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition};
use crate::coord::range::{AaRefRange, NucRefGlobalRange};
use itertools::Itertools;

/// Decides whether a given position in nucleotide sequence is considered "sequenced".
/// The position is considered sequenced if it is not contained in any of the missing regions
/// and if it is within alignment range
pub fn is_nuc_sequenced(pos: NucRefGlobalPosition, qry_missing: &[NucRange], aln_range: &NucRefGlobalRange) -> bool {
  let is_missing = qry_missing.iter().any(|missing| missing.contains_pos(pos));
  let within_alignment = aln_range.contains(pos);
  within_alignment && !is_missing
}

/// Decides whether a given position in nucleotide sequence contains n.
pub fn is_nuc_non_acgtn(pos: NucRefGlobalPosition, non_acgtns: &[NucRange]) -> bool {
  non_acgtns
    .iter()
    .any(|NucRange { range, letter }| range.contains(pos) && !letter.is_gap())
}

/// Decides whether a given position in peptide is considered "sequenced".
/// The position is considered sequenced if it is not contained in any of the unknown of unsequenced regions
pub fn is_aa_sequenced(pos: AaRefPosition, aa_unknowns: &[&GeneAaRange], aa_unsequenced_ranges: &[AaRefRange]) -> bool {
  let is_missing = aa_unknowns.iter().any(|missing| missing.contains_pos(pos));
  let is_unsequenced = aa_unsequenced_ranges
    .iter()
    .any(|unsequenced| unsequenced.contains(pos));
  !is_missing && !is_unsequenced
}
