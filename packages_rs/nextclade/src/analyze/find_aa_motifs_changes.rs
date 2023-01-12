use crate::analyze::find_aa_motifs::{AaMotif, AaMotifWithoutSeq};
use crate::io::aa::from_aa_seq;
use crate::make_internal_report;
use crate::translate::translate_genes::{Translation, TranslationMap};
use crate::utils::collections::{cloned_into, zip_map_hashmap};
use eyre::Report;
use itertools::{Itertools, Zip};
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::fmt::Debug;

pub type AaMotifsMap = BTreeMap<String, Vec<AaMotif>>;
pub type AaMotifsChangesMap = BTreeMap<String, AaMotifChanges>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaMotifChanges {
  pub preserved: Vec<AaMotifMutation>,
  pub gained: Vec<AaMotifMutation>,
  pub lost: Vec<AaMotifMutation>,
  pub total: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize, Ord, PartialOrd, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct AaMotifMutation {
  pub name: String,
  pub gene: String,
  pub position: usize,
  pub ref_seq: String,
  pub qry_seq: String,
}

/// Find changes between AA motifs in reference and in query sequence
pub fn find_aa_motifs_changes(
  aa_motifs_ref: &AaMotifsMap,
  aa_motifs_qry: &AaMotifsMap,
  ref_peptides: &TranslationMap,
  translations: &[Translation],
) -> Result<AaMotifsChangesMap, Report> {
  zip_map_hashmap(aa_motifs_ref, aa_motifs_qry, |name, motifs_ref, motifs_qry| {
    let changes = find_aa_motifs_changes_one(motifs_ref, motifs_qry, ref_peptides, translations)?;
    Ok((name.clone(), changes))
  })
  .collect()
}

fn find_aa_motifs_changes_one(
  motifs_ref: &[AaMotif],
  motifs_qry: &[AaMotif],
  ref_peptides: &TranslationMap,
  translations: &[Translation],
) -> Result<AaMotifChanges, Report> {
  // We want to find added and removed positions (`.pos`) per gene.
  // So we use a wrapper for `struct AaMotif` which disregards `.seq` during comparison.
  let motifs_ref: HashSet<AaMotifWithoutSeq> = motifs_ref.iter().cloned().map(AaMotifWithoutSeq::from).collect();
  let motifs_qry: HashSet<AaMotifWithoutSeq> = motifs_qry.iter().cloned().map(AaMotifWithoutSeq::from).collect();

  // Gained motifs: not present in ref, present in qry
  let gained = motifs_qry
    .difference(&motifs_ref)
    .map(|motif| add_ref_seq(&motif.0, ref_peptides))
    .collect::<Result<Vec<AaMotifMutation>, Report>>()?
    .into_iter()
    .sorted()
    .collect_vec();

  // Lost motifs: present in ref, not present in query
  let lost = motifs_ref
    .difference(&motifs_qry)
    .filter_map(|motif| add_qry_seq(&motif.0, translations))
    .sorted()
    .collect_vec();

  // Preserved motifs: present in ref and qry
  let preserved = {
    // Zip ref and qry motifs, so that we can compare them pairwise
    let kept_ref: Vec<AaMotif> = cloned_into(motifs_ref.intersection(&motifs_qry)).sorted().collect_vec();
    let kept_qry: Vec<AaMotif> = cloned_into(motifs_qry.intersection(&motifs_ref)).sorted().collect_vec();
    Zip::from((kept_ref, kept_qry))
      .map(|(motif_ref, motif_qry)| AaMotifMutation {
        name: motif_ref.name,
        gene: motif_ref.gene,
        position: motif_ref.position,
        ref_seq: motif_ref.seq,
        qry_seq: motif_qry.seq,
      })
      .sorted()
      .collect_vec()
  };

  let total = gained.len() + preserved.len();

  Ok(AaMotifChanges {
    preserved,
    gained,
    lost,
    total,
  })
}

// Add ref sequence fragment to motif
fn add_ref_seq(motif: &AaMotif, ref_peptides: &TranslationMap) -> Result<AaMotifMutation, Report> {
  let ref_seq = &ref_peptides
    .get(&motif.gene)
    .ok_or_else(|| {
      make_internal_report!(
        "Aa motif search: unable to find translation for reference gene: '{}'",
        motif.gene
      )
    })?
    .seq;

  let begin = motif.position;
  let end = begin + motif.seq.len();
  let ref_seq = from_aa_seq(&ref_seq[begin..end]);

  Ok(AaMotifMutation {
    name: motif.name.clone(),
    gene: motif.gene.clone(),
    position: motif.position,
    ref_seq,
    qry_seq: motif.seq.clone(),
  })
}

// Add query sequence fragment to motif
fn add_qry_seq(motif: &AaMotif, translations: &[Translation]) -> Option<AaMotifMutation> {
  translations.iter().find(|tr| tr.gene_name == motif.gene).map(|tr| {
    let begin = motif.position;
    let end = begin + motif.seq.len();
    let qry_seq = from_aa_seq(&tr.seq[begin..end]);
    AaMotifMutation {
      name: motif.name.clone(),
      gene: motif.gene.clone(),
      position: motif.position,
      ref_seq: motif.seq.clone(),
      qry_seq,
    }
  })
}
