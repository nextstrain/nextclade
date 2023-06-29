use crate::align::params::AlignPairwiseParams;
use crate::alphabet::nuc::Nuc;
use crate::coord::range::Range;
use crate::gene::gene_map::GeneMap;
use crate::translate::extract::extract_cds_from_ref;
use crate::translate::translate::translate;
use crate::translate::translate_genes::{CdsTranslation, GeneTranslation, Translation};
use eyre::Report;

/// Translates genes in reference sequence
pub fn translate_genes_ref(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> Result<Translation, Report> {
  let genes = gene_map
    .iter_genes()
    .map(|(gene_name, gene)| {
      let cdses = gene
        .cdses
        .iter()
        .map(|cds| {
          let nucs = extract_cds_from_ref(ref_seq, cds);
          let tr = translate(&nucs, cds, params);
          let len = tr.seq.len();

          (
            cds.name.clone(),
            CdsTranslation {
              name: cds.name.clone(),
              seq: tr.seq,
              insertions: vec![],
              frame_shifts: vec![],
              alignment_ranges: vec![Range::from_usize(0, len)],
              unsequenced_ranges: vec![],
            },
          )
        })
        .collect();

      (
        gene_name.clone(),
        GeneTranslation {
          gene: gene.clone(),
          cdses,
          warnings: vec![],
        },
      )
    })
    .collect();

  Ok(Translation { genes })
}
