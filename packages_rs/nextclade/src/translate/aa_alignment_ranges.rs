use crate::io::gene_map::GeneMap;
use crate::translate::coord_map::CoordMapGlobal;
use crate::translate::translate_genes::Translation;
use crate::utils::range::{intersect_or_none, NucAlnLocalRange, NucRefGlobalRange};
use eyre::Report;
use itertools::Itertools;

// // TODO: this could be computed during translation in Nextalign,
// // however the required nucleotide `alignment_range` is currently computed only much later in Nextclade.
// //
// /// Calculate alignment range field for each CDS
// pub fn calculate_aa_alignment_ranges_in_place(
//   alignment_range: &NucRefGlobalRange,
//   coord_map: &CoordMapGlobal,
//   translation: &mut Translation,
//   gene_map: &GeneMap,
// ) -> Result<(), Report> {
//   translation.iter_cdses_mut().try_for_each(|(_, cds_tr)| {
//     let cds = gene_map.get_cds(&cds_tr.name)?;
// 
//     let aa_alignment_ranges = cds
//       .segments
//       .iter()
//       .filter_map(|segment| {
//         // Convert segment range to nuc alignment coords
//         let segment_global_aln_range = coord_map.ref_to_aln_range(&segment.range);
// 
//         // Trim segment to the nuc alignment range
//         intersect_or_none(&segment_global_aln_range, alignment_range).map(|segment_range_global_aln| {
//           let segment_start_pos_global_aln = coord_map.ref_to_aln_position(segment.range.begin);
//           let segment_range_local_aln =
//             NucAlnLocalRange::from_range(segment_range_global_aln - segment_start_pos_global_aln);
//           cds_tr
//             .coord_map_local
//             .local_to_codon_ref_range(&segment_range_local_aln)
//         })
//       })
//       .collect_vec();
// 
//     cds_tr.alignment_ranges = aa_alignment_ranges;
// 
//     Ok::<(), Report>(())
//   })?;
// 
//   Ok(())
// }

pub fn calculate_aa_alignment_ranges_in_place_2(
  global_alignment_range: &NucRefGlobalRange,
  translation: &mut Translation,
  gene_map: &GeneMap,
  coord_map_global: &CoordMapGlobal,
) -> Result<(), Report> {
  translation.iter_cdses_mut().try_for_each(|(_, cds_tr)| {
    let cds = gene_map.get_cds(&cds_tr.name)?;

    let aa_alignment_ranges = cds
      .segments
      .iter()
      .filter_map(|segment| {
        intersect_or_none(global_alignment_range, &segment.range).map(|included_ref| {
          let included_global_aln = coord_map_global.ref_to_aln_range(&included_ref);
          let begin_aln = coord_map_global.ref_to_aln_position(segment.range.begin);
          let included_local_aln = NucAlnLocalRange::from_range(included_global_aln - begin_aln);
          coord_map_local.local_to_codon_ref_range(&included_local_aln)
        })
      })
      .collect_vec();

    cds_tr.alignment_ranges = aa_alignment_ranges;

    Ok::<(), Report>(())
  })?;

  Ok(())
}
