use crate::io::gene_map::GeneMap;
use crate::translate::coord_map::CoordMap;
use crate::translate::translate_genes::Translation;
use crate::utils::range::{intersect_or_none, Range};
use eyre::Report;
use itertools::Itertools;

// TODO: this could be computed during translation in Nextalign,
// however the required nucleotide `alignment_range` is currently computed only much later in Nextclade.
//
/// Calculate alignment range field for each CDS
pub fn calculate_aa_alignment_ranges_in_place(
  alignment_range: &Range,
  coord_map: &CoordMap,
  translation: &mut Translation,
  gene_map: &GeneMap,
) -> Result<(), Report> {
  translation.iter_cdses_mut().try_for_each(|(_, cds_tr)| {
    let cds = gene_map.get_cds(&cds_tr.name)?;

    let aa_alignment_ranges = cds
      .segments
      .iter()
      .filter_map(|segment| {
        // Convert segment range to nuc alignment coords
        let segment_global_aln_range = coord_map.ref_to_aln_range(&Range::new(segment.start, segment.end));

        // Trim segment to the nuc alignment range
        intersect_or_none(&segment_global_aln_range, alignment_range).map(|segment_range_global_aln| {
          let segment_start_pos_global_aln = coord_map.ref_to_aln_position(segment.start);
          let segment_range_local_aln = segment_range_global_aln - segment_start_pos_global_aln;
          cds_tr
            .coord_map_local
            .local_to_codon_ref_range(&segment_range_local_aln)
        })
      })
      .collect_vec();

    cds_tr.alignment_ranges = aa_alignment_ranges;

    Ok::<(), Report>(())
  })?;

  Ok(())
}
