use crate::align::align::align_nuc;
use crate::align::insertions_strip::{get_aa_insertions, insertions_strip};
use crate::align::params::AlignPairwiseParams;
use crate::io::gene_map::GeneMap;
use crate::io::nuc::Nuc;
use crate::translate::coord_map::CoordMap;
use crate::translate::translate_genes::{translate_genes, Translation};
use crate::types::outputs::{NextalignOutputs, PeptideWarning};
use eyre::Report;
use itertools::Itertools;
use std::collections::HashSet;

pub fn nextalign_run_one(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  ref_seq: &[Nuc],
  ref_peptides: &Translation,
  gene_map: &GeneMap,
  gap_open_close_nuc: &[i32],
  gap_open_close_aa: &[i32],
  params: &AlignPairwiseParams,
) -> Result<NextalignOutputs, Report> {
  match align_nuc(index, seq_name, qry_seq, ref_seq, gap_open_close_nuc, params) {
    Err(report) => Err(report),

    Ok(alignment) => {
      let coord_map = CoordMap::new(&alignment.ref_seq);

      let translation = translate_genes(
        &alignment.qry_seq,
        &alignment.ref_seq,
        ref_peptides,
        gene_map,
        &coord_map,
        gap_open_close_aa,
        params,
      )?;

      let stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);

      let present_genes: HashSet<String> = translation
        .iter_genes()
        .flat_map(|(_, gene_tr)| gene_tr.cdses.iter().map(|(_, cds_tr)| cds_tr.name.clone()))
        .collect();

      let missing_genes = gene_map
        .iter_genes()
        .filter_map(|(gene_name, _)| (!present_genes.contains(gene_name)).then_some(gene_name))
        .cloned()
        .collect_vec();

      let is_reverse_complement = alignment.is_reverse_complement;

      let warnings = {
        let mut warnings = translation
          .iter_genes()
          .flat_map(|(_, gene_tr)| gene_tr.warnings.clone())
          .collect_vec();

        if is_reverse_complement {
          warnings.push(PeptideWarning {
            gene_name: "nuc".to_owned(),
            warning: format!("When processing sequence #{index} '{seq_name}': Sequence is reverse-complemented: Seed matching failed for the original sequence, but succeeded for its reverse complement. Outputs will be derived from the reverse complement and 'reverse complement' suffix will be added to sequence ID.")
          });
        }

        warnings
      };

      let aa_insertions = get_aa_insertions(&translation);

      Ok(NextalignOutputs {
        stripped,
        alignment,
        translation,
        aa_insertions,
        warnings,
        missing_genes,
        is_reverse_complement,
        coord_map,
      })
    }
  }
}
