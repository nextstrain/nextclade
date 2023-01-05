use crate::analyze::find_aa_motifs::{AaMotif, AaMotifWithoutSeq};
use crate::utils::collections::{cloned_into, zip_map_hashmap};
use itertools::{Itertools, Zip};
use rayon::iter::Either;
use serde::{Deserialize, Serialize};
use std::collections::{BTreeMap, HashSet};
use std::fmt::Debug;

pub type AaMotifsMap = BTreeMap<String, Vec<AaMotif>>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AaMotifChanges {
  pub preserved: Vec<AaMotif>,
  pub gained: Vec<AaMotif>,
  pub lost: Vec<AaMotif>,
  pub mutated: Vec<AaMotifMutation>,
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
) -> BTreeMap<String, AaMotifChanges> {
  zip_map_hashmap(aa_motifs_ref, aa_motifs_qry, |_, motifs_ref, motifs_qry| {
    find_aa_motifs_changes_one(motifs_ref, motifs_qry)
  })
  .collect()
}

fn find_aa_motifs_changes_one(motifs_ref: &[AaMotif], motifs_qry: &[AaMotif]) -> AaMotifChanges {
  // We want to find added and removed positions (`.pos`) per gene.
  // So we use a wrapper for `struct AaMotif` which disregards `.seq` during comparison.
  let motifs_ref: HashSet<AaMotifWithoutSeq> = motifs_ref.iter().cloned().map(AaMotifWithoutSeq::from).collect();
  let motifs_qry: HashSet<AaMotifWithoutSeq> = motifs_qry.iter().cloned().map(AaMotifWithoutSeq::from).collect();

  // Gained motifs: not present in ref, present in qry
  let gained: Vec<AaMotif> = cloned_into(motifs_ref.difference(&motifs_qry)).sorted().collect_vec();

  // Lost motifs: present in ref, not present in query
  let lost: Vec<AaMotif> = cloned_into(motifs_qry.difference(&motifs_ref)).sorted().collect_vec();

  // Kept motifs: present in ref and qry
  let kept = {
    // Zip ref and qry motifs, so that we can compare them pairwise
    let kept_ref: Vec<AaMotif> = cloned_into(motifs_ref.intersection(&motifs_qry)).sorted().collect_vec();
    let kept_qry: Vec<AaMotif> = cloned_into(motifs_qry.intersection(&motifs_ref)).sorted().collect_vec();
    Zip::from((kept_ref, kept_qry)).collect_vec()
  };

  // Split kept motifs into 2 groups: with sequences mutated compared to reference and with sequences preserved.
  let (preserved, mutated) = {
    let (mut preserved, mut mutated): (Vec<AaMotif>, Vec<AaMotifMutation>) =
      kept.into_iter().partition_map(|(motif_ref, motif_qry)| {
        if motif_ref.seq == motif_qry.seq {
          Either::Left(motif_ref)
        } else {
          Either::Right(AaMotifMutation {
            name: motif_ref.name,
            gene: motif_ref.gene,
            position: motif_ref.position,
            ref_seq: motif_ref.seq,
            qry_seq: motif_qry.seq,
          })
        }
      });
    preserved.sort();
    mutated.sort();
    (preserved, mutated)
  };

  AaMotifChanges {
    preserved,
    gained,
    lost,
    mutated,
  }
}
