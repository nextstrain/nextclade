use itertools::Itertools;
use std::hash::Hash;

/// Calculate mode (the most frequently occurring element) of an iterator.
/// In case of a tie, the first occurrence is returned. Returns `None` if the iterator is empty.
pub fn mode<T: Hash + Eq + Clone>(items: impl IntoIterator<Item = T>) -> Option<T> {
  items
    .into_iter()
    .counts()
    .into_iter()
    .max_by_key(|&(_, count)| count)
    .map(|(item, _)| item)
}
