use crate::align::align::align_nuc;
use crate::align::insertions_strip::insertions_strip;
use crate::align::params::AlignPairwiseParams;
use crate::io::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::coord_map::CoordMap;
use crate::translate::translate_genes::{translate_genes, Translation, TranslationMap};
use crate::types::outputs::{NextalignOutputs, PeptideWarning};
use crate::utils::error::report_to_string;
use eyre::Report;
use itertools::{Either, Itertools};
use log::warn;
use std::collections::HashSet;

pub fn nextalign_run_one(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &TranslationMap,
  gene_map: &GeneMap,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<NextalignOutputs, Report> {
  match align_nuc(index, seq_name, qry_seq, ref_seq, gap_open_close_nuc, params) {
    Err(report) => Err(report),

    Ok(alignment) => {
      let coord_map = CoordMap::new(&alignment.ref_seq);

      let translations = translate_genes(
        &alignment.qry_seq,
        &alignment.ref_seq,
        ref_peptides,
        gene_map,
        &coord_map,
        gap_open_close_aa,
        params,
      )?;

      let stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);

      let (translations, mut warnings): (Vec<Translation>, Vec<PeptideWarning>) =
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
        .filter_map(|(gene_name, _)| (!present_genes.contains(gene_name)).then_some(gene_name))
        .cloned()
        .collect_vec();

      let is_reverse_complement = alignment.is_reverse_complement;

      if is_reverse_complement {
        warnings.push(PeptideWarning {
          gene_name: "nuc".to_owned(),
          warning: format!("When processing sequence #{index} '{seq_name}': Sequence is reverse-complemented: Seed matching failed for the original sequence, but succeeded for its reverse complement. Outputs will be derived from the reverse complement and 'reverse complement' suffix will be added to sequence ID.")
        });
      }

      for warning in &warnings {
        warn!("{}", warning.warning);
      }

      Ok(NextalignOutputs {
        stripped,
        alignment,
        translations,
        warnings,
        missing_genes,
        is_reverse_complement,
        coord_map,
      })
    }
  }
}
