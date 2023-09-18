use crate::analyze::nuc_sub::NucSub;
use crate::coord::range::NucRefGlobalRange;
use crate::tree::params::TreeBuilderParams;
use crate::tree::tree::DivergenceUnits;

pub struct NucMutsCounted<'a> {
  muts: Vec<&'a NucSub>,
  masked_muts: Vec<&'a NucSub>,
  other_muts: Vec<&'a NucSub>,
  n_muts: usize,
  n_masked_muts: usize,
  n_other_muts: usize,
}

pub fn count_nuc_muts<'a>(nuc_muts: &'a [NucSub], masked_ranges: &[NucRefGlobalRange]) -> NucMutsCounted<'a> {
  // Split away non_acgt mutations
  let (nuc_muts, other_muts): (Vec<_>, Vec<_>) = nuc_muts
    .iter()
    .partition(|m| m.ref_nuc.is_acgt() && m.qry_nuc.is_acgt());

  // Split away masked mutations
  let (masked_muts, muts): (Vec<_>, Vec<_>) = nuc_muts
    .iter()
    .partition(|m| masked_ranges.iter().any(|range| range.contains(m.pos)));

  let n_muts = muts.len();
  let n_masked_muts = masked_muts.len();
  let n_other_muts = other_muts.len();

  NucMutsCounted {
    muts,
    masked_muts,
    other_muts,
    n_muts,
    n_masked_muts,
    n_other_muts,
  }
}

pub fn calculate_branch_length(
  nuc_muts: &[NucSub],
  masked_ranges: &[NucRefGlobalRange],
  divergence_units: DivergenceUnits,
  ref_seq_len: usize,
) -> f64 {
  let NucMutsCounted {
    n_muts,
    n_masked_muts,
    n_other_muts,
    ..
  } = count_nuc_muts(nuc_muts, masked_ranges);

  let mut this_div = n_muts as f64;
  if n_muts == 0 && n_masked_muts + n_other_muts > 0 {
    this_div += 0.5;
  }

  // If divergence is measured per site, divide by the length of reference sequence.
  // The unit of measurement is deduced from what's already is used in the reference tree nodes.
  if DivergenceUnits::NumSubstitutionsPerYearPerSite == divergence_units {
    this_div /= ref_seq_len as f64;
  }

  this_div
}

/// Calculate nuc mut score
pub fn score_nuc_muts(nuc_muts: &[NucSub], masked_ranges: &[NucRefGlobalRange], params: &TreeBuilderParams) -> f64 {
  let NucMutsCounted {
    n_muts,
    n_masked_muts,
    n_other_muts,
    ..
  } = count_nuc_muts(nuc_muts, masked_ranges);
  let mut score = n_muts as f64;
  // modify the score by sub-integer amounts for masked and other mutations. this effectively means
  // scoring is first by n_muts, then by masked_muts, then by other_muts
  if n_masked_muts > 0 {
    // independent of their number, masked nucleotides increase the score by 0.5
    score += 0.5;
  }
  if n_other_muts > 0 {
    // other mutations (mostly to and from gap) by 0.1
    score += 0.1;
  }

  score
}
