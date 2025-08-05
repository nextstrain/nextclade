use indexmap::IndexMap;
use itertools::Itertools;
use std::collections::HashMap;
use std::hash::Hash;

pub fn reorder_indexmap<K, V, I>(map: IndexMap<K, V>, canonical: I) -> IndexMap<K, V>
where
  K: Eq + Hash + Clone + Ord,
  V: Clone,
  I: IntoIterator<Item = K>,
{
  let order_map: HashMap<K, usize> = canonical.into_iter().enumerate().map(|(i, k)| (k, i)).collect();
  map
    .into_iter()
    .sorted_by_key(|(k, _)| order_map.get(k).copied().unwrap_or(usize::MAX))
    .collect()
}

#[cfg(test)]
mod tests {
  use super::*;
  use indexmap::indexmap;

  #[test]
  fn test_reorder_indexmap_exact_match_ordering() {
    let input: IndexMap<&str, i32> = indexmap! {
      "b" => 2,
      "a" => 1,
      "c" => 3,
    };
    let canonical = vec!["c", "a", "b"];
    let reordered = reorder_indexmap(input, canonical);
    let expected = indexmap! {
      "c" => 3,
      "a" => 1,
      "b" => 2,
    };
    assert_eq!(reordered, expected);
  }

  #[test]
  fn test_reorder_indexmap_partial_canonical_subset() {
    let input: IndexMap<&str, i32> = indexmap! {
      "x" => 99,
      "a" => 1,
      "b" => 2,
    };
    let canonical = vec!["b", "a"];
    let reordered = reorder_indexmap(input, canonical);
    let expected = indexmap! {
      "b" => 2,
      "a" => 1,
      "x" => 99,
    };
    assert_eq!(reordered, expected);
  }

  #[test]
  fn test_reorder_indexmap_canonical_extra_keys() {
    let input: IndexMap<&str, i32> = indexmap! {
      "a" => 1,
      "b" => 2,
    };
    let canonical = vec!["b", "c", "a"];
    let reordered = reorder_indexmap(input, canonical);
    let expected = indexmap! {
      "b" => 2,
      "a" => 1,
    };
    assert_eq!(reordered, expected);
  }

  #[test]
  fn test_reorder_indexmap_no_overlap() {
    let input: IndexMap<&str, i32> = indexmap! {
      "x" => 1,
      "y" => 2,
    };
    let canonical = vec!["a", "b"];
    let reordered = reorder_indexmap(input, canonical);
    let expected = indexmap! {
      "x" => 1,
      "y" => 2,
    };
    assert_eq!(reordered, expected);
  }
}
