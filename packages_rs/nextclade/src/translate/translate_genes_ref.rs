use crate::align::params::AlignPairwiseParams;
use crate::gene::gene::GeneStrand;
use crate::io::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::complement::reverse_complement_in_place;
use crate::translate::coord_map::{extract_cds_ref, CoordMap, CoordMapForCds};
use crate::translate::translate::translate;
use crate::translate::translate_genes::{CdsTranslation, GeneTranslation, Translation};
use crate::utils::range::Range;
use eyre::Report;
use regex::internal::Input;

/// Translates genes in reference sequence
pub fn translate_genes_ref(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> Result<Translation, Report> {
  let genes = gene_map
    .iter()
    .map(|(gene_name, gene)| {
      let cdses = gene
        .cdses
        .iter()
        .map(|cds| {
          let mut nucs = extract_cds_ref(ref_seq, cds);
          if gene.strand == GeneStrand::Reverse {
            reverse_complement_in_place(&mut nucs);
          }

          let tr = translate(&nucs, cds, params);

          (
            cds.name.clone(),
            CdsTranslation {
              cds: cds.clone(),
              seq: tr.seq,
              insertions: vec![],
              frame_shifts: vec![],
              alignment_range: Range::new(0, tr.seq.len()),
              ref_cds_map: CoordMapForCds::new(vec![], CoordMap::new(&[])), // dummy values
              qry_cds_map: CoordMapForCds::new(vec![], CoordMap::new(&[])), // dummy values
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
