use crate::alphabet::nuc::Nuc;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::qc::qc_config::QcConfig;
use crate::qc::qc_rule_frame_shifts::{rule_frame_shifts, QcResultFrameShifts};
use crate::qc::qc_rule_missing_data::{rule_missing_data, QcResultMissingData};
use crate::qc::qc_rule_mixed_sites::{rule_mixed_sites, QcResultMixedSites};
use crate::qc::qc_rule_private_mutations::{rule_private_mutations, QcResultPrivateMutations};
use crate::qc::qc_rule_snp_clusters::{rule_snp_clusters, QcResultSnpClusters};
use crate::qc::qc_rule_stop_codons::{rule_stop_codons, QcResultStopCodons};
use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::{CdsTranslation, Translation};
use num::traits::Pow;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "lowercase")]
#[derive(Default)]
pub enum QcStatus {
  #[default]
  Good,
  Mediocre,
  Bad,
}



impl ToString for QcStatus {
  fn to_string(&self) -> String {
    match self {
      QcStatus::Good => "good".to_owned(),
      QcStatus::Mediocre => "mediocre".to_owned(),
      QcStatus::Bad => "bad".to_owned(),
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

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResult {
  pub missing_data: Option<QcResultMissingData>,
  pub mixed_sites: Option<QcResultMixedSites>,
  pub private_mutations: Option<QcResultPrivateMutations>,
  pub snp_clusters: Option<QcResultSnpClusters>,
  pub frame_shifts: Option<QcResultFrameShifts>,
  pub stop_codons: Option<QcResultStopCodons>,
  pub overall_score: f64,
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

  result.overall_score += add_score(&result.missing_data);
  result.overall_score += add_score(&result.mixed_sites);
  result.overall_score += add_score(&result.private_mutations);
  result.overall_score += add_score(&result.snp_clusters);
  result.overall_score += add_score(&result.frame_shifts);
  result.overall_score += add_score(&result.stop_codons);

  result.overall_status = QcStatus::from_score(result.overall_score);

  result
}

fn add_score<R: QcRule>(rule_result: &Option<R>) -> f64 {
  if let Some(rule_result) = rule_result {
    rule_result.score().pow(2.0) * 0.01
  } else {
    0.0
  }
}
