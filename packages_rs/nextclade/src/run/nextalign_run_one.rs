use crate::align::align::align_nuc;
use crate::align::insertions_strip::{get_aa_insertions, insertions_strip};
use crate::align::params::AlignPairwiseParams;
use crate::align::seed_match2::CodonSpacedIndex;
use crate::alphabet::nuc::Nuc;
use crate::coord::coord_map_global::CoordMapGlobal;
use crate::gene::gene_map::GeneMap;
use crate::run::nextclade_wasm::{Nextclade, NextcladeStateTier0, NextcladeStateTier1};
use crate::translate::translate_genes::{translate_genes, Translation};
use crate::types::outputs::{NextalignOutputs, PeptideWarning};
use eyre::Report;
use itertools::Itertools;
use std::collections::HashSet;

pub fn nextalign_run_one(
  index: usize,
  seq_name: &str,
  qry_seq: &[Nuc],
  state: &Nextclade,
) -> Result<NextalignOutputs, Report> {
  let NextcladeStateTier0 {
    ref_seq,
    seed_index,
    gap_open_close_nuc,
    params,
    ..
  } = &state.tier0;

  let gap_open_close_nuc = state
    .tier1
    .map(|tier1| &tier1.gap_open_close_nuc)
    .unwrap_or(gap_open_close_nuc);

  let alignment = align_nuc(
    index,
    seq_name,
    qry_seq,
    ref_seq,
    seed_index,
    gap_open_close_nuc,
    &params.alignment,
  )?;

  if let Some(tier1) = &state.tier1 {
    let coord_map_global = CoordMapGlobal::new(&alignment.ref_seq);

    let NextcladeStateTier1 {
      gene_map,
      gap_open_close_nuc,
      gap_open_close_aa,
      ref_translation,
      aa_motifs_ref,
      aa_motifs_descs,
    } = tier1;

    let translation = translate_genes(
      &alignment.qry_seq,
      &alignment.ref_seq,
      ref_translation,
      gene_map,
      &coord_map_global,
      &gap_open_close_aa,
      &params.alignment,
      // qry_seq: &[Nuc],
      // ref_seq: &[Nuc],
      // ref_peptides: &Translation,
      // gene_map: &GeneMap,
      // coord_map_global: &CoordMapGlobal,
      // global_alignment_range: &NucRefGlobalRange,
      // gap_open_close_aa: &[i32],
      // params: &AlignPairwiseParams,
    )?;

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
  }

  let stripped = insertions_strip(&alignment.qry_seq, &alignment.ref_seq);

  Ok(NextalignOutputs {
    alignment,
    stripped,
    translation,
    aa_insertions,
    warnings,
    missing_genes,
    is_reverse_complement,
  })
}
