use crate::analyze::aa_sub_full::AaSubFull;
use crate::analyze::virus_properties::EscapeData;
use itertools::Itertools;

pub fn calculate_escape(escape_data: &EscapeData, aa_substitutions: &[AaSubFull]) -> f64 {
  let substitutions = aa_substitutions
    .iter()
    .filter_map(|AaSubFull { sub, .. }| {
      (sub.gene == escape_data.gene && escape_data.rbd_range.contains(sub.pos)).then(|| (sub.pos, sub.qry))
    })
    .collect_vec();

  let mut escape = 0.0;
  for (antibody, coefficients) in &escape_data.coefficients {
    if let Some(weight) = escape_data.weights.get(antibody) {
      let mut escape_for_antibody = 0.0;
      for (position, aa) in &substitutions {
        if let Some(coefficients) = escape_data.coefficients.get(antibody) {
          if let Some(coefficient) = coefficients.get(&(position + 1)) {
            if let Some(delta) = coefficient.get(&aa.to_string()) {
              escape_for_antibody += delta;
            }
          }
        }
      }
      escape += weight * (-escape_for_antibody).exp();
    }
  }
  -escape.ln()
}
