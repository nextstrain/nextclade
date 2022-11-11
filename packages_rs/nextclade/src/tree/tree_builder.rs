use crate::analyze::is_sequenced::is_nuc_sequenced;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_sub::NucSub;
use crate::tree::tree::{AuspiceTree, AuspiceTreeNode};
use crate::utils::range::Range;
use crate::utils::nalgebra::DMatrix;

/// Calculates distance metric between two query samples
pub fn calculate_distance(
  qry_nuc_subs_1: &[NucSub],
  qry_missing_1: &[NucRange],
  qry_nuc_subs_2: &[NucSub],
  qry_missing_2: &[NucRange],
  aln_range: &Range,
) -> i64 {
  let mut shared_differences = 0_i64;
  let mut shared_sites = 0_i64;

  let mut i = 0;
  let mut j = 0;
  while (i < qry_nuc_subs_1.len()) && (j < qry_nuc_subs_2.len()) {
    let qmut1 = &qry_nuc_subs_1[i];
    let qmut2 = &qry_nuc_subs_2[i];
    if &qmut1.pos > &qmut2.pos {
      j += 1;
      continue;
    } else if &qmut1.pos < &qmut2.pos {
      i += 1;
      continue;
    }
    // position is also mutated in node
    if qmut1.qry == qmut2.qry {
      shared_differences += 1; // the exact mutation is shared the two sequences
    } else {
      shared_sites += 1; // the same position is mutated, but the states are different
    }
    i += 1;
    j += 1;
  }

  // determine the number of sites that are mutated in one seq but missing in the other.
  // for these we can't tell whether the sequences agree
  let mut undetermined_sites = 0_i64;
  for qmut1 in qry_nuc_subs_1 {
    if !is_nuc_sequenced(qmut1.pos, qry_missing_2, aln_range) {
      undetermined_sites += 1;
    }
  }
  for qmut2 in qry_nuc_subs_2 {
    if !is_nuc_sequenced(qmut2.pos, qry_missing_1, aln_range) {
      undetermined_sites += 1;
    }
  }

  let total_muts_1 = qry_nuc_subs_1.len() as i64;
  let total_muts_2 = qry_nuc_subs_2.len() as i64;

  // calculate distance from set overlaps.
  total_muts_1 + total_muts_2 - 2 * shared_differences - shared_sites - undetermined_sites
}
