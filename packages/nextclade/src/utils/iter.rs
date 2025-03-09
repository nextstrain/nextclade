use crate::make_error;
use color_eyre::Result;
use eyre::Report;
use itertools::Itertools;
use std::hash::Hash;

/// Extracts unique value from an iterator after applying a provided function.
pub fn single_unique_value<T, U, I, F>(iter: I, f: F) -> Result<U, Report>
where
  U: Clone + Eq + Hash,
  I: IntoIterator<Item = T>,
  F: FnMut(T) -> U,
{
  let unique_values: Vec<U> = iter.into_iter().map(f).unique().collect();

  if unique_values.len() > 1 {
    return make_error!("Expected exactly one value, but found: {:}", unique_values.len());
  }

  if unique_values.is_empty() {
    return make_error!("Expected exactly one value, but none found");
  }

  Ok(unique_values.into_iter().next().unwrap())
}
