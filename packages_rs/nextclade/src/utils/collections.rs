use crate::make_internal_report;
use eyre::Report;
use itertools::Itertools;
use std::collections::BTreeMap;
use std::fmt::Debug;

pub fn concat_to_vec<T: Clone>(x: &[T], y: &[T]) -> Vec<T> {
  [x, y].into_iter().flatten().cloned().collect()
}

pub fn first<T>(arr: &[T]) -> Result<&T, Report> {
  arr.first().ok_or(make_internal_report!(
    "When attempted to retrieve the first element: Array is empty"
  ))
}

pub fn last<T>(arr: &[T]) -> Result<&T, Report> {
  arr.last().ok_or(make_internal_report!(
    "When attempted to retrieve the first element: Array is empty"
  ))
}

#[macro_export(local_inner_macros)]
macro_rules! hash_set {
  () => (
    std::collections::HashSet::<_, std::collections::hash_map::RandomState>::new()
  );
  ($($x:expr),+ $(,)?) => (
    std::collections::HashSet::<_, std::collections::hash_map::RandomState>::from_iter(std::vec![$($x),+])
  );
}

#[macro_export(local_inner_macros)]
macro_rules! hash_map {
  () => (
    std::collections::HashMap::<_, std::collections::hash_map::RandomState>::new()
  );
  ($($x:expr),+ $(,)?) => (
    std::collections::HashMap::<_, std::collections::hash_map::RandomState>::from_iter(std::vec![$($x),+])
  );
}

pub use hash_map;
pub use hash_set;

// Given an iterator, clone all elements and convert them using `Into` trait
pub fn cloned_into<'x, X, Y>(it: impl Iterator<Item = &'x X>) -> impl Iterator<Item = Y>
where
  X: 'x + Clone + Into<Y>,
{
  it.cloned().map(X::into)
}

// Iterate over 2 Maps synchronized by keys. Assumes Maps have exactly the same keys.
pub fn zip_map_hashmap<'a, K, V1, V2, R, F>(
  left: &'a BTreeMap<K, V1>,
  right: &'a BTreeMap<K, V2>,
  mut f: F,
) -> impl Iterator<Item = (K, R)> + 'a
where
  K: Debug + Clone + Ord + PartialEq,
  F: FnMut(&K, &V1, &V2) -> R + 'a,
{
  debug_assert_eq!(left.keys().sorted().collect_vec(), right.keys().sorted().collect_vec());

  left.iter().map(move |(key, left)| {
    let right = right.get(key).unwrap();
    (key.clone(), f(key, left, right))
  })
}
