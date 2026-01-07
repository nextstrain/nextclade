use crate::utils::map::Map;
use itertools::{Itertools, chain};
use std::fmt::Debug;
use std::hash::Hash;
use std::marker::PhantomData;

/// Iterate a pair of maps synchronized by keys
pub fn zip_by_key<'a, M1, M2, K, V1, V2>(map1: &'a M1, map2: &'a M2) -> ZipByKeyIter<'a, K, V1, V2, M1, M2>
where
  K: Ord + Debug + Hash + 'a,
  V1: 'a,
  V2: 'a,
  M1: Map<K, V1>,
  M2: Map<K, V2>,
{
  ZipByKeyIter::new(map1, map2)
}

/// Iterator for a pair of maps, synchronized by keys
pub struct ZipByKeyIter<'a, K, V1, V2, M1: Map<K, V1>, M2: Map<K, V2>> {
  keys: Vec<&'a K>,
  map1: &'a M1,
  map2: &'a M2,
  index: usize,
  _phantom: PhantomData<(V1, V2)>,
}

impl<'a, K, V1, V2, M1, M2> ZipByKeyIter<'a, K, V1, V2, M1, M2>
where
  K: Ord + Debug + Hash + 'a,
  V1: 'a,
  V2: 'a,
  M1: Map<K, V1>,
  M2: Map<K, V2>,
{
  pub fn new(map1: &'a M1, map2: &'a M2) -> Self {
    let keys = chain!(map1.keys(), map2.keys()).unique().sorted().collect_vec();
    ZipByKeyIter {
      keys,
      map1,
      map2,
      index: 0,
      _phantom: PhantomData,
    }
  }
}

impl<'a, K, V1, V2, M1, M2> Iterator for ZipByKeyIter<'a, K, V1, V2, M1, M2>
where
  K: Ord + 'a,
  V1: 'a,
  V2: 'a,
  M1: Map<K, V1>,
  M2: Map<K, V2>,
{
  type Item = (&'a K, Option<&'a V1>, Option<&'a V2>);

  fn next(&mut self) -> Option<Self::Item> {
    if self.index >= self.keys.len() {
      return None;
    }
    let key = self.keys[self.index];
    let value1 = self.map1.get(key);
    let value2 = self.map2.get(key);
    self.index += 1;
    Some((key, value1, value2))
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use maplit::{btreemap, hashmap};
  use pretty_assertions::assert_eq;

  #[cfg(feature = "indexmap")]
  use indexmap::indexmap;

  #[test]
  fn test_zip_by_key_hashmap() {
    let map1 = hashmap! {
        'a' => "alpha",
        'b' => "bravo",
        'c' => "charlie",
    };

    let map2 = hashmap! {
        'b' => "beans",
        'c' => "carrots",
        'd' => "dill",
    };

    let mut iter = zip_by_key(&map1, &map2);

    assert_eq!(iter.next(), Some((&'a', Some(&"alpha"), None)));
    assert_eq!(iter.next(), Some((&'b', Some(&"bravo"), Some(&"beans"))));
    assert_eq!(iter.next(), Some((&'c', Some(&"charlie"), Some(&"carrots"))));
    assert_eq!(iter.next(), Some((&'d', None, Some(&"dill"))));
    assert_eq!(iter.next(), None);
  }

  #[test]
  fn test_zip_by_key_btreemap() {
    let map1 = btreemap! {
        'a' => "alpha",
        'b' => "bravo",
        'c' => "charlie",
    };

    let map2 = btreemap! {
        'b' => "beans",
        'c' => "carrots",
        'd' => "dill",
    };

    let mut iter = zip_by_key(&map1, &map2);

    assert_eq!(iter.next(), Some((&'a', Some(&"alpha"), None)));
    assert_eq!(iter.next(), Some((&'b', Some(&"bravo"), Some(&"beans"))));
    assert_eq!(iter.next(), Some((&'c', Some(&"charlie"), Some(&"carrots"))));
    assert_eq!(iter.next(), Some((&'d', None, Some(&"dill"))));
    assert_eq!(iter.next(), None);
  }

  #[cfg(feature = "indexmap")]
  #[test]
  fn test_zip_by_key_indexmap() {
    let map1 = indexmap! {
        'a' => "alpha",
        'b' => "bravo",
        'c' => "charlie",
    };

    let map2 = indexmap! {
        'b' => "beans",
        'c' => "carrots",
        'd' => "dill",
    };

    let mut iter = zip_by_key(&map1, &map2);

    assert_eq!(iter.next(), Some((&'a', Some(&"alpha"), None)));
    assert_eq!(iter.next(), Some((&'b', Some(&"bravo"), Some(&"beans"))));
    assert_eq!(iter.next(), Some((&'c', Some(&"charlie"), Some(&"carrots"))));
    assert_eq!(iter.next(), Some((&'d', None, Some(&"dill"))));
    assert_eq!(iter.next(), None);
  }
}
