use crate::analyze::aa_sub_full::AaSubFull;
use crate::analyze::virus_properties::EscapeData;
use itertools::Itertools;

pub fn calculate_escape(escape_data: &EscapeData, aa_substitutions: &[AaSubFull]) -> f64 {
  let positions = aa_substitutions.iter().filter_map(|AaSubFull { sub, .. }| {
    (sub.gene == escape_data.gene && escape_data.rbd_range.contains(sub.pos)).then(|| sub.pos)
  });

  let mut escape = 0.0;
  for position in positions {
    if let Some(coefficients) = escape_data.coefficients.get(&position) {
      for (antibody, coefficient) in coefficients {
        if let Some(weight) = escape_data.weights.get(antibody) {
          escape += weight * coefficient;
        }
      }
    }
  }

  escape
}
