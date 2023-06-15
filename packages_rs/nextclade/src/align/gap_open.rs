use crate::align::params::AlignPairwiseParams;
use crate::io::gene_map::GeneMap;
use crate::io::nuc::Nuc;

pub type GapScoreMap = Vec<i32>;

pub fn get_gap_open_close_scores_flat(ref_seq: &[Nuc], params: &AlignPairwiseParams) -> GapScoreMap {
  let value = params.penalty_gap_open;
  let len = ref_seq.len() + 2;
  vec![value; len]
}

pub fn get_gap_open_close_scores_codon_aware(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> GapScoreMap {
  let mut gap_open_close = get_gap_open_close_scores_flat(ref_seq, params);
  for (_, gene) in gene_map.iter_genes() {
    for cds in gene.cdses.iter() {
      for segment in cds.segments.iter() {
        let mut cds_pos: usize = 0;
        for i in segment.range.to_std() {
          if cds_pos % 3 > 0 {
            gap_open_close[i] = params.penalty_gap_open_out_of_frame;
          } else {
            gap_open_close[i] = params.penalty_gap_open_in_frame;
          }
          cds_pos += 1;
        }
      }
    }
  }
  gap_open_close
}
