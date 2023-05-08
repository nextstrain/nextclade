use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::Translation;
use itertools::Itertools;

pub fn frame_shifts_flatten(translation: &Translation) -> Vec<FrameShift> {
  translation
    .iter_cdses()
    .flat_map(|cds| cds.frame_shifts.iter().cloned().collect_vec())
    .collect_vec()
}
