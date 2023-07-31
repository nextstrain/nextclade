use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_private_nuc_mutations::BranchMutations;
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::tree::split_muts::SplitMutsResult;
use itertools::Itertools;
use regex::internal::Input;
use std::collections::{BTreeMap, HashSet};

/// Split mutations into 3 groups:
///  - shared
///  - belonging only to left argument
///  - belonging only to the right argument
pub fn split_muts2(left: &BranchMutations, right: &BranchMutations) -> SplitMutsResult {
  let mut subs_shared = Vec::<NucSub>::new();
  let mut subs_left = Vec::<NucSub>::new();
  let mut subs_right = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < left.nuc_muts.len()) && (j < right.nuc_muts.len()) {
    if left.nuc_muts[i].pos == right.nuc_muts[j].pos {
      // Position is also mutated in node
      if left.nuc_muts[i].ref_nuc == right.nuc_muts[j].ref_nuc && left.nuc_muts[i].qry_nuc == right.nuc_muts[j].qry_nuc
      {
        subs_shared.push(left.nuc_muts[i].clone()); // the exact mutation is shared between node and seq
      } else {
        subs_left.push(left.nuc_muts[i].clone());
        subs_right.push(right.nuc_muts[j].clone());
      }
      i += 1;
      j += 1;
    } else if left.nuc_muts[i].pos < right.nuc_muts[j].pos {
      subs_left.push(left.nuc_muts[i].clone());
      i += 1;
    } else {
      subs_right.push(right.nuc_muts[j].clone());
      j += 1;
    }
  }
  while i < left.nuc_muts.len() {
    subs_left.push(left.nuc_muts[i].clone());
    i += 1;
  }
  while j < right.nuc_muts.len() {
    subs_right.push(right.nuc_muts[j].clone());
    j += 1;
  }

  ////////////////////////////////////////////////////////////////////////

  let mut aa_subs_shared = BTreeMap::<String, Vec<AaSub>>::new();
  let mut aa_subs_left = BTreeMap::<String, Vec<AaSub>>::new();
  let mut aa_subs_right = BTreeMap::<String, Vec<AaSub>>::new();

  let keys_mut_left = left
    .aa_muts
    .keys()
    .map(std::clone::Clone::clone)
    .collect::<HashSet<_>>();
  let keys_mut_right = right
    .aa_muts
    .keys()
    .map(std::clone::Clone::clone)
    .collect::<HashSet<_>>();
  let mut shared_keys = keys_mut_left.intersection(&keys_mut_right).collect_vec();
  shared_keys.sort();

  for gene_name in shared_keys.clone() {
    let aa_muts_left = &left.aa_muts[gene_name];
    let aa_muts_right = &right.aa_muts[gene_name];
    let mut aa_subs_for_gene_shared = Vec::<AaSub>::new();
    let mut aa_subs_for_gene_left = Vec::<AaSub>::new();
    let mut aa_subs_for_gene_right = Vec::<AaSub>::new();
    let mut i = 0;
    let mut j = 0;
    while (i < aa_muts_left.len()) && (j < aa_muts_right.len()) {
      if aa_muts_left[i].pos == aa_muts_right[j].pos {
        // Position is also mutated in node
        if aa_muts_left[i].ref_aa == aa_muts_right[j].ref_aa && aa_muts_left[i].qry_aa == aa_muts_right[j].qry_aa {
          aa_subs_for_gene_shared.push(aa_muts_left[i].clone()); // the exact mutation is shared between node and seq
        } else {
          aa_subs_for_gene_left.push(aa_muts_left[i].clone());
          aa_subs_for_gene_right.push(aa_muts_right[j].clone());
        }
        i += 1;
        j += 1;
      } else if aa_muts_left[i].pos < aa_muts_right[j].pos {
        aa_subs_for_gene_left.push(aa_muts_left[i].clone());
        i += 1;
      } else {
        aa_subs_for_gene_right.push(aa_muts_right[j].clone());
        j += 1;
      }
    }
    while i < aa_muts_left.len() {
      aa_subs_for_gene_left.push(aa_muts_left[i].clone());
      i += 1;
    }
    while j < aa_muts_right.len() {
      aa_subs_for_gene_right.push(aa_muts_right[j].clone());
      j += 1;
    }
    aa_subs_shared.insert(gene_name.to_string(), aa_subs_for_gene_shared);
    aa_subs_left.insert(gene_name.to_string(), aa_subs_for_gene_left);
    aa_subs_right.insert(gene_name.to_string(), aa_subs_for_gene_right);
  }
  for (k, v) in &left.aa_muts {
    if !shared_keys.contains(&k) {
      aa_subs_left.insert(k.to_string(), v.clone());
    }
  }
  for (k, v) in &right.aa_muts {
    if !shared_keys.contains(&k) {
      aa_subs_right.insert(k.to_string(), v.clone());
    }
  }

  ////////////////////////////////////////////////////////////////////////

  SplitMutsResult {
    left: BranchMutations {
      nuc_muts: subs_left,
      aa_muts: aa_subs_left,
    },
    shared: BranchMutations {
      nuc_muts: subs_shared,
      aa_muts: aa_subs_shared,
    },
    right: BranchMutations {
      nuc_muts: subs_right,
      aa_muts: aa_subs_right,
    },
  }
}
