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
    .any(|ignored| ignored.cds_name == frame_shift.cds_name && ignored.codon_range == frame_shift.codon)
}

/// Result of the frame shifts QC rule.
///
/// Frame-shifting insertions or deletions disrupt translation and produce garbled proteins or
/// premature stop codons. Known frame shifts listed in `ignoredFrameShifts` in the dataset
/// configuration are excluded from scoring. Score equals the number of non-ignored frame shifts
/// times `scoreWeight`.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultFrameShifts {
  /// Numeric QC score for this rule (0-100+)
  pub score: f64,
  /// Quality category derived from the score
  pub status: QcStatus,
  /// Frame shifts not in the ignored list (penalized)
  pub frame_shifts: Vec<FrameShift>,
  /// Number of penalized frame shifts
  pub total_frame_shifts: usize,
  /// Frame shifts matching the ignored list in dataset configuration (not penalized)
  pub frame_shifts_ignored: Vec<FrameShift>,
  /// Number of ignored frame shifts
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

  let score = total_frame_shifts as f64 * *config.score_weight;
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
