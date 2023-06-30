use crate::io::gene_map::GeneMap;
use crate::make_internal_report;
use crate::translate::coord_map::CoordMap;
use crate::translate::translate_genes::Translation;
use crate::utils::range::{intersect, Range};
use eyre::Report;

pub fn calculate_aa_alignment_ranges_in_place(
  alignment_range: &Range,
  gene_map: &GeneMap,
  coord_map: &CoordMap,
  translations: &mut [Translation],
) -> Result<(), Report> {
  translations.iter_mut().try_for_each(|translation| {
    calculate_aa_alignment_range_in_place(alignment_range, gene_map, coord_map, translation)
  })
}

pub fn calculate_aa_alignment_range_in_place(
  alignment_range: &Range,
  gene_map: &GeneMap,
  coord_map: &CoordMap,
  translation: &mut Translation,
) -> Result<(), Report> {
  let gene = gene_map.get(&translation.gene_name).ok_or_else(|| {
    make_internal_report!(
      "Calculate AA alignment ranges: gene not found in gene map: '{}'",
      &translation.gene_name
    )
  })?;

  let gene_range_aln = coord_map.ref_to_aln_range(&Range::new(gene.start, gene.end));
  let sequenced_gene_range_aln_abs = intersect(&gene_range_aln, alignment_range);

  let gene_start_aln = coord_map.ref_to_aln_position(gene.start);
  let sequenced_gene_range_aln_rel = sequenced_gene_range_aln_abs - gene_start_aln;

  translation.alignment_range = gene.nuc_to_codon_range(&sequenced_gene_range_aln_rel);
  Ok(())
}
