use itertools::Itertools;
use strsim::sorensen_dice;

/// Return copy of a string surrounded with quotation marks
#[must_use]
pub fn surround_with_quotes(s: impl AsRef<str>) -> String {
  let s = s.as_ref();
  format!(r#""{s}""#)
}

/// Return copy of a string truncated up to a given length
#[must_use]
pub fn truncate(s: impl AsRef<str>, new_len: usize) -> String {
  let mut s = s.as_ref().to_owned();
  s.truncate(new_len);
  s
}

/// Return copy of a string truncated up to a given length, with ellipsis
#[must_use]
pub fn truncate_with_ellipsis(s: impl AsRef<str>, new_len: usize) -> String {
  let mut s = s.as_ref().to_owned();
  if s.len() > new_len {
    s.truncate(new_len.saturating_sub(3));
    s += "...";
  }
  s
}
#[macro_export]
macro_rules! o {
  ($x:expr $(,)?) => {
    ToOwned::to_owned($x)
  };
}

pub fn find_similar_strings<T: AsRef<str> + Copy, U: AsRef<str>>(
  haystack: impl Iterator<Item = T>,
  needle: U,
) -> impl Iterator<Item = T> {
  let scores = haystack
    .map(|candidate| (candidate, sorensen_dice(candidate.as_ref(), needle.as_ref())))
    .filter(|(_, score)| *score > 0.0)
    .sorted_by_key(|(_, score)| -(score * 1000.0) as isize)
    .collect_vec();
  scores.into_iter().map(|(candidate, _)| candidate)
}
