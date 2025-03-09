use std::collections::{BTreeMap, HashMap};
use std::hash::Hash;

// #[cfg(feature = "indexmap")]
use indexmap::IndexMap;

use multimap::MultiMap;

/// Generic interface for maps: HashMap, BTreeMap, IndexMap
pub trait Map<K, V> {
  fn keys<'a>(&'a self) -> impl Iterator<Item = &'a K>
  where
    K: 'a;

  fn get(&self, key: &K) -> Option<&V>;

  fn get_mut(&mut self, key: &K) -> Option<&mut V>;

  fn insert(&mut self, key: K, value: V) -> Option<V>;

  fn remove(&mut self, key: &K) -> Option<V>;

  fn values<'a>(&'a self) -> impl Iterator<Item = &'a V>
  where
    V: 'a;

  fn values_mut<'a>(&'a mut self) -> impl Iterator<Item = &'a mut V>
  where
    V: 'a;

  fn contains_key(&self, key: &K) -> bool;

  fn len(&self) -> usize;

  fn is_empty(&self) -> bool;

  fn clear(&mut self);

  fn iter<'a>(&'a self) -> impl Iterator<Item = (&'a K, &'a V)>
  where
    K: 'a,
    V: 'a;

  fn iter_mut<'a>(&'a mut self) -> impl Iterator<Item = (&'a K, &'a mut V)>
  where
    K: 'a,
    V: 'a;

  fn get_key_value(&self, key: &K) -> Option<(&K, &V)>;

  fn retain<F>(&mut self, f: F)
  where
    F: FnMut(&K, &mut V) -> bool;

  fn extend<I>(&mut self, iter: I)
  where
    I: IntoIterator<Item = (K, V)>;
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

  fn get_mut(&mut self, key: &K) -> Option<&mut V> {
    self.get_mut(key)
  }

  fn insert(&mut self, key: K, value: V) -> Option<V> {
    self.insert(key, value)
  }

  fn remove(&mut self, key: &K) -> Option<V> {
    self.remove(key)
  }

  fn values<'a>(&'a self) -> impl Iterator<Item = &'a V>
  where
    V: 'a,
  {
    self.values()
  }

  fn values_mut<'a>(&'a mut self) -> impl Iterator<Item = &'a mut V>
  where
    V: 'a,
  {
    self.values_mut()
  }

  fn contains_key(&self, key: &K) -> bool {
    self.contains_key(key)
  }

  fn len(&self) -> usize {
    self.len()
  }

  fn is_empty(&self) -> bool {
    self.is_empty()
  }

  fn clear(&mut self) {
    self.clear();
  }

  fn iter<'a>(&'a self) -> impl Iterator<Item = (&'a K, &'a V)>
  where
    K: 'a,
    V: 'a,
  {
    self.iter()
  }

  fn iter_mut<'a>(&'a mut self) -> impl Iterator<Item = (&'a K, &'a mut V)>
  where
    K: 'a,
    V: 'a,
  {
    self.iter_mut()
  }

  fn get_key_value(&self, key: &K) -> Option<(&K, &V)> {
    self.get_key_value(key)
  }

  fn retain<F>(&mut self, f: F)
  where
    F: FnMut(&K, &mut V) -> bool,
  {
    self.retain(f);
  }

  fn extend<I>(&mut self, iter: I)
  where
    I: IntoIterator<Item = (K, V)>,
  {
    Extend::extend(self, iter);
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

  fn get_mut(&mut self, key: &K) -> Option<&mut V> {
    self.get_mut(key)
  }

  fn insert(&mut self, key: K, value: V) -> Option<V> {
    self.insert(key, value)
  }

  fn remove(&mut self, key: &K) -> Option<V> {
    self.remove(key)
  }

  fn values<'a>(&'a self) -> impl Iterator<Item = &'a V>
  where
    V: 'a,
  {
    self.values()
  }

  fn values_mut<'a>(&'a mut self) -> impl Iterator<Item = &'a mut V>
  where
    V: 'a,
  {
    self.values_mut()
  }

  fn contains_key(&self, key: &K) -> bool {
    self.contains_key(key)
  }

  fn len(&self) -> usize {
    self.len()
  }

  fn is_empty(&self) -> bool {
    self.is_empty()
  }

  fn clear(&mut self) {
    self.clear();
  }

  fn iter<'a>(&'a self) -> impl Iterator<Item = (&'a K, &'a V)>
  where
    K: 'a,
    V: 'a,
  {
    self.iter()
  }

  fn iter_mut<'a>(&'a mut self) -> impl Iterator<Item = (&'a K, &'a mut V)>
  where
    K: 'a,
    V: 'a,
  {
    self.iter_mut()
  }

  fn get_key_value(&self, key: &K) -> Option<(&K, &V)> {
    self.get_key_value(key)
  }

  fn retain<F>(&mut self, f: F)
  where
    F: FnMut(&K, &mut V) -> bool,
  {
    self.retain(f);
  }

  fn extend<I>(&mut self, iter: I)
  where
    I: IntoIterator<Item = (K, V)>,
  {
    Extend::extend(self, iter);
  }
}

// #[cfg(feature = "indexmap")]
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
    self.get(key)
  }

  fn get_mut(&mut self, key: &K) -> Option<&mut V> {
    self.get_mut(key)
  }

  fn insert(&mut self, key: K, value: V) -> Option<V> {
    self.insert(key, value)
  }

  fn remove(&mut self, key: &K) -> Option<V> {
    self.remove(key)
  }

  fn values<'a>(&'a self) -> impl Iterator<Item = &'a V>
  where
    V: 'a,
  {
    self.values()
  }

  fn values_mut<'a>(&'a mut self) -> impl Iterator<Item = &'a mut V>
  where
    V: 'a,
  {
    self.values_mut()
  }

  fn contains_key(&self, key: &K) -> bool {
    self.contains_key(key)
  }

  fn len(&self) -> usize {
    self.len()
  }

  fn is_empty(&self) -> bool {
    self.is_empty()
  }

  fn clear(&mut self) {
    self.clear();
  }

  fn iter<'a>(&'a self) -> impl Iterator<Item = (&'a K, &'a V)>
  where
    K: 'a,
    V: 'a,
  {
    self.iter()
  }

  fn iter_mut<'a>(&'a mut self) -> impl Iterator<Item = (&'a K, &'a mut V)>
  where
    K: 'a,
    V: 'a,
  {
    self.iter_mut()
  }

  fn get_key_value(&self, key: &K) -> Option<(&K, &V)> {
    self.get_key_value(key)
  }

  fn retain<F>(&mut self, f: F)
  where
    F: FnMut(&K, &mut V) -> bool,
  {
    self.retain(f);
  }

  fn extend<I>(&mut self, iter: I)
  where
    I: IntoIterator<Item = (K, V)>,
  {
    Extend::extend(self, iter);
  }
}

// Returns the key of the maximum value.
//
// If several elements are equally maximum, the last element is returned. If the iterator is empty, None is returned.
pub fn key_of_max_value<'k, K, V: Ord + 'k>(m: &'k impl Map<K, V>) -> Option<&'k K> {
  m.iter().max_by_key(|(_, v)| *v).map(|(k, _)| k)
}

pub fn map_to_multimap<K: Clone + Eq + Hash, V: Clone>(input: &impl Map<K, Vec<V>>) -> MultiMap<K, V> {
  input
    .iter()
    .flat_map(|(k, vals)| vals.iter().map(|v| (k.clone(), v.clone())))
    .collect()
}
