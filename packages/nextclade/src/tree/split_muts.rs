use crate::alphabet::letter::Letter;
use crate::analyze::aa_sub::AaSub;
use crate::analyze::abstract_mutation::{AbstractMutation, CloneableMutation, MutParams};
use crate::analyze::find_private_nuc_mutations::BranchMutations;
use crate::coord::position::PositionLike;
use crate::make_internal_error;
use eyre::{Report, WrapErr};
use itertools::{chain, Itertools};
use std::collections::BTreeMap;
use std::fmt::Display;

#[derive(Debug, Clone)]
pub struct SplitMutsResult {
  pub left: BranchMutations,
  pub shared: BranchMutations,
  pub right: BranchMutations,
}

/// Splits 2 sets of mutations (left and right), with respect to their positions, into 3 subsets:
///  - shared: mutations contained in both sets
///  - left: mutations contained only in the left set
///  - right: mutations contained only in the right set
pub fn split_muts(left: &BranchMutations, right: &BranchMutations) -> Result<SplitMutsResult, Report> {
  let Split3WayResult {
    left: subs_left,
    shared: subs_shared,
    right: subs_right,
  } = split_3_way(&left.nuc_muts, &right.nuc_muts).wrap_err("When splitting private nucleotide substitutions")?;

  let SplitAaMutsResult {
    aa_muts_left,
    aa_muts_shared,
    aa_muts_right,
  } = split_aa_muts(&left.aa_muts, &right.aa_muts).wrap_err("When splitting private aminoacid mutations")?;

  Ok(SplitMutsResult {
    left: BranchMutations {
      nuc_muts: subs_left,
      aa_muts: aa_muts_left,
    },
    shared: BranchMutations {
      nuc_muts: subs_shared,
      aa_muts: aa_muts_shared,
    },
    right: BranchMutations {
      nuc_muts: subs_right,
      aa_muts: aa_muts_right,
    },
  })
}

#[derive(Debug, Clone)]
struct SplitAaMutsResult {
  aa_muts_left: BTreeMap<String, Vec<AaSub>>,
  aa_muts_shared: BTreeMap<String, Vec<AaSub>>,
  aa_muts_right: BTreeMap<String, Vec<AaSub>>,
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
  left: Vec<T>,
  shared: Vec<T>,
  right: Vec<T>,
}

fn split_3_way<P, L, M>(left: &[M], right: &[M]) -> Result<Split3WayResult<M>, Report>
where
  P: PositionLike,
  L: Letter<L>,
  M: AbstractMutation<P, L> + Clone + Ord + Display,
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
      if left.ref_letter() != right.ref_letter() {
        return make_internal_error!(
          "Found mutations with the same position, but different reference letters: {left} and {right}"
        );
      }

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
pub fn union_of_muts(left: &BranchMutations, right: &BranchMutations) -> Result<BranchMutations, Report> {
  Ok(BranchMutations {
    nuc_muts: union(&left.nuc_muts, &right.nuc_muts)
      .wrap_err("When calculating union of private nucleotide substitutions")?,
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
  M: AbstractMutation<P, L> + CloneableMutation<P, L> + Clone + Ord + Display,
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
      } else {
        return make_internal_error!("Found mutations which cannot be merged: {left} and {right}");
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
pub fn difference_of_muts(left: &BranchMutations, right: &BranchMutations) -> Result<BranchMutations, Report> {
  Ok(BranchMutations {
    nuc_muts: difference(&left.nuc_muts, &right.nuc_muts)
      .wrap_err("When calculating difference of private nucleotide substitutions")?,
    aa_muts: difference_of_aa_muts(&left.aa_muts, &right.aa_muts)
      .wrap_err("When calculating difference of private aminoacid mutations")?,
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
  M: AbstractMutation<P, L> + CloneableMutation<P, L> + Clone + Ord,
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

#[cfg(test)]
mod tests {
  use super::*;
  use crate::analyze::nuc_sub::NucSub;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::str::FromStr;

  fn to_nuc_subs(muts: &[&str]) -> Vec<NucSub> {
    muts.iter().map(|m| NucSub::from_str(m).unwrap()).collect_vec()
  }

  fn from_nuc_subs(muts: &[NucSub]) -> Vec<String> {
    muts.iter().map(NucSub::to_string).collect_vec()
  }

  #[rstest]
  fn calculates_split_3_way_of_nuc_subs() -> Result<(), Report> {
    let Split3WayResult { left, shared, right } = split_3_way(
      &to_nuc_subs(&["A1G", "A3C", "C4G"]),
      &to_nuc_subs(&["C2T", "A3C", "C4T"]),
    )?;
    assert_eq!(from_nuc_subs(&left), &["A1G", "C4G"]);
    assert_eq!(from_nuc_subs(&shared), &["A3C"]);
    assert_eq!(from_nuc_subs(&right), &["C2T", "C4T"]);
    Ok(())
  }

  #[rstest]
  fn calculates_difference_of_nuc_subs() -> Result<(), Report> {
    let actual = difference(
      &to_nuc_subs(&["A1G", "C2T", "A3C", "C4G"]),
      &to_nuc_subs(&["C2T", "G3C", "C4A"]),
    )?;

    // at pos 3: left is A->C, we subtract G->C ==> A->G (diff first, then right to yield left)
    // at pos 4: left is C->G, we subtract C->A ==> A->G (right first, then diff)

    assert_eq!(from_nuc_subs(&actual), &["A1G", "A3G", "A4G"]);
    Ok(())
  }

  #[rstest]
  fn calculates_union_of_nuc_subs() -> Result<(), Report> {
    let actual = union(
      &to_nuc_subs(&["A1G", "A3G", "A4G"]),
      &to_nuc_subs(&["C2T", "G3C", "C4A"]),
    )?;

    // at pos 3: A->G->C ==> A->C (left first)
    // at pos 4: C->A->G ==> C->G (right first)

    assert_eq!(from_nuc_subs(&actual), &["A1G", "C2T", "A3C", "C4G"]);
    Ok(())
  }
}
