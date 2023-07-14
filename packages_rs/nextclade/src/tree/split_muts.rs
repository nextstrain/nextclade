use crate::alphabet::letter::Letter;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::abstract_mutation::{AbstractMutation, MutParams};
use crate::analyze::find_private_nuc_mutations::PrivateMutationsMinimal;
use crate::coord::position::PositionLike;
use eyre::{Report, WrapErr};
use itertools::{chain, Itertools};
use regex::internal::Input;
use std::collections::BTreeMap;
use std::hash::Hash;

#[derive(Debug, Clone)]
pub struct SplitMutsResult {
  pub left: PrivateMutationsMinimal,
  pub shared: PrivateMutationsMinimal,
  pub right: PrivateMutationsMinimal,
}

/// Splits 2 sets of mutations (left and right), with respect to their positions, into 3 subsets:
///  - shared: mutations contained in both sets
///  - left: mutations contained only in the left set
///  - right: mutations contained only in the right set
pub fn split_muts(left: &PrivateMutationsMinimal, right: &PrivateMutationsMinimal) -> Result<SplitMutsResult, Report> {
  let Split3WayResult {
    left: subs_left,
    shared: subs_shared,
    right: subs_right,
  } = split_3_way(&left.nuc_subs, &right.nuc_subs).wrap_err("When splitting private nucleotide substitutions")?;

  let Split3WayResult {
    left: dels_left,
    shared: dels_shared,
    right: dels_right,
  } = split_3_way(&left.nuc_dels, &right.nuc_dels).wrap_err("When splitting private nucleotide deletions")?;

  let SplitAaMutsResult {
    aa_muts_left,
    aa_muts_shared,
    aa_muts_right,
  } = split_aa_muts(&left.aa_muts, &right.aa_muts).wrap_err("When splitting private aminoacid mutations")?;

  Ok(SplitMutsResult {
    left: PrivateMutationsMinimal {
      nuc_subs: subs_left,
      nuc_dels: dels_left,
      aa_muts: aa_muts_left,
    },
    shared: PrivateMutationsMinimal {
      nuc_subs: subs_shared,
      nuc_dels: dels_shared,
      aa_muts: aa_muts_shared,
    },
    right: PrivateMutationsMinimal {
      nuc_subs: subs_right,
      nuc_dels: dels_right,
      aa_muts: aa_muts_right,
    },
  })
}

#[derive(Debug, Clone)]
struct SplitAaMutsResult {
  pub aa_muts_left: BTreeMap<String, Vec<AaSub>>,
  pub aa_muts_shared: BTreeMap<String, Vec<AaSub>>,
  pub aa_muts_right: BTreeMap<String, Vec<AaSub>>,
}

fn split_aa_muts(
  left: &BTreeMap<String, Vec<AaSub>>,
  right: &BTreeMap<String, Vec<AaSub>>,
) -> Result<SplitAaMutsResult, Report> {
  let mut aa_muts_left = BTreeMap::<String, Vec<AaSub>>::new();
  let mut aa_muts_shared = BTreeMap::<String, Vec<AaSub>>::new();
  let mut aa_muts_right = BTreeMap::<String, Vec<AaSub>>::new();
  for (cds_name, left, right) in zip_aa_muts(left, right) {
    let split = split_3_way(&left, &right)?;
    aa_muts_left.insert(cds_name.clone(), split.left);
    aa_muts_shared.insert(cds_name.clone(), split.shared);
    aa_muts_right.insert(cds_name.clone(), split.right);
  }
  Ok(SplitAaMutsResult {
    aa_muts_left,
    aa_muts_shared,
    aa_muts_right,
  })
}

#[derive(Debug, Clone)]
struct Split3WayResult<T> {
  pub left: Vec<T>,
  pub shared: Vec<T>,
  pub right: Vec<T>,
}

