use crate::align::params::AlignPairwiseParamsOptional;
use crate::gene::genotype::Genotype;
use crate::io::aa::Aa;
use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::utils::range::Range;
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
  pub schema_version: String,
  pub alignment_params: Option<AlignPairwiseParamsOptional>,
  pub nuc_mut_label_map: BTreeMap<String, Vec<String>>,
  pub phenotype_data: Option<Vec<PhenotypeData>>,
  #[serde(default = "Vec::new")]
  pub aa_motifs: Vec<AaMotifsDesc>,
  #[serde(default = "Vec::new")]
  pub placement_mask_ranges: Vec<Range>, // 0-based, end-exclusive
}

/// Contains external configuration and data specific for a particular pathogen
#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VirusProperties {
  pub schema_version: String,
  pub alignment_params: Option<AlignPairwiseParamsOptional>,
  pub nuc_mut_label_maps: MutationLabelMaps<Nuc>,
  pub phenotype_data: Option<Vec<PhenotypeData>>,
  #[serde(default = "Vec::new")]
  pub aa_motifs: Vec<AaMotifsDesc>,
  #[serde(default = "Vec::new")]
  pub placement_mask_ranges: Vec<Range>, // 0-based, end-exclusive
}

/// Associates a genotype (pos, nuc) to a list of labels
pub type LabelMap<L> = BTreeMap<Genotype<L>, Vec<String>>;
pub type NucLabelMap = LabelMap<Nuc>;

/// External data that contains labels assigned to many mutations
#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct MutationLabelMaps<L: Letter<L>> {
  pub substitution_label_map: BTreeMap<Genotype<L>, Vec<String>>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeDataIgnore {
  #[serde(default)]
  pub clades: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum PhenotypeCoeff {
  ByPosition(f64),
  ByPositionAndAa(BTreeMap<String, f64>),
  Other(serde_json::Value),
}

impl PhenotypeCoeff {
  pub fn get_coeff(&self, aa: Aa) -> f64 {
    match self {
      PhenotypeCoeff::ByPosition(coeff) => Some(coeff),
      PhenotypeCoeff::ByPositionAndAa(aa_coeff_map) => aa_coeff_map
        .get(&aa.to_string())
        .or_else(|| aa_coeff_map.get("default")),
      PhenotypeCoeff::Other(_) => None,
    }
    .unwrap_or(&0.0)
    .to_owned()
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeDataEntry {
  pub name: String,
  pub weight: f64,
  pub locations: BTreeMap<usize, PhenotypeCoeff>,
}

impl PhenotypeDataEntry {
  pub fn get_coeff(&self, pos: usize, aa: Aa) -> f64 {
    self.locations.get(&pos).map_or(0.0, |location| location.get_coeff(aa))
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeData {
  pub name: String,
  pub name_friendly: String,
  pub description: String,
  pub gene: String,
  pub aa_range: Range,
  #[serde(default)]
  pub ignore: PhenotypeDataIgnore,
  pub data: Vec<PhenotypeDataEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeAttrDesc {
  pub name: String,
  pub name_friendly: String,
  pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaMotifsDesc {
  pub name: String,
  pub name_short: String,
  pub name_friendly: String,
  pub description: String,
  pub motifs: Vec<String>,

  #[serde(default = "Vec::new")]
  pub include_genes: Vec<CountAaMotifsGeneDesc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CountAaMotifsGeneDesc {
  pub gene: String,

  #[serde(default = "Vec::new")]
  pub ranges: Vec<Range>,
}

impl FromStr for VirusProperties {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let raw = json_parse::<VirusPropertiesRaw>(s)?;

    let mut substitution_label_map = NucLabelMap::new();
    for (mut_str, labels) in raw.nuc_mut_label_map {
      let genotype = Genotype::<Nuc>::from_str(&mut_str)?;
      if !genotype.qry.is_gap() {
        substitution_label_map.insert(genotype, labels);
      }
    }

    Ok(Self {
      schema_version: raw.schema_version,
      alignment_params: raw.alignment_params,
      nuc_mut_label_maps: MutationLabelMaps { substitution_label_map },
      phenotype_data: raw.phenotype_data,
      aa_motifs: raw.aa_motifs,
      placement_mask_ranges: raw.placement_mask_ranges,
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
