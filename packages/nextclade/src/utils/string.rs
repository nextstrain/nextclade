use itertools::Itertools;
use std::fmt::Display;
use strsim::sorensen_dice;

/// Return copy of a string surrounded with quotation marks
#[must_use]
pub fn surround_with_quotes(item: impl Display) -> String {
  format!(r#""{item}""#)
}

#[derive(Copy, Clone, Debug)]
pub struct Indent(pub usize);

impl Default for Indent {
  fn default() -> Self {
    Self(2)
  }
}

/// Display elements as a bullet list
#[must_use]
pub fn format_list(n: Indent, items: impl Iterator<Item = impl Display>) -> String {
  items.map(|s| format!("- {s}")).map(indent(n)).join("\n")
}

/// Indent by given number of spaces
pub fn indent<U: Display>(n: Indent) -> impl FnMut(U) -> String {
  move |s: U| format!("{:indent$}{s}", "", indent = n.0)
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
    .map(|candidate| {
      (
        candidate,
        sorensen_dice(&candidate.as_ref().to_lowercase(), &needle.as_ref().to_lowercase()),
      )
    })
    .filter(|(_, score)| *score > 0.0)
    .sorted_by_key(|(_, score)| -(score * 1000.0) as isize)
    .collect_vec();
  scores.into_iter().map(|(candidate, _)| candidate)
}