fn split_3_way<P, L, M>(left: &[M], right: &[M]) -> Result<Split3WayResult<M>, Report>
where
  P: PositionLike,
  L: Letter<L>,
  M: AbstractMutation<P, L> + Clone + Ord,
{
  let mut subset_shared = Vec::with_capacity(left.len() + right.len());
  let mut subset_left = Vec::with_capacity(left.len());
  let mut subset_right = Vec::with_capacity(right.len());

  // Sort iterators so that we can iterate in unison
  let mut left_iter = left.iter().sorted();
  let mut right_iter = right.iter().sorted();

  let mut left_curr = left_iter.next();
  let mut right_curr = right_iter.next();

  // While there are elements in both left and right iterator
  while let (Some(left), Some(right)) = (left_curr, right_curr) {
    if left.pos() == right.pos() {
      if left.ref_letter() == right.ref_letter() && left.qry_letter() == right.qry_letter() {
        subset_shared.push(left.clone());
      } else {
        subset_left.push(left.clone());
        subset_right.push(right.clone());
      }
      left_curr = left_iter.next();
      right_curr = right_iter.next();
    } else if left.pos() < right.pos() {
      subset_left.push(left.clone());
      left_curr = left_iter.next();
    } else {
      subset_right.push(right.clone());
      right_curr = right_iter.next();
    }
  }

  if let Some(left_curr) = left_curr {
    subset_left.push(left_curr.clone());
  }
  if let Some(right_curr) = right_curr {
    subset_right.push(right_curr.clone());
  }

  // At this point one of the iterators is empty.
  // Clone remaining items from the other iterator into their corresponding set.
  subset_left.extend(left_iter.cloned());
  subset_right.extend(right_iter.cloned());

  // Save some memory
  subset_left.shrink_to_fit();
  subset_shared.shrink_to_fit();
  subset_right.shrink_to_fit();

  // Make sure results are ordered
  subset_left.sort();
  subset_shared.sort();
  subset_right.sort();

  Ok(Split3WayResult {
    left: subset_left,
    shared: subset_shared,
    right: subset_right,
  })
}

/// Calculates set-union of 2 sets of mutations, with respect to their positions.
pub fn union_of_muts(
  left: &PrivateMutationsMinimal,
  right: &PrivateMutationsMinimal,
) -> Result<PrivateMutationsMinimal, Report> {
  Ok(PrivateMutationsMinimal {
    nuc_subs: union(&left.nuc_subs, &right.nuc_subs)
      .wrap_err("When calculating union of private nucleotide substitutions")?,
    nuc_dels: union(&left.nuc_dels, &right.nuc_dels)
      .wrap_err("When calculating union of private nucleotide deletions")?,
    aa_muts: union_of_aa_muts(&left.aa_muts, &right.aa_muts)
      .wrap_err("When calculating union of private aminoacid mutations")?,
  })
}

fn union_of_aa_muts(
  left: &BTreeMap<String, Vec<AaSub>>,
  right: &BTreeMap<String, Vec<AaSub>>,
) -> Result<BTreeMap<String, Vec<AaSub>>, Report> {
  zip_aa_muts(left, right)
    .map(|(cds_name, left, right)| Ok((cds_name, union(&left, &right)?)))
    .collect()
}

fn union<P, L, M>(left: &[M], right: &[M]) -> Result<Vec<M>, Report>
where
  P: PositionLike,
  L: Letter<L>,
  M: AbstractMutation<P, L> + Clone + Ord,
{
  let mut union = Vec::with_capacity(left.len() + right.len());

  // Sort iterators so that we can iterate in unison
  let mut left_iter = left.iter().sorted();
  let mut right_iter = right.iter().sorted();

  let mut left_curr = left_iter.next();
  let mut right_curr = right_iter.next();

  // While there are elements in both left and right iterator
  while let (Some(left), Some(right)) = (left_curr, right_curr) {
    if left.pos() == right.pos() {
      if left.ref_letter() == right.qry_letter() {
        union.push(left.clone_with(MutParams {
          pos: left.pos(),
          ref_letter: right.ref_letter(),
          qry_letter: left.qry_letter(),
        }));
      } else if left.qry_letter() == right.ref_letter() {
        union.push(left.clone_with(MutParams {
          pos: left.pos(),
          ref_letter: left.ref_letter(),
          qry_letter: right.qry_letter(),
        }));
      }
      left_curr = left_iter.next();
      right_curr = right_iter.next();
    }
    // If positions don't match, copy muts as is
    else if left.pos() < right.pos() {
      union.push(left.to_owned());
      left_curr = left_iter.next();
    }
    // If positions don't match, copy muts as is
    else {
      union.push(right.to_owned());
      right_curr = right_iter.next();
    }
  }

  if let Some(left_curr) = left_curr {
    union.push(left_curr.clone());
  }
  if let Some(right_curr) = right_curr {
    union.push(right_curr.clone());
  }

  // At this point one of the iterators is empty. Clone muts from the other iterator into the union as is.
  union.extend(left_iter.cloned());
  union.extend(right_iter.cloned());

  union.sort();

  Ok(union)
}

