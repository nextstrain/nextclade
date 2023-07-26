use crate::alphabet::letter::Letter;
use crate::analyze::nuc_sub::NucSub;
use crate::tree::tree::DivergenceUnits;

pub fn calculate_branch_length(
  private_mutations: &[NucSub],
  divergence_units: DivergenceUnits,
  ref_seq_len: usize,
) -> f64 {
  // divergence is just number of substitutions possibly normalized by ref_seq_len

  // FIXME: this filtering probably should not be here. Private "substitutions" (the parameter name says
  //   `private_mutations`, but outside of this function this is called `private_substitutions`) should not contain
  //   anything that's being filtered out here.
  let mut this_div = private_mutations
    .iter()
    .filter(|m| !m.ref_nuc.is_gap() && m.qry_nuc.is_acgt())
    .count() as f64;

  // If divergence is measured per site, divide by the length of reference sequence.
  // The unit of measurement is deduced from what's already is used in the reference tree nodes.
  if DivergenceUnits::NumSubstitutionsPerYearPerSite == divergence_units {
    this_div /= ref_seq_len as f64;
  }

  this_div
}
