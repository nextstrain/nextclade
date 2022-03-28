use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::utils::range::Range;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::str::FromStr;
use validator::Validate;

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QCRulesConfigMissingData {
  pub enabled: bool,
  pub missing_data_threshold: f64,
  pub score_bias: f64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QCRulesConfigMixedSites {
  pub enabled: bool,
  pub mixed_sites_threshold: f64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QCRulesConfigPrivateMutations {
  pub enabled: bool,
  pub weight_reversion_substitutions: f64,
  pub weight_reversion_deletions: f64,
  pub weight_labeled_substitutions: f64,
  pub weight_labeled_deletions: f64,
  pub weight_unlabeled_substitutions: f64,
  pub weight_unlabeled_deletions: f64,
  pub typical: f64,
  pub cutoff: f64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QCRulesConfigSnpClusters {
  pub enabled: bool,
  pub window_size: f64,
  pub cluster_cut_off: f64,
  pub score_weight: f64,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct FrameShiftLocation {
  pub gene_name: String,
  pub codon_range: Range,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QCRulesConfigFrameShifts {
  pub enabled: bool,
  pub ignored_frame_shifts: Vec<FrameShiftLocation>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct StopCodonLocation {
  pub gene_name: String,
  pub codon: usize,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QCRulesConfigStopCodons {
  pub enabled: bool,
  pub ignored_stop_codons: Vec<StopCodonLocation>,
}

#[derive(Debug, Default, Clone, Serialize, Deserialize, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct QcConfig {
  pub schema_version: String,
  pub missing_data: QCRulesConfigMissingData,
  pub mixed_sites: QCRulesConfigMixedSites,
  pub private_mutations: QCRulesConfigPrivateMutations,
  pub snp_clusters: QCRulesConfigSnpClusters,
  pub frame_shifts: QCRulesConfigFrameShifts,
  pub stop_codons: QCRulesConfigStopCodons,
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