/// Calculates set-difference of 2 sets of mutations, with respect to their positions.
pub fn difference_of_muts(
  left: &PrivateMutationsMinimal,
  right: &PrivateMutationsMinimal,
) -> Result<PrivateMutationsMinimal, Report> {
  Ok(PrivateMutationsMinimal {
    nuc_subs: difference(&left.nuc_subs, &right.nuc_subs)
      .wrap_err("When calculating union of private nucleotide substitutions")?,
    nuc_dels: difference(&left.nuc_dels, &right.nuc_dels)
      .wrap_err("When calculating union of private nucleotide deletions")?,
    aa_muts: difference_of_aa_muts(&left.aa_muts, &right.aa_muts)
      .wrap_err("When calculating union of private aminoacid mutations")?,
  })
}

fn difference_of_aa_muts(
  left: &BTreeMap<String, Vec<AaSub>>,
  right: &BTreeMap<String, Vec<AaSub>>,
) -> Result<BTreeMap<String, Vec<AaSub>>, Report> {
  zip_aa_muts(left, right)
    .map(|(cds_name, left, right)| Ok((cds_name, difference(&left, &right)?)))
    .collect()
}

fn difference<P, L, M>(left: &[M], right: &[M]) -> Result<Vec<M>, Report>
where
  P: PositionLike,
  L: Letter<L>,
  M: AbstractMutation<P, L> + Clone + Ord,
{
  let mut diff = Vec::with_capacity(left.len() + right.len());

  // Sort iterators so that we can iterate in unison
  let mut left_iter = left.iter().sorted();
  let mut right_iter = right.iter().sorted();

  let mut left_curr = left_iter.next();
  let mut right_curr = right_iter.next();

  // While there are elements in both left and right iterator
  while let (Some(left), Some(right)) = (left_curr, right_curr) {
    // Same position: this mutation is excluded from the result. Advance both iterators.
    if left.pos() == right.pos() {
      if (left.ref_letter() == right.ref_letter()) && (left.qry_letter() != right.qry_letter()) {
        diff.push(left.clone_with(MutParams {
          pos: left.pos(),
          ref_letter: right.qry_letter(),
          qry_letter: left.qry_letter(),
        }));
      } else if (left.qry_letter() == right.qry_letter()) && (left.ref_letter() != right.ref_letter()) {
        diff.push(left.clone_with(MutParams {
          pos: left.pos(),
          ref_letter: left.ref_letter(),
          qry_letter: right.ref_letter(),
        }));
      }
      right_curr = right_iter.next();
      left_curr = left_iter.next();
    }
    // Left position is smaller: include it and advance left iterator.
    else if left.pos() < right.pos() {
      diff.push(left.clone());
      left_curr = left_iter.next();
    }
    // Right position is smaller: include it and advance right iterator.
    else if right.pos() < left.pos() {
      right_curr = right_iter.next();
    }
  }

  if let Some(left_curr) = left_curr {
    diff.push(left_curr.clone());
  }

  // At this point one of the iterators is empty. Clone muts from the other iterator into the difference.
  diff.extend(left_iter.cloned());
  diff.sort();

  Ok(diff)
}

/// Iterate over 2 sets of aminoacid mutations, separately for each CDS. If there are no mutations in one of the
/// sets, then an empty list is yielded. Only CDSes present in one or both of the sets are considered.
fn zip_aa_muts<'a>(
  left: &'a BTreeMap<String, Vec<AaSub>>,
  right: &'a BTreeMap<String, Vec<AaSub>>,
) -> impl Iterator<Item = (String, Vec<AaSub>, Vec<AaSub>)> + 'a {
  chain!(left.keys(), right.keys()).unique().cloned().map(|cds_name| {
    let aa_muts_left = left.get(&cds_name).cloned().unwrap_or_default();
    let aa_muts_right = right.get(&cds_name).cloned().unwrap_or_default();
    (cds_name, aa_muts_left, aa_muts_right)
  })
}
