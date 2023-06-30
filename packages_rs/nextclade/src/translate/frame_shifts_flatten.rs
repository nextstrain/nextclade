use crate::translate::frame_shifts_translate::FrameShift;
use crate::translate::translate_genes::Translation;
use itertools::Itertools;

pub fn frame_shifts_flatten(translation: &Translation) -> Vec<FrameShift> {
  translation
    .iter_genes()
    .flat_map(|(_, gene_tr)| {
      gene_tr
        .cdses
        .iter()
        .flat_map(|(_, cds)| cds.frame_shifts.iter().cloned().collect_vec())
    })
    .collect_vec()
}
