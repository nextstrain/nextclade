use crate::align::params::AlignPairwiseParams;
use crate::io::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::complement::reverse_complement_in_place;
use crate::translate::translate::translate;
use crate::translate::translate_genes::{Translation, TranslationMap};
use eyre::Report;

/// Translates genes in reference sequence
pub fn translate_genes_ref(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> Result<TranslationMap, Report> {
  gene_map
    .iter()
    .map(|(gene_name, gene)| -> Result<(String, Translation), Report> {
      let mut gene_nuc_seq = ref_seq[gene.start..gene.end].to_vec();
      if gene.strand == "-" {
        reverse_complement_in_place(&mut gene_nuc_seq);
      }
      let peptide = translate(&gene_nuc_seq, gene, params)?;
      Ok((gene_name.clone(), peptide))
    })
    .collect::<Result<TranslationMap, Report>>()
}
