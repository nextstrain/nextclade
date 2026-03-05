use crate::alphabet::nuc::Nuc;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::qc::qc_config::QcConfig;
use crate::qc::qc_rule_frame_shifts::{QcResultFrameShifts, rule_frame_shifts};
use crate::qc::qc_rule_missing_data::{QcResultMissingData, rule_missing_data};
use crate::qc::qc_rule_mixed_sites::{QcResultMixedSites, rule_mixed_sites};
use crate::qc::qc_rule_private_mutations::{QcResultPrivateMutations, rule_private_mutations};
use crate::qc::qc_rule_snp_clusters::{QcResultSnpClusters, rule_snp_clusters};
use crate::qc::qc_rule_stop_codons::{QcResultStopCodons, rule_stop_codons};
use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::Translation;
use num::traits::Pow;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

/// Overall quality category derived from a numeric QC score.
///
/// Thresholds: 0-29 = Good, 30-99 = Mediocre, 100+ = Bad.
#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum QcStatus {
  /// Score below 30, no quality concerns
  #[default]
  Good,
  /// Score 30-99, warrants closer examination
  Mediocre,
  /// Score 100 or above, likely problematic
  Bad,
}

impl std::fmt::Display for QcStatus {
  fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
    match self {
      QcStatus::Good => write!(f, "good"),
      QcStatus::Mediocre => write!(f, "mediocre"),
      QcStatus::Bad => write!(f, "bad"),
    }
  }
}

impl QcStatus {
  pub fn from_score(score: f64) -> QcStatus {
    if (30.0..100.0).contains(&score) {
      QcStatus::Mediocre
    } else if score >= 100.0 {
      QcStatus::Bad
    } else {
      QcStatus::Good
    }
  }
}

/// Aggregated quality control results for a single query sequence.
///
/// Each individual rule is `None` when disabled in the dataset configuration. The overall score
/// is a quadratic sum of individual rule scores: S = sum(Si^2 / 100).
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResult {
  /// Result of the missing data (N) rule
  pub missing_data: Option<QcResultMissingData>,
  /// Result of the mixed (ambiguous) sites (M) rule
  pub mixed_sites: Option<QcResultMixedSites>,
  /// Result of the private mutations (P) rule
  pub private_mutations: Option<QcResultPrivateMutations>,
  /// Result of the SNP clusters (C) rule
  pub snp_clusters: Option<QcResultSnpClusters>,
  /// Result of the frame shifts (F) rule
  pub frame_shifts: Option<QcResultFrameShifts>,
  /// Result of the premature stop codons (S) rule
  pub stop_codons: Option<QcResultStopCodons>,
  /// Quadratic aggregate of all individual rule scores
  pub overall_score: f64,
  /// Quality category derived from the overall score
  pub overall_status: QcStatus,
}

pub trait QcRule {
  fn score(&self) -> f64;
}

pub fn qc_run(
  private_nuc_mutations: &PrivateNucMutations,
  nucleotide_composition: &BTreeMap<Nuc, usize>,
  total_missing: usize,
  translation: &Translation,
  frame_shifts: &[FrameShift],
  config: &QcConfig,
) -> QcResult {
  let mut result = QcResult {
    missing_data: rule_missing_data(total_missing, &config.missing_data),
    mixed_sites: rule_mixed_sites(nucleotide_composition, &config.mixed_sites),
    private_mutations: rule_private_mutations(private_nuc_mutations, &config.private_mutations),
    snp_clusters: rule_snp_clusters(private_nuc_mutations, &config.snp_clusters),
    frame_shifts: rule_frame_shifts(frame_shifts, &config.frame_shifts),
    stop_codons: rule_stop_codons(translation, &config.stop_codons),
    overall_score: 0.0,
    overall_status: QcStatus::Good,
  };

  result.overall_score += add_score(result.missing_data.as_ref());
  result.overall_score += add_score(result.mixed_sites.as_ref());
  result.overall_score += add_score(result.private_mutations.as_ref());
  result.overall_score += add_score(result.snp_clusters.as_ref());
  result.overall_score += add_score(result.frame_shifts.as_ref());
  result.overall_score += add_score(result.stop_codons.as_ref());

  result.overall_status = QcStatus::from_score(result.overall_score);

  result
}

fn add_score<R: QcRule>(rule_result: Option<&R>) -> f64 {
  if let Some(rule_result) = rule_result {
    rule_result.score().pow(2.0) * 0.01
  } else {
    0.0
  }
}
