use crate::align::align::AlignPairwiseParams;
use crate::gene::gene::Gene;
use crate::io::aa::Aa;
use crate::io::nuc::Nuc;
use crate::translate::peptide::Peptide;
use eyre::Report;

pub fn translate(gene_nuc_seq: &[Nuc], gene: &Gene, params: &AlignPairwiseParams) -> Result<Peptide, Report> {
  #[allow(clippy::integer_division)]
  let mut peptide = Vec::<Aa>::with_capacity((gene_nuc_seq.len() / 3) + 1);

  if gene.strand == "-" {
    // reverse_complement(gene_nuc_seq);
  }

  peptide.shrink_to_fit();
  Ok(Peptide {
    gene_name: gene.gene_name.clone(),
    seq: peptide,
  })
}
