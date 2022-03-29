use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::Translation;
use crate::utils::error::keep_ok;
use eyre::Report;
use itertools::Itertools;

pub fn frame_shifts_flatten(translations: &[Result<Translation, Report>]) -> Vec<FrameShift> {
  keep_ok(translations)
    .flat_map(|tr| tr.frame_shifts.iter().cloned())
    .collect_vec()
}
