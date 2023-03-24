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
) -> Result<(), Report> {
  translation.iter_cdses_mut().try_for_each(|(_, cds_tr)| {
    let aa_alignment_ranges = cds_tr
      .cds
      .segments
      .iter()
      .filter_map(|segment| {
        // Convert segment range to nuc alignment coords
        let segment_global_aln_range = coord_map.ref_to_aln_range(&Range::new(segment.start, segment.end));

        // Trim segment to the nuc alignment range
        intersect_or_none(alignment_range, &segment_global_aln_range).map(|segment_global_aln_range| {
          let gene_start_aln = coord_map.ref_to_aln_position(segment.start);
          let sequenced_gene_range_aln_rel = segment_global_aln_range - gene_start_aln;
          cds_tr
            .coord_map_local
            .local_aln_to_codon_range(&sequenced_gene_range_aln_rel)
        })
      })
      .collect_vec();

    cds_tr.alignment_ranges = aa_alignment_ranges;

    Ok::<(), Report>(())
  })?;

  Ok(())
}
