use crate::qc::qc_config::QcRulesConfigFrameShifts;
use crate::qc::qc_run::{QcRule, QcStatus};
use crate::translate::frame_shifts_translate::FrameShift;
use serde::{Deserialize, Serialize};

#[inline]
#[allow(clippy::suspicious_operation_groupings)]
pub fn is_frame_shift_ignored(frame_shift: &FrameShift, config: &QcRulesConfigFrameShifts) -> bool {
  config
    .ignored_frame_shifts
    .iter()
    .any(|ignored| ignored.gene_name == frame_shift.gene_name && ignored.codon_range == frame_shift.codon)
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultFrameShifts {
  pub score: f64,
  pub status: QcStatus,
  pub frame_shifts: Vec<FrameShift>,
  pub total_frame_shifts: usize,
  pub frame_shifts_ignored: Vec<FrameShift>,
  pub total_frame_shifts_ignored: usize,
}

impl QcRule for QcResultFrameShifts {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_frame_shifts(
  all_frame_shifts: &[FrameShift],
  config: &QcRulesConfigFrameShifts,
) -> Option<QcResultFrameShifts> {
  if !config.enabled {
    return None;
  }

  let (frame_shifts_ignored, frame_shifts): (Vec<FrameShift>, Vec<FrameShift>) = all_frame_shifts
    .iter()
    .cloned()
    .partition(|frame_shift| is_frame_shift_ignored(frame_shift, config));

  let total_frame_shifts = frame_shifts.len();
  let total_frame_shifts_ignored = frame_shifts_ignored.len();

  let score = total_frame_shifts as f64 * config.score_weight;
  let status = QcStatus::from_score(score);

  Some(QcResultFrameShifts {
    score,
    status,
    frame_shifts,
    total_frame_shifts,
    frame_shifts_ignored,
    total_frame_shifts_ignored,
  })
}
