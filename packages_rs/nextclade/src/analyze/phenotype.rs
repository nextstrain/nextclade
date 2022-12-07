use crate::analyze::aa_changes::AaSub;
use crate::analyze::aa_sub_full::AaSubFull;
use crate::analyze::virus_properties::{PhenotypeAttrDesc, PhenotypeData, VirusProperties};
use itertools::Itertools;
use num_traits::real::Real;

pub fn calculate_phenotype(phenotype_data: &PhenotypeData, aa_substitutions: &[AaSubFull]) -> f64 {
  let aa_substitutions = aa_substitutions
    .iter()
    .filter_map(|AaSubFull { sub, .. }| {
      (sub.gene == phenotype_data.gene && phenotype_data.aa_range.contains(sub.pos)).then_some(sub)
    })
    .collect_vec();

  let phenotype: f64 = phenotype_data
    .data
    .iter()
    .map(|phenotype_data| {
      let phenotype_for_antibody: f64 = aa_substitutions
        .iter()
        .map(|AaSub { pos, qry, .. }| phenotype_data.get_coeff(*pos, *qry))
        .sum();
      phenotype_data.weight * (-phenotype_for_antibody).exp()
    })
    .sum();

  -phenotype.ln()
}

pub fn get_phenotype_attr_descs(virus_properties: &VirusProperties) -> Vec<PhenotypeAttrDesc> {
  let mut descs = virus_properties
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
    });

  if let Some(phenotype_data) = &virus_properties.phenotype_data {
    let binding = phenotype_data.iter().find(|&ph| ph.name.contains("binding"));
    let escape = phenotype_data.iter().find(|&ph| ph.name.contains("escape"));
    if let (Some(binding), Some(escape)) = (binding, escape) {
      descs.push(PhenotypeAttrDesc {
        name: "composite_fitness".to_owned(),
        name_friendly: "Composite fitness".to_owned(),
        description: "".to_owned(),
      });
    }
  }

  descs
}

pub fn get_phenotype_attr_keys(virus_properties: &VirusProperties) -> Vec<String> {
  get_phenotype_attr_descs(virus_properties)
    .iter()
    .map(|ph| ph.name.clone())
    .collect_vec()
}
