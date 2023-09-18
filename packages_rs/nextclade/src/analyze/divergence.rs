use crate::analyze::nuc_sub::NucSub;
use crate::coord::range::NucRefGlobalRange;
use crate::tree::params::TreeBuilderParams;
use crate::tree::tree::DivergenceUnits;

// Only consider ACGT characters
pub fn filter_nuc_muts(nuc_muts: &[NucSub]) -> impl Iterator<Item = &NucSub> {
  nuc_muts.iter().filter(|m| m.ref_nuc.is_acgt() && m.qry_nuc.is_acgt())
}

pub struct NucMutsCounted<'a> {
  muts: Vec<&'a NucSub>,
  masked_muts: Vec<&'a NucSub>,
  n_muts: usize,
  n_masked_muts: usize,
}

pub fn count_nuc_muts<'a>(nuc_muts: &'a [NucSub], masked_ranges: &[NucRefGlobalRange]) -> NucMutsCounted<'a> {
  let nuc_muts = filter_nuc_muts(nuc_muts);

  // Split away masked mutations
  let (masked_muts, muts): (Vec<_>, Vec<_>) =
    nuc_muts.partition(|m| masked_ranges.iter().any(|range| range.contains(m.pos)));

  let n_muts = muts.len();
  let n_masked_muts = masked_muts.len();

  NucMutsCounted {
    muts,
    masked_muts,
    n_muts,
    n_masked_muts,
  }
}

pub fn calculate_branch_length(
  nuc_muts: &[NucSub],
  masked_ranges: &[NucRefGlobalRange],
  divergence_units: DivergenceUnits,
  ref_seq_len: usize,
) -> f64 {
  let NucMutsCounted {
    n_muts, n_masked_muts, ..
  } = count_nuc_muts(nuc_muts, masked_ranges);

  let mut this_div = (n_muts + n_masked_muts) as f64;

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
    n_muts, n_masked_muts, ..
  } = count_nuc_muts(nuc_muts, masked_ranges);
  n_muts as f64 + n_masked_muts as f64 * params.masked_muts_weight
}
