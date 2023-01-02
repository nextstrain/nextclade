use crate::make_error;
use eyre::Report;
use multimap::MultiMap;
use std::borrow::Borrow;
use std::hash::Hash;

/// Return value corresponding to one of the given keys
pub fn get_first_of<Key, Val, KeyRef>(mmap: &MultiMap<Key, Val>, keys: &[&KeyRef]) -> Option<Val>
where
  Key: Eq + Hash + Borrow<KeyRef>,
  KeyRef: Eq + Hash + ?Sized,
  Val: Clone,
{
  get_all_of(mmap, keys).into_iter().next() // Get first of possible values
}

/// Return all values corresponding to any of the given keys
pub fn get_all_of<Key, Val, KeyRef>(mmap: &MultiMap<Key, Val>, keys: &[&KeyRef]) -> Vec<Val>
where
  Key: Eq + Hash + Borrow<KeyRef>,
  KeyRef: Eq + Hash + ?Sized,
  Val: Clone,
{
  keys
    .iter()
    .filter_map(|&key| mmap.get_vec(key.borrow()))
    .flatten()
    .cloned()
    .collect()
}

// Take first element, and checks that it's the only element
pub fn take_exactly_one<T>(elems: &[T]) -> Result<&T, Report> {
  match &elems {
    [] => make_error!("Expected exactly one element, but found none"),
    [first] => Ok(first),
    _ => make_error!("Expected exactly one element, but found: {}", elems.len()),
  }
}
