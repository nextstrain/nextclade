use crate::align::align::AlignPairwiseParams;
use crate::gene::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::peptide::{Peptide, PeptideMap};
use crate::translate::translate::translate;
use eyre::Report;

/// Translates genes in reference sequence
pub fn translate_genes_ref(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> Result<PeptideMap, Report> {
  gene_map
    .iter()
    .map(|(gene_name, gene)| -> Result<(String, Peptide), Report> {
      let gene_nuc_seq = &ref_seq[gene.start..gene.end];
      let peptide = translate(gene_nuc_seq, gene, params)?;
      Ok((gene_name.clone(), peptide))
    })
    .collect::<Result<PeptideMap, Report>>()
}
