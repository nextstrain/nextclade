use crate::gene::genotype::{Genotype, GenotypeLabeled};
use crate::io::fs::read_file_to_string;
use crate::io::json::parse_json;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use std::str::FromStr;
use validator::Validate;

/// Raw JSON version of the `VirusProperties` struct
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
struct VirusPropertiesRaw {
  schema_version: String,
  nuc_mut_label_map: BTreeMap<String, Vec<String>>,
}

/// Contains external configuration and data specific for a particular pathogen
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VirusProperties {
  schema_version: String,
  nuc_mut_label_maps: MutationLabelMaps<Nuc>,
}

/// External data that contains labels assigned to many mutations
#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct MutationLabelMaps<L: Letter<L>> {
  substitution_label_map: Vec<GenotypeLabeled<L>>,
  deletion_label_map: Vec<GenotypeLabeled<L>>,
}

impl FromStr for VirusProperties {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let raw = parse_json::<VirusPropertiesRaw>(s)?;

    let mut substitution_label_map = Vec::<GenotypeLabeled<Nuc>>::new();
    let mut deletion_label_map = Vec::<GenotypeLabeled<Nuc>>::new();
    for (mut_str, labels) in raw.nuc_mut_label_map {
      let genotype = Genotype::<Nuc>::from_str(&mut_str)?;
      if genotype.qry.is_gap() {
        deletion_label_map.push(GenotypeLabeled { genotype, labels });
      } else {
        substitution_label_map.push(GenotypeLabeled { genotype, labels });
      }
    }

    Ok(Self {
      schema_version: raw.schema_version,
      nuc_mut_label_maps: MutationLabelMaps {
        substitution_label_map,
        deletion_label_map,
      },
    })
  }
}

impl VirusProperties {
  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let data =
      read_file_to_string(filepath).wrap_err_with(|| format!("When reading virus properties file {filepath:#?}"))?;
    Self::from_str(&data).wrap_err_with(|| format!("When parsing virus properties file {filepath:#?}"))
  }
}
