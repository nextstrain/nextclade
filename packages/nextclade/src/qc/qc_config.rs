use crate::coord::position::AaRefPosition;
use crate::coord::range::AaRefRange;
use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::o;
use eyre::{Report, WrapErr};
use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};
use std::path::Path;
use std::str::FromStr;
use validator::Validate;

/// Configuration for QC rule "missing data"
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "QcRulesConfigMissingData::example")]
pub struct QcRulesConfigMissingData {
  pub enabled: bool,
  pub missing_data_threshold: OrderedFloat<f64>,
  pub score_bias: OrderedFloat<f64>,
}

impl QcRulesConfigMissingData {
  pub const fn example() -> Self {
    Self {
      enabled: true,
      missing_data_threshold: OrderedFloat(100.0),
      score_bias: OrderedFloat(10.0),
    }
  }
}

// Configuration for QC rule "mixed sites"
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "QcRulesConfigMixedSites::example")]
pub struct QcRulesConfigMixedSites {
  pub enabled: bool,
  pub mixed_sites_threshold: usize,
}

impl QcRulesConfigMixedSites {
  pub const fn example() -> Self {
    Self {
      enabled: true,
      mixed_sites_threshold: 4,
    }
  }
}

/// Configuration for QC rule "private mutations"
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "QcRulesConfigPrivateMutations::example")]
pub struct QcRulesConfigPrivateMutations {
  pub enabled: bool,

  #[serde(default = "one")]
  pub weight_reversion_substitutions: OrderedFloat<f64>,

  #[serde(default = "one")]
  pub weight_reversion_deletions: OrderedFloat<f64>,

  #[serde(default = "one")]
  pub weight_labeled_substitutions: OrderedFloat<f64>,

  #[serde(default = "one")]
  pub weight_labeled_deletions: OrderedFloat<f64>,

  #[serde(default = "one")]
  pub weight_unlabeled_substitutions: OrderedFloat<f64>,

  #[serde(default = "one")]
  pub weight_unlabeled_deletions: OrderedFloat<f64>,

  pub typical: OrderedFloat<f64>,
  pub cutoff: OrderedFloat<f64>,
}

impl QcRulesConfigPrivateMutations {
  pub const fn example() -> Self {
    Self {
      enabled: true,
      weight_reversion_substitutions: OrderedFloat(1.0),
      weight_reversion_deletions: OrderedFloat(1.0),
      weight_labeled_substitutions: OrderedFloat(2.0),
      weight_labeled_deletions: OrderedFloat(1.0),
      weight_unlabeled_substitutions: OrderedFloat(1.0),
      weight_unlabeled_deletions: OrderedFloat(1.0),
      typical: OrderedFloat(5.0),
      cutoff: OrderedFloat(15.0),
    }
  }
}

const fn one() -> OrderedFloat<f64> {
  OrderedFloat(1.0)
}

/// Configuration for QC rule "SNP clusters"
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "QcRulesConfigSnpClusters::example")]
pub struct QcRulesConfigSnpClusters {
  pub enabled: bool,
  pub window_size: usize,
  pub cluster_cut_off: usize,
  pub score_weight: OrderedFloat<f64>,
}

impl QcRulesConfigSnpClusters {
  pub const fn example() -> Self {
    Self {
      enabled: true,
      window_size: 100,
      cluster_cut_off: 5,
      score_weight: OrderedFloat(50.0),
    }
  }
}

/// Location of a frame shift in a CDS
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "FrameShiftLocation::example")]
pub struct FrameShiftLocation {
  pub cds_name: String,
  pub codon_range: AaRefRange,
}

impl FrameShiftLocation {
  pub fn example() -> Self {
    Self {
      cds_name: o!("ORF1a"),
      codon_range: AaRefRange::new(AaRefPosition::from(3675), AaRefPosition::from(3675)),
    }
  }
}

/// Configuration for QC rule "frame shifts"
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "QcRulesConfigFrameShifts::example")]
pub struct QcRulesConfigFrameShifts {
  pub enabled: bool,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub ignored_frame_shifts: Vec<FrameShiftLocation>,
  pub score_weight: OrderedFloat<f64>,
}

impl Default for QcRulesConfigFrameShifts {
  fn default() -> Self {
    Self {
      enabled: true,
      ignored_frame_shifts: vec![],
      score_weight: OrderedFloat(75.0),
    }
  }
}

impl QcRulesConfigFrameShifts {
  pub fn example() -> Self {
    Self {
      enabled: true,
      ignored_frame_shifts: vec![FrameShiftLocation::example()],
      score_weight: OrderedFloat(75.0),
    }
  }
}

/// Location of a stop codon in a CDS
#[derive(Debug, Default, Clone, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "StopCodonLocation::example")]
pub struct StopCodonLocation {
  pub cds_name: String,
  pub codon: usize,
}

impl StopCodonLocation {
  pub fn example() -> Self {
    Self {
      cds_name: o!("N"),
      codon: 417,
    }
  }
}

/// Configuration for QC rule "stop codons"
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "QcRulesConfigStopCodons::example")]
pub struct QcRulesConfigStopCodons {
  pub enabled: bool,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub ignored_stop_codons: Vec<StopCodonLocation>,
  pub score_weight: OrderedFloat<f64>,
}

impl Default for QcRulesConfigStopCodons {
  fn default() -> Self {
    Self {
      enabled: true,
      ignored_stop_codons: vec![],
      score_weight: OrderedFloat(75.0),
    }
  }
}

impl QcRulesConfigStopCodons {
  pub fn example() -> Self {
    Self {
      enabled: true,
      ignored_stop_codons: vec![
        StopCodonLocation {
          cds_name: o!("N"),
          codon: 417,
        },
        StopCodonLocation {
          cds_name: o!("ORF3a"),
          codon: 238,
        },
      ],
      score_weight: OrderedFloat(75.0),
    }
  }
}

/// Configuration for QC rules
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
#[schemars(example = "QcConfig::example")]
pub struct QcConfig {
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
    json_parse(s).wrap_err("When parsing QC config")
  }
}

impl QcConfig {
  pub fn example() -> Self {
    Self {
      missing_data: QcRulesConfigMissingData::example(),
      mixed_sites: QcRulesConfigMixedSites::example(),
      private_mutations: QcRulesConfigPrivateMutations::example(),
      snp_clusters: QcRulesConfigSnpClusters::example(),
      frame_shifts: QcRulesConfigFrameShifts::example(),
      stop_codons: QcRulesConfigStopCodons::example(),
    }
  }

  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let data =
      read_file_to_string(filepath).wrap_err_with(|| format!("When reading QC config file {}", filepath.display()))?;
    Self::from_str(&data).wrap_err_with(|| format!("When parsing QC config file {}", filepath.display()))
  }
}
