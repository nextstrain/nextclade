use crate::align::params::AlignPairwiseParamsOptional;
use crate::alphabet::aa::Aa;
use crate::alphabet::nuc::Nuc;
use crate::analyze::pcr_primer_changes::PcrPrimer;
use crate::coord::position::AaRefPosition;
use crate::coord::range::AaRefRange;
use crate::gene::genotype::Genotype;
use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::qc::qc_config::QcConfig;
use crate::run::params_general::NextcladeGeneralParamsOptional;
use crate::tree::params::TreeBuilderParamsOptional;
use crate::utils::boolean::{bool_false, bool_true};
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use std::str::FromStr;
use validator::Validate;

const PATHOGEN_JSON_SCHEMA_VERSION: &str = "3.0.0";

/// Contains external configuration and data specific for a particular pathogen
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VirusProperties {
  pub schema_version: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub attributes: Option<VirusPropertiesAttributes>,
  #[serde(default = "bool_false")]
  pub deprecated: bool,
  #[serde(default = "bool_true")]
  pub enabled: bool,
  #[serde(default = "bool_true")]
  pub experimental: bool,
  pub default_gene: Option<String>,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub gene_order_preference: Vec<String>,
  #[serde(default)]
  pub mut_labels: LabelledMutationsConfig,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub primers: Vec<PcrPrimer>,
  pub qc: Option<QcConfig>,
  pub general_params: Option<NextcladeGeneralParamsOptional>,
  pub alignment_params: Option<AlignPairwiseParamsOptional>,
  pub tree_builder_params: Option<TreeBuilderParamsOptional>,
  pub phenotype_data: Option<Vec<PhenotypeData>>,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub aa_motifs: Vec<AaMotifsDesc>,
  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VirusPropertiesAttribute {
  pub value: String,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub value_friendly: Option<String>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub is_default: Option<bool>,
  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct VirusPropertiesAttributes {
  #[serde(skip_serializing_if = "Option::is_none")]
  pub name: Option<VirusPropertiesAttribute>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub reference: Option<VirusPropertiesAttribute>,
  #[serde(skip_serializing_if = "Option::is_none")]
  pub tag: Option<VirusPropertiesAttribute>,
  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// Associates a genotype (pos, nuc) to a list of labels
pub type LabelMap<L> = BTreeMap<Genotype<L>, Vec<String>>;
pub type NucLabelMap = LabelMap<Nuc>;

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct LabelledMutationsConfig {
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub nuc_mut_label_map: BTreeMap<Genotype<Nuc>, Vec<String>>,
  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeDataIgnore {
  #[serde(default)]
  pub clades: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
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

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeDataEntry {
  pub name: String,
  pub weight: f64,
  pub locations: BTreeMap<AaRefPosition, PhenotypeCoeff>,
}

impl PhenotypeDataEntry {
  pub fn get_coeff(&self, pos: AaRefPosition, aa: Aa) -> f64 {
    self.locations.get(&pos).map_or(0.0, |location| location.get_coeff(aa))
  }
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeData {
  pub name: String,
  pub name_friendly: String,
  pub description: String,
  pub gene: String,
  pub aa_range: AaRefRange,
  #[serde(default)]
  pub ignore: PhenotypeDataIgnore,
  pub data: Vec<PhenotypeDataEntry>,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeAttrDesc {
  pub name: String,
  pub name_friendly: String,
  pub description: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaMotifsDesc {
  pub name: String,
  pub name_short: String,
  pub name_friendly: String,
  pub description: String,
  pub motifs: Vec<String>,

  #[serde(default)]
  pub include_genes: Vec<CountAaMotifsGeneDesc>,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct CountAaMotifsGeneDesc {
  pub gene: String,

  #[serde(default)]
  pub ranges: Vec<AaRefRange>,
}

impl FromStr for VirusProperties {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    json_parse::<VirusProperties>(s)
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
