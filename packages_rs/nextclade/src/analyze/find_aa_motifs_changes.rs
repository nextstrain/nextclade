use crate::analyze::find_aa_motifs::{AaMotif, AaMotifWithoutSeq};
use crate::io::aa::from_aa_seq;
use crate::translate::translate_genes::Translation;
use crate::utils::collections::{cloned_into, zip_map_hashmap};
use crate::utils::range::{intersect, Range};
use eyre::Report;
use itertools::{Either, Itertools, Zip};
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
  pub ambiguous: Vec<AaMotifMutation>,
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
  ref_translation: &Translation,
  qry_translation: &Translation,
) -> Result<AaMotifsChangesMap, Report> {
  let query_motif_keys = aa_motifs_qry.keys().collect_vec();

  // Exclude ref motifs missing in query
  let aa_motifs_ref: AaMotifsMap = aa_motifs_ref
    .iter()
    .filter(|(name, _)| query_motif_keys.contains(name))
    .map(|(key, val)| (key.clone(), val.clone()))
    .collect();

  zip_map_hashmap(&aa_motifs_ref, aa_motifs_qry, |name, motifs_ref, motifs_qry| {
    let changes = find_aa_motifs_changes_one(motifs_ref, motifs_qry, ref_translation, qry_translation)?;

    Ok((name.clone(), changes))
  })
  .collect()
}

fn find_aa_motifs_changes_one(
  motifs_ref: &[AaMotif],
  motifs_qry: &[AaMotif],
  ref_translation: &Translation,
  qry_translation: &Translation,
) -> Result<AaMotifChanges, Report> {
  // We want to find added and removed positions (`.pos`) per gene.
  // So we use a wrapper for `struct AaMotif` which disregards `.seq` during comparison.
  let motifs_ref: HashSet<AaMotifWithoutSeq> = motifs_ref.iter().cloned().map(AaMotifWithoutSeq::from).collect();
  let motifs_qry: HashSet<AaMotifWithoutSeq> = motifs_qry.iter().cloned().map(AaMotifWithoutSeq::from).collect();

  // Gained motifs: not present in ref, present in qry
  let gained = motifs_qry
    .difference(&motifs_ref)
    .map(|motif| add_ref_seq(&motif.0, ref_translation))
    .collect::<Result<Vec<AaMotifMutation>, Report>>()?
    .into_iter()
    .sorted()
    .collect_vec();

  // Lost motifs: present in ref, not present in query.
  // Ambiguous motifs: present in ref, contain amino acid X in query.
  let (lost, ambiguous): (Vec<AaMotifMutation>, Vec<AaMotifMutation>) = motifs_ref
    .difference(&motifs_qry)
    .filter_map(|motif| add_qry_seq(&motif.0, qry_translation))
    .sorted()
    .partition_map(|motif_change| {
      if motif_change.qry_seq.to_lowercase().contains('x') {
        Either::Right(motif_change)
      } else {
        Either::Left(motif_change)
      }
    });

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
    ambiguous,
    total,
  })
}

// Add ref sequence fragment to motif
fn add_ref_seq(motif: &AaMotif, ref_translation: &Translation) -> Result<AaMotifMutation, Report> {
  let ref_seq = &ref_translation.get_cds(&motif.cds)?.seq;

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
fn add_qry_seq(motif: &AaMotif, qry_translation: &Translation) -> Option<AaMotifMutation> {
  qry_translation
    .cdses()
    .find(|tr| tr.gene.name == motif.gene && tr.cds.name == motif.cds)
    .and_then(|tr| {
      let begin = motif.position;
      let end = begin + motif.seq.len();
      tr.alignment_ranges.iter().find_map(|alignment_range| {
        let sequenced_motif_range = intersect(alignment_range, &Range::new(begin, end));
        if sequenced_motif_range.len() < motif.seq.len() {
          None
        } else {
          let qry_seq = from_aa_seq(&tr.seq[sequenced_motif_range.begin..sequenced_motif_range.end]);
          Some(AaMotifMutation {
            name: motif.name.clone(),
            gene: motif.gene.clone(),
            position: motif.position,
            ref_seq: motif.seq.clone(),
            qry_seq,
          })
        }
      })
    })
}
