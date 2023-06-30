use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::tree::tree::{AuspiceTreeNode, DivergenceUnits};

pub fn calculate_divergence(
  node: &AuspiceTreeNode,
  private_mutations: &PrivateNucMutations,
  divergence_units: &DivergenceUnits,
  ref_seq_len: usize,
) -> f64 {
  let parent_div = node.node_attrs.div.unwrap_or(0.0);

  // Divergence is just number of substitutions compared to the parent node
  let mut this_div = private_mutations.private_substitutions.len() as f64;

  // If divergence is measured per site, divide by the length of reference sequence.
  // The unit of measurement is deduced from what's already is used in the reference tree nodes.
  if &DivergenceUnits::NumSubstitutionsPerYearPerSite == divergence_units {
    this_div /= ref_seq_len as f64;
  }

  parent_div + this_div
}
