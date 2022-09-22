use crate::analyze::aa_changes::AaSub;
use crate::analyze::aa_sub_full::AaSubFull;
use crate::analyze::virus_properties::{EscapeData, EscapeDataEntry};
use itertools::Itertools;
use num_traits::real::Real;

pub fn calculate_escape(escape_data: &EscapeData, aa_substitutions: &[AaSubFull]) -> f64 {
  let aa_substitutions = aa_substitutions
    .iter()
    .filter_map(|AaSubFull { sub, .. }| {
      (sub.gene == escape_data.gene && escape_data.aa_range.contains(sub.pos)).then(|| sub)
    })
    .collect_vec();

  let escape: f64 = escape_data
    .data
    .iter()
    .map(|escape_data| {
      let escape_for_antibody: f64 = aa_substitutions
        .iter()
        .map(|AaSub { pos, qry, .. }| escape_data.get_coeff(*pos, *qry))
        .sum();
      escape_data.weight * (-escape_for_antibody).exp()
    })
    .sum();

  -escape.ln()
}
