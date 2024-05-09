use std::collections::{BTreeMap, HashMap};
use std::hash::Hash;

#[cfg(feature = "indexmap")]
use indexmap::IndexMap;

/// Generic interface for maps: HashMap, BTreeMap, IndexMap
pub trait Map<K, V> {
  fn keys<'a>(&'a self) -> impl Iterator<Item = &'a K>
  where
    K: 'a;

  fn get(&self, key: &K) -> Option<&V>;
}

impl<K, V> Map<K, V> for BTreeMap<K, V>
where
  K: Ord,
{
  fn keys<'a>(&'a self) -> impl Iterator<Item = &'a K>
  where
    K: 'a,
  {
    self.keys()
  }

  fn get(&self, key: &K) -> Option<&V> {
    self.get(key)
  }
}

impl<K, V> Map<K, V> for HashMap<K, V>
where
  K: Eq + Hash,
{
  fn keys<'a>(&'a self) -> impl Iterator<Item = &'a K>
  where
    K: 'a,
  {
    self.keys()
  }

  fn get(&self, key: &K) -> Option<&V> {
    self.get(key)
  }
}

#[cfg(feature = "indexmap")]
impl<K, V> Map<K, V> for IndexMap<K, V>
where
  K: Eq + Hash,
{
  fn keys<'a>(&'a self) -> impl Iterator<Item = &'a K>
  where
    K: 'a,
  {
    self.keys()
  }

  fn get(&self, key: &K) -> Option<&V> {
    IndexMap::get(self, key)
  }
}
