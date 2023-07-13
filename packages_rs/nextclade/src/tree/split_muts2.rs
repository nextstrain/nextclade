use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_private_nuc_mutations::PrivateMutationsMinimal;
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
fn split_muts2(left: &PrivateMutationsMinimal, right: &PrivateMutationsMinimal) -> SplitMutsResult {
  let mut subs_shared = Vec::<NucSub>::new();
  let mut subs_left = Vec::<NucSub>::new();
  let mut subs_right = Vec::<NucSub>::new();
  let mut i = 0;
  let mut j = 0;
  while (i < left.nuc_subs.len()) && (j < right.nuc_subs.len()) {
    if left.nuc_subs[i].pos == right.nuc_subs[j].pos {
      // Position is also mutated in node
      if left.nuc_subs[i].ref_nuc == right.nuc_subs[j].ref_nuc && left.nuc_subs[i].qry_nuc == right.nuc_subs[j].qry_nuc
      {
        subs_shared.push(left.nuc_subs[i].clone()); // the exact mutation is shared between node and seq
      } else {
        subs_left.push(left.nuc_subs[i].clone());
        subs_right.push(right.nuc_subs[j].clone());
      }
      i += 1;
      j += 1;
    } else if left.nuc_subs[i].pos < right.nuc_subs[j].pos {
      subs_left.push(left.nuc_subs[i].clone());
      i += 1;
    } else {
      subs_right.push(right.nuc_subs[j].clone());
      j += 1;
    }
  }
  while i < left.nuc_subs.len() {
    subs_left.push(left.nuc_subs[i].clone());
    i += 1;
  }
  while j < right.nuc_subs.len() {
    subs_right.push(right.nuc_subs[j].clone());
    j += 1;
  }

  ////////////////////////////////////////////////////////////////////////

  let mut i = 0;
  let mut j = 0;
  let mut dels_shared = Vec::<NucDel>::new();
  let mut dels_left = Vec::<NucDel>::new();
  let mut dels_right = Vec::<NucDel>::new();

  while (i < left.nuc_dels.len()) && (j < right.nuc_dels.len()) {
    if left.nuc_dels[i].pos == right.nuc_dels[j].pos {
      // Position is also a deletion in node
      dels_shared.push(left.nuc_dels[i].clone()); // the exact mutation is shared between node and seq
      i += 1;
      j += 1;
    } else if left.nuc_dels[i].pos < right.nuc_dels[j].pos {
      dels_left.push(left.nuc_dels[i].clone());
      i += 1;
    } else {
      dels_right.push(right.nuc_dels[j].clone());
      j += 1;
    }
  }
  while i < left.nuc_dels.len() {
    dels_left.push(left.nuc_dels[i].clone());
    i += 1;
  }
  while j < right.nuc_dels.len() {
    dels_right.push(right.nuc_dels[j].clone());
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
    left: PrivateMutationsMinimal {
      nuc_subs: subs_left,
      nuc_dels: dels_left,
      aa_muts: aa_subs_left,
    },
    shared: PrivateMutationsMinimal {
      nuc_subs: subs_shared,
      nuc_dels: dels_shared,
      aa_muts: aa_subs_shared,
    },
    right: PrivateMutationsMinimal {
      nuc_subs: subs_right,
      nuc_dels: dels_right,
      aa_muts: aa_subs_right,
    },
  }
}
