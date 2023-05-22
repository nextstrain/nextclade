use crate::align::params::AlignPairwiseParams;
use crate::gene::gene::GeneStrand;
use crate::io::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::complement::reverse_complement_in_place;
use crate::translate::coord_map::{extract_cds_ref, CoordMap, CoordMapForCds, CoordMapLocal};
use crate::translate::translate::translate;
use crate::translate::translate_genes::{CdsTranslation, Translation};
use crate::utils::range::Range;
use eyre::Report;

/// Translates genes in reference sequence
pub fn translate_genes_ref(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> Result<Translation, Report> {
  let cdses = gene_map
    .iter_cdses()
    .map(|(_, cds)| {
      let mut nucs = extract_cds_ref(ref_seq, cds);
      if cds.strand == GeneStrand::Reverse {
        reverse_complement_in_place(&mut nucs);
      }

      let tr = translate(&nucs, cds, params);
      let len = tr.seq.len();

      Ok(CdsTranslation {
        cds: cds.clone(),
        seq: tr.seq,
        insertions: vec![],
        frame_shifts: vec![],
        alignment_ranges: vec![Range::new(0, len)],
        ref_cds_map: CoordMapForCds::new(vec![], CoordMap::new(&[])), // dummy values
        qry_cds_map: CoordMapForCds::new(vec![], CoordMap::new(&[])), // dummy values
        coord_map_local: CoordMapLocal::new(&[]),
      })
    })
    .collect::<Result<Vec<CdsTranslation>, Report>>()?;

  let cdses = cdses.into_iter().map(|cds| (cds.cds.name.clone(), Ok(cds))).collect();

  Ok(Translation::new(cdses))
}
