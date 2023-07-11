use crate::analyze::aa_sub::AaSub;
use crate::analyze::find_private_nuc_mutations::PrivateMutationsMinimal;
use itertools::Itertools;
use std::collections::{BTreeMap, HashSet};
use std::hash::Hash;

#[derive(Debug, Clone)]
pub struct SplitMutsResult {
  pub left: PrivateMutationsMinimal,
  pub shared: PrivateMutationsMinimal,
  pub right: PrivateMutationsMinimal,
}

/// Split mutations into 3 groups:
///  - shared
///  - belonging only to left argument
///  - belonging only to the right argument
pub fn split_muts(left: &PrivateMutationsMinimal, right: &PrivateMutationsMinimal) -> SplitMutsResult {
  // TODO: conversions between vecs and sets and back involves copying. Even though these sets are small, we might
  //   optimize this code. For example, we can stick with sets everywhere, instead of vecs.
  let subs = split_3_way(left.nuc_subs.iter(), right.nuc_subs.iter());
  let dels = split_3_way(left.nuc_dels.iter(), right.nuc_dels.iter());

  // TODO: We might not need to ungroup aa mutations (by different CDSes) here and then group them again later.
  //   The grouping could be done if and when it is needed (closer to the place where it is used, if at all).
  let aa_muts = split_3_way(left.aa_muts.values().flatten(), right.aa_muts.values().flatten());

  SplitMutsResult {
    left: PrivateMutationsMinimal {
      nuc_subs: subs.left.into_iter().collect_vec(),
      nuc_dels: dels.left.into_iter().collect_vec(),
      aa_muts: group_by_cds(aa_muts.left.into_iter()), // TODO: This grouping might not be needed (see above)
    },
    shared: PrivateMutationsMinimal {
      nuc_subs: subs.shared.into_iter().collect_vec(),
      nuc_dels: dels.shared.into_iter().collect_vec(),
      aa_muts: group_by_cds(aa_muts.shared.into_iter()), // TODO: This grouping might not be needed (see above)
    },
    right: PrivateMutationsMinimal {
      nuc_subs: subs.right.into_iter().collect_vec(),
      nuc_dels: dels.right.into_iter().collect_vec(),
      aa_muts: group_by_cds(aa_muts.right.into_iter()), // TODO: This grouping might not be needed (see above)
    },
  }
}

// Group aminoacid mutations (provided in the form of iterator) by CDS
fn group_by_cds(aa_muts: impl Iterator<Item = AaSub>) -> BTreeMap<String, Vec<AaSub>> {
  aa_muts
    .into_group_map_by(|aa_mut: &AaSub| aa_mut.cds_name.clone())
    .into_iter()
    .collect()
}

#[derive(Debug, Clone)]
struct Split3WayResult<T> {
  pub left: HashSet<T>,
  pub shared: HashSet<T>,
  pub right: HashSet<T>,
}

/// Splits elements of 2 iterators (left and right) into 3 sets:
///  - shared: elements contained in both sets
///  - left: elements contained only in the left set
///  - right: elements contained only in the right set
fn split_3_way<'t, T, I>(left: I, right: I) -> Split3WayResult<T>
where
  T: 't + Ord + Clone + Hash,
  I: Iterator<Item = &'t T>,
{
  let left: HashSet<T> = left.cloned().collect();
  let right: HashSet<T> = right.cloned().collect();
  Split3WayResult {
    left: left.difference(&right).cloned().collect(),
    shared: left.intersection(&right).cloned().collect(),
    right: right.difference(&left).cloned().collect(),
  }
}

/// Calculates set difference of private mutations
pub fn set_difference_of_muts(
  left: &PrivateMutationsMinimal,
  right: &PrivateMutationsMinimal,
) -> PrivateMutationsMinimal {
  // TODO: We might not need to ungroup aa mutations (by different CDSes) here and then group them again later.
  //   The grouping could be done if and when it is needed (closer to the place where it is used, if at all).
  let aa_muts = difference(left.aa_muts.values().flatten(), right.aa_muts.values().flatten());

  PrivateMutationsMinimal {
    nuc_subs: difference(left.nuc_subs.iter(), right.nuc_subs.iter()),
    nuc_dels: difference(left.nuc_dels.iter(), right.nuc_dels.iter()),
    aa_muts: group_by_cds(aa_muts.into_iter()), // TODO: This grouping might not be needed (see above)
  }
}

fn difference<'t, T, I>(left: I, right: I) -> Vec<T>
where
  T: 't + Ord + Clone + Hash,
  I: Iterator<Item = &'t T>,
{
  let left: HashSet<&T> = left.collect();
  let right: HashSet<&T> = right.collect();
  left
    .difference(&right)
    .into_iter()
    .map(|x| (*x).to_owned())
    .collect_vec()
}
