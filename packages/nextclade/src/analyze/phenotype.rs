use crate::analyze::aa_sub::AaSub;
use crate::analyze::virus_properties::{PhenotypeAttrDesc, PhenotypeData, VirusProperties};
use itertools::Itertools;

pub fn calculate_phenotype(phenotype_data: &PhenotypeData, aa_substitutions: &[AaSub]) -> f64 {
  let aa_substitutions = aa_substitutions
    .iter()
    .filter(|sub| (sub.cds_name == phenotype_data.cds && phenotype_data.aa_range.contains(sub.pos)))
    .collect_vec();

  let phenotype: f64 = phenotype_data
    .data
    .iter()
    .map(|phenotype_data| {
      let phenotype_for_antibody: f64 = aa_substitutions
        .iter()
        .map(|AaSub { pos, qry_aa: qry, .. }| phenotype_data.get_coeff(*pos, *qry))
        .sum();
      *phenotype_data.weight * (-phenotype_for_antibody).exp()
    })
    .sum();

  -phenotype.ln()
}

pub fn get_phenotype_attr_descs(virus_properties: &VirusProperties) -> Vec<PhenotypeAttrDesc> {
  virus_properties
    .phenotype_data
    .as_ref()
    .map_or(vec![], |phenotype_data| {
      phenotype_data
        .iter()
        .map(|ph| PhenotypeAttrDesc {
          name: ph.name.clone(),
          name_friendly: ph.name_friendly.clone(),
          description: ph.description.clone(),
        })
        .collect_vec()
    })
}

pub fn get_phenotype_attr_keys(virus_properties: &VirusProperties) -> Vec<String> {
  get_phenotype_attr_descs(virus_properties)
    .iter()
    .map(|ph| ph.name.clone())
    .collect_vec()
}
