use crate::align::params::AlignPairwiseParams;
use crate::io::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::coord_map::{extract_cds_ref, CoordMapForCds, CoordMapLocal};
use crate::translate::translate::translate;
use crate::translate::translate_genes::{CdsTranslation, GeneTranslation, Translation};
use crate::utils::range::Range;
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
          let nucs = extract_cds_ref(ref_seq, cds);
          let tr = translate(&nucs, cds, params);
          let len = tr.seq.len();

          (
            cds.name.clone(),
            CdsTranslation {
              name: cds.name.clone(),
              strand: cds.strand,
              seq: tr.seq,
              nuc_seq: nucs,
              insertions: vec![],
              frame_shifts: vec![],
              alignment_ranges: vec![Range::from_usize(0, len)],
              ref_cds_map: CoordMapForCds::new(vec![]), // dummy values
              qry_cds_map: CoordMapForCds::new(vec![]), // dummy values
              coord_map_local: CoordMapLocal::new(&[]),
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
