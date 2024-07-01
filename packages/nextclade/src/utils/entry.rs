use std::collections::{btree_map, hash_map};

pub trait MapEntryFallible<'a, K, V, E> {
  fn or_insert_with_fallible<F: FnOnce() -> Result<V, E>>(self, default: F) -> Result<&'a mut V, E>;

  fn or_insert_with_key_fallible<F: FnOnce(&K) -> Result<V, E>>(self, default: F) -> Result<&'a mut V, E>;
}

impl<'a, K: Ord, V, E> MapEntryFallible<'a, K, V, E> for btree_map::Entry<'a, K, V> {
  #[inline]
  fn or_insert_with_fallible<F: FnOnce() -> Result<V, E>>(self, default: F) -> Result<&'a mut V, E> {
    Ok(match self {
      btree_map::Entry::Occupied(entry) => entry.into_mut(),
      btree_map::Entry::Vacant(entry) => entry.insert(default()?),
    })
  }

  #[inline]
  fn or_insert_with_key_fallible<F: FnOnce(&K) -> Result<V, E>>(self, default: F) -> Result<&'a mut V, E> {
    Ok(match self {
      btree_map::Entry::Occupied(entry) => entry.into_mut(),
      btree_map::Entry::Vacant(entry) => {
        let value = default(entry.key())?;
        entry.insert(value)
      }
    })
  }
}

impl<'a, K: Ord, V, E> MapEntryFallible<'a, K, V, E> for hash_map::Entry<'a, K, V> {
  #[inline]
  fn or_insert_with_fallible<F: FnOnce() -> Result<V, E>>(self, default: F) -> Result<&'a mut V, E> {
    Ok(match self {
      hash_map::Entry::Occupied(entry) => entry.into_mut(),
      hash_map::Entry::Vacant(entry) => entry.insert(default()?),
    })
  }

  #[inline]
  fn or_insert_with_key_fallible<F: FnOnce(&K) -> Result<V, E>>(self, default: F) -> Result<&'a mut V, E> {
    Ok(match self {
      hash_map::Entry::Occupied(entry) => entry.into_mut(),
      hash_map::Entry::Vacant(entry) => {
        let value = default(entry.key())?;
        entry.insert(value)
      }
    })
  }
}
