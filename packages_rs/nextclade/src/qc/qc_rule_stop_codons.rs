use crate::align::backtrace::AlignmentOutput;
use crate::io::aa::Aa;
use crate::io::nuc::Nuc;
use crate::qc::qc_config::{QcRulesConfigStopCodons, StopCodonLocation};
use crate::qc::qc_run::{QcRule, QcStatus};
use crate::translate::translate_genes::Translation;
use crate::utils::error::keep_ok;
use eyre::Report;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct QcResultStopCodons {
  pub score: f64,
  pub status: QcStatus,
  pub stop_codons: Vec<StopCodonLocation>,
  pub total_stop_codons: usize,
  pub stop_codons_ignored: Vec<StopCodonLocation>,
  pub total_stop_codons_ignored: usize,
}

impl QcRule for QcResultStopCodons {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_stop_codons(translations: &[Translation], config: &QcRulesConfigStopCodons) -> Option<QcResultStopCodons> {
  if !config.enabled {
    return None;
  }

  let mut stop_codons = Vec::<StopCodonLocation>::new();
  let mut stop_codons_ignored = Vec::<StopCodonLocation>::new();
  for translation in translations {
    let Translation {
      gene_name,
      seq: peptide,
      ..
    } = translation;

    let len_minus_one = peptide.len() - 1; // Minus one to ignore valid stop codon at the end
    for (codon, aa) in peptide.iter().enumerate().take(len_minus_one) {
      if aa.is_stop() {
        let stop_codon = StopCodonLocation {
          gene_name: gene_name.clone(),
          codon,
        };

        if is_ignored_stop_codon(&stop_codon, &config.ignored_stop_codons) {
          stop_codons_ignored.push(stop_codon);
        } else {
          stop_codons.push(stop_codon);
        }
      }
    }
  }

  let total_stop_codons = stop_codons.len();
  let total_stop_codons_ignored = stop_codons_ignored.len();

  let score = total_stop_codons as f64 * config.score_weight;
  let status = QcStatus::from_score(score);

  Some(QcResultStopCodons {
    score,
    status,
    stop_codons,
    total_stop_codons,
    stop_codons_ignored,
    total_stop_codons_ignored,
  })
}

#[inline]
fn is_ignored_stop_codon(stop_codon: &StopCodonLocation, ignored_stop_codons: &[StopCodonLocation]) -> bool {
  // TODO: we might try to improve performance using a lookup table, instead of array search
  ignored_stop_codons.iter().any(|ignored| ignored == stop_codon)
}
