use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_alignment::AaAlignment;
use crate::analyze::aa_changes_find_for_cds::{aa_changes_find_for_cds, FindAaChangesOutput};
use crate::analyze::nuc_del::NucDelRange;
use crate::analyze::nuc_sub::NucSub;
use crate::gene::gene_map::GeneMap;
use crate::translate::translate_genes::Translation;
use crate::utils::collections::extend_map_of_vecs;
use eyre::Report;

/// Finds aminoacid substitutions and deletions in query peptides relative to reference peptides, in all genes
///
/// ## Precondition
/// Nucleotide sequences and peptides are required to be stripped from insertions
pub fn aa_changes_find(
  ref_seq: &[Nuc],
  qry_seq: &[Nuc],
  ref_translation: &Translation,
  qry_translation: &Translation,
  gene_map: &GeneMap,
  nuc_subs: &[NucSub],
  nuc_dels: &[NucDelRange],
) -> Result<FindAaChangesOutput, Report> {
  let mut changes = qry_translation.iter_cdses().map(|(qry_name, qry_tr)| {
    let ref_tr = ref_translation.get_cds(qry_name)?;
    let cds = gene_map.get_cds(&qry_tr.name)?;
    let tr = AaAlignment::new(cds, ref_tr, qry_tr);
    Ok(aa_changes_find_for_cds(qry_seq, ref_seq, &tr, nuc_subs, nuc_dels))
  })
  .collect::<Result<Vec<FindAaChangesOutput>, Report>>()?
  .into_iter()
    // Merge changes from all CDSes into one struct
  .fold(FindAaChangesOutput::default(), |mut output, changes| {
    output.aa_changes_groups.extend(changes.aa_changes_groups);
    output.aa_substitutions.extend(changes.aa_substitutions);
    output.aa_deletions.extend(changes.aa_deletions);
    extend_map_of_vecs(&mut output.nuc_to_aa_muts, changes.nuc_to_aa_muts);
    output
  });

  changes.aa_substitutions.sort();
  changes.aa_deletions.sort();
  changes.nuc_to_aa_muts.iter_mut().for_each(|(_, vals)| {
    vals.sort();
    vals.dedup();
  });

  Ok(changes)
}
