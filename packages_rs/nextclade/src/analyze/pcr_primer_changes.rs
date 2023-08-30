use crate::alphabet::nuc::{is_nuc_match, Nuc};
use crate::analyze::nuc_sub::NucSub;
use crate::coord::range::NucRefGlobalRange;
use crate::gene::genotype::Genotype;
use itertools::Itertools;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PcrPrimer {
  pub name: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub source: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub target: Option<String>,
  pub ref_oligonuc: String,
  pub primer_oligonuc: String,
  pub range: NucRefGlobalRange,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub non_acgts: Vec<Genotype<Nuc>>,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PcrPrimerChange {
  pub primer: PcrPrimer,
  pub substitutions: Vec<NucSub>,
}

/// Builds a list of primer changes due to mutations.
/// Each element contains a primer and a list of corresponding substitutions.
pub fn get_pcr_primer_changes(substitutions: &[NucSub], primers: &[PcrPrimer]) -> Vec<PcrPrimerChange> {
  primers
    .iter()
    .filter_map(|primer| get_primer_change_maybe(substitutions, primer))
    .collect_vec()
}

/// Returns a PrimerChange (with mutations) for a given primer, or None if there are no mutations in that primer
fn get_primer_change_maybe(substitutions: &[NucSub], primer: &PcrPrimer) -> Option<PcrPrimerChange> {
  let substitutions_selected = substitutions
    .iter()
    .filter(|sub| should_report_primer_mutation(sub, primer))
    .cloned()
    .collect_vec();

  if substitutions_selected.is_empty() {
    None
  } else {
    Some(PcrPrimerChange {
      primer: primer.clone(),
      substitutions: substitutions_selected,
    })
  }
}

/// Decides whether a given mutation should be reported as mutation causing change in a given PCR primer
fn should_report_primer_mutation(sub: &NucSub, primer: &PcrPrimer) -> bool {
  // Don't report mutation if mutation is outside of the primer range
  if !primer.range.contains(sub.pos) {
    return false;
  }

  // Don't report mutation if primer contains matching ambiguous nucleotide at this position
  return !primer
    .non_acgts
    .iter()
    .any(|non_acgt| non_acgt.pos == sub.pos && is_nuc_match(non_acgt.qry, sub.qry_nuc));
}
