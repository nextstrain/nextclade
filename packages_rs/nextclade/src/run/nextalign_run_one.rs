use crate::align::align::align_nuc;
use crate::align::insertions_strip::insertions_strip;
use crate::align::params::AlignPairwiseParams;
use crate::gene::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::translate_genes::{translate_genes, Translation, TranslationMap};
use crate::types::outputs::{NextalignOutputs, PeptideWarning};
use crate::utils::error::report_to_string;
use eyre::Report;
use itertools::{Either, Itertools};
use std::collections::HashSet;

pub fn nextalign_run_one(
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  gene_map: &GeneMap,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<NextalignOutputs, Report> {
  match align_nuc(qry_seq, ref_seq, gap_open_close_nuc, params) {
    Err(report) => Err(report),

    Ok(alignment) => {
      let translations = translate_genes(
        &alignment.qry_seq,
        &alignment.ref_seq,
        ref_peptides,
        gene_map,
        gap_open_close_aa,
        params,
      )?;

      let stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);

      let (translations, warnings): (Vec<Translation>, Vec<PeptideWarning>) =
        translations.into_iter().partition_map(|(gene_name, res)| match res {
          Ok(tr) => Either::Left(tr),
          Err(err) => Either::Right(PeptideWarning {
            gene_name,
            warning: report_to_string(&err),
          }),
        });

      let present_genes: HashSet<String> = translations.iter().map(|tr| &tr.gene_name).cloned().collect();

      let missing_genes = gene_map
        .iter()
        .filter_map(|(gene_name, _)| (!present_genes.contains(gene_name)).then(|| gene_name))
        .cloned()
        .collect_vec();

      Ok(NextalignOutputs {
        stripped,
        alignment,
        translations,
        warnings,
        missing_genes,
      })
    }
  }
}
