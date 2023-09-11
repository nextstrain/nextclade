use crate::analyze::nuc_sub::NucSub;
use crate::coord::range::NucRefGlobalRange;
use crate::tree::params::TreeBuilderParams;
use crate::tree::tree::DivergenceUnits;

/// Calculate number of nuc muts, only considering ACGT characters
pub fn count_nuc_muts(nuc_muts: &[NucSub]) -> usize {
  nuc_muts
    .iter()
    .filter(|m| m.ref_nuc.is_acgt() && m.qry_nuc.is_acgt())
    .count()
}

pub fn calculate_branch_length(
  private_mutations: &[NucSub],
  divergence_units: DivergenceUnits,
  ref_seq_len: usize,
) -> f64 {
  let mut this_div = count_nuc_muts(private_mutations) as f64;

  // If divergence is measured per site, divide by the length of reference sequence.
  // The unit of measurement is deduced from what's already is used in the reference tree nodes.
  if DivergenceUnits::NumSubstitutionsPerYearPerSite == divergence_units {
    this_div /= ref_seq_len as f64;
  }

  this_div
}

/// Calculate nuc mut score
pub fn score_nuc_muts(nuc_muts: &[NucSub], masked_ranges: &[NucRefGlobalRange], params: &TreeBuilderParams) -> f64 {
  // Only consider ACGT characters
  let nuc_muts = nuc_muts.iter().filter(|m| m.ref_nuc.is_acgt() && m.qry_nuc.is_acgt());

  // Split away masked mutations
  let (muts, masked_muts): (Vec<_>, Vec<_>) =
    nuc_muts.partition(|m| masked_ranges.iter().any(|range| range.contains(m.pos)));

  let n_muts = muts.iter().count() as f64;
  let n_masked_muts = masked_muts.iter().count() as f64;

  return n_muts + n_masked_muts * params.masked_muts_weight;
}
