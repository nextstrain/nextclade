use crate::io::gene_map::GeneMap;
use crate::translate::coord_map::{CdsPosition, CdsRange, CoordMap};
use crate::translate::translate_genes::Translation;
use crate::utils::range::{intersect, Range};
use eyre::Report;

// TODO: this could be computed during translation in Nextalign,
// however the required nucleotide `alignment_range` is currently computed only much later in Nextclade.
//
/// Calculate alignment range field for each CDS
pub fn calculate_aa_alignment_ranges_in_place(
  alignment_range: &Range,
  gene_map: &GeneMap,
  coord_map: &CoordMap,
  translation: &mut Translation,
) -> Result<(), Report> {
  translation.iter_genes_mut().try_for_each(|(_, gene_tr)| {
    let gene = &mut gene_tr.gene;

    gene_tr.cdses.iter_mut().try_for_each(|(_, cds_tr)| {
      let aa_alignment_range =
        // Calculate CDS ranges in nuc alignment
        cds_tr.qry_cds_map.cds_to_global_aln_range(&Range::new(gene.start, gene.end)).into_iter()
        // Take covered ranges
        .find_map(|cds_range| match cds_range {
          CdsRange::Covered(range) => {
            // If the codon is outside of nucleotide alignment, exclude it or trim it to the nuc alignment range
            let sequenced_gene_range_aln_abs = intersect(alignment_range, &range);

            let gene_start_aln = cds_tr.qry_cds_map.cds_to_global_aln_position(gene.start).into_iter()
              .find_map(|cds_pos| match cds_pos {
                CdsPosition::Inside(pos) => Some(pos),
                _ => None
              })?;

            let sequenced_gene_range_aln_rel = sequenced_gene_range_aln_abs - gene_start_aln;
            let range = cds_tr.qry_cds_map.cds_to_codon_range(&sequenced_gene_range_aln_rel);
            Some(range)
          }
          _ => None,
        }).unwrap_or_default();

      cds_tr.alignment_range = aa_alignment_range;

      Ok::<(), Report>(())
    })?;

    Ok::<(), Report>(())
  })?;

  Ok(())
}
