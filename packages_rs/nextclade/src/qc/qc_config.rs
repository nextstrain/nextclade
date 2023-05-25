use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::utils::range::Range;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::str::FromStr;
use validator::Validate;

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcRulesConfigMissingData {
  pub enabled: bool,
  pub missing_data_threshold: f64,
  pub score_bias: f64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcRulesConfigMixedSites {
  pub enabled: bool,
  pub mixed_sites_threshold: usize,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcRulesConfigPrivateMutations {
  pub enabled: bool,

  #[serde(default = "one")]
  pub weight_reversion_substitutions: f64,

  #[serde(default = "one")]
  pub weight_reversion_deletions: f64,

  #[serde(default = "one")]
  pub weight_labeled_substitutions: f64,

  #[serde(default = "one")]
  pub weight_labeled_deletions: f64,

  #[serde(default = "one")]
  pub weight_unlabeled_substitutions: f64,

  #[serde(default = "one")]
  pub weight_unlabeled_deletions: f64,

  pub typical: f64,
  pub cutoff: f64,
}

const fn one() -> f64 {
  1.0
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcRulesConfigSnpClusters {
  pub enabled: bool,
  pub window_size: usize,
  pub cluster_cut_off: usize,
  pub score_weight: f64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct FrameShiftLocation {
  pub gene_name: String,
  pub codon_range: Range,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcRulesConfigFrameShifts {
  pub enabled: bool,
  pub ignored_frame_shifts: Vec<FrameShiftLocation>,
  pub score_weight: f64,
}

impl Default for QcRulesConfigFrameShifts {
  fn default() -> Self {
    Self {
      enabled: false,
      ignored_frame_shifts: vec![],
      score_weight: 75.0,
    }
  }
}

#[derive(Debug, Default, Clone, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
pub struct StopCodonLocation {
  pub gene_name: String,
  pub codon: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcRulesConfigStopCodons {
  pub enabled: bool,
  pub ignored_stop_codons: Vec<StopCodonLocation>,
  pub score_weight: f64,
}

impl Default for QcRulesConfigStopCodons {
  fn default() -> Self {
    Self {
      enabled: false,
      ignored_stop_codons: vec![],
      score_weight: 75.0,
    }
  }
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcConfig {
  pub schema_version: String,
  pub missing_data: QcRulesConfigMissingData,
  pub mixed_sites: QcRulesConfigMixedSites,
  pub private_mutations: QcRulesConfigPrivateMutations,
  pub snp_clusters: QcRulesConfigSnpClusters,
  pub frame_shifts: QcRulesConfigFrameShifts,
  pub stop_codons: QcRulesConfigStopCodons,
}

impl FromStr for QcConfig {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    json_parse(s)
  }
}

impl QcConfig {
  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let data = read_file_to_string(filepath).wrap_err_with(|| format!("When reading QC config file {filepath:#?}"))?;
    Self::from_str(&data).wrap_err_with(|| format!("When parsing QC config file {filepath:#?}"))
  }
}
