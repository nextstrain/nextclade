use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::analyze::nuc_sub::NucSub;
use crate::tree::tree::DivergenceUnits;

pub fn calculate_divergence(
  parent_div: f64,
  private_mutations: &[NucSub],
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) -> f64 {
  // Divergence is just number of substitutions compared to the parent node
  let mut this_div = private_mutations
    .iter()
    .filter(|m| m.ref_nuc != Nuc::GAP && m.qry_nuc != Nuc::GAP && m.qry_nuc != Nuc::N)
    .count() as f64;
  // If divergence is measured per site, divide by the length of reference sequence.
  // The unit of measurement is deduced from what's already is used in the reference tree nodes.
  if &DivergenceUnits::NumSubstitutionsPerYearPerSite == divergence_units {
    this_div /= ref_seq_len as f64;
  }

  parent_div + this_div
}
