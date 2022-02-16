use crate::align::align::AlignPairwiseParams;
use crate::gene::gene::Gene;
use crate::io::nuc::Nuc;
use std::collections::HashMap;

pub type GapScoreMap = Vec<i32>;

pub fn get_gap_open_close_scores_flat(ref_seq: &[Nuc], params: &AlignPairwiseParams) -> GapScoreMap {
  let value = params.penaltyGapOpen as i32;
  let len = ref_seq.len() + 2;
  vec![value; len]
}

pub fn get_gap_open_close_scores_codon_aware(
  ref_seq: &[Nuc],
  gene_map: &HashMap<String, Gene>,
  params: &AlignPairwiseParams,
) -> GapScoreMap {
  let mut gap_open_close = get_gap_open_close_scores_flat(ref_seq, params);
  for (_, gene) in gene_map.iter() {
    for i in (gene.start..gene.end).step_by(3) {
      gap_open_close[i] = params.penaltyGapOpenInFrame;
      gap_open_close[i + 1] = params.penaltyGapOpenOutOfFrame;
      gap_open_close[i + 2] = params.penaltyGapOpenOutOfFrame;
    }
  }
  gap_open_close
}
