use crate::align::align::AlignPairwiseParams;
use crate::gene::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::peptide::PeptideMap;
use eyre::Report;

pub struct Translation {}

pub fn translate_genes(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &PeptideMap,
  gene_map: &GeneMap,
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<Translation, Report> {
  Ok(Translation {})
}
