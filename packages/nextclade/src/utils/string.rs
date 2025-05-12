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

#[must_use]
#[allow(clippy::string_slice)]
pub fn truncate_left(s: &str, max_len: usize, ellipsis: &str) -> String {
  if s.is_empty() || max_len == 0 {
    return String::new();
  }

  if s.len() <= max_len {
    return s.to_owned();
  }

  let ellipsis_len = ellipsis.len().min(max_len);
  let allowed_len = max_len - ellipsis_len;
  let prefix = &ellipsis[..ellipsis_len];
  let suffix = &s[s.len() - allowed_len..];

  format!("{prefix}{suffix}")
}

#[must_use]
#[allow(clippy::string_slice)]
pub fn truncate_right(s: &str, max_len: usize, ellipsis: &str) -> String {
  if s.is_empty() || max_len == 0 {
    return String::new();
  }

  if s.len() <= max_len {
    return s.to_owned();
  }

  let ellipsis_len = ellipsis.len().min(max_len);
  let allowed_len = max_len - ellipsis_len;
  let prefix = &s[..allowed_len];
  let suffix = &ellipsis[..ellipsis_len];

  format!("{prefix}{suffix}")
}

#[cfg(test)]
mod tests {
  use super::{truncate_left, truncate_right};

  #[test]
  fn test_truncate_left_no_truncation() {
    assert_eq!(truncate_left("Test", 10, "..."), "Test");
  }

  #[test]
  fn test_truncate_left_exact_length() {
    assert_eq!(truncate_left("1234567890", 10, "..."), "1234567890");
  }

  #[test]
  fn test_truncate_left_basic() {
    assert_eq!(truncate_left("HelloWorld", 8, "..."), "...World");
  }

  #[test]
  fn test_truncate_left_long_ellipsis() {
    assert_eq!(truncate_left("abcdefghijklmno", 10, "[...]"), "[...]klmno");
  }

  #[test]
  fn test_truncate_left_empty_string() {
    assert_eq!(truncate_left("", 5, "..."), "");
  }

  #[test]
  fn test_truncate_left_zero_max_len() {
    assert_eq!(truncate_left("abcdef", 0, "..."), "");
  }

  #[test]
  fn test_truncate_left_ellipsis_longer_than_max_len() {
    assert_eq!(truncate_left("abcdef", 2, "..."), "..");
  }

  #[test]
  fn test_truncate_right_no_truncation() {
    assert_eq!(truncate_right("Test", 10, "..."), "Test");
  }

  #[test]
  fn test_truncate_right_exact_length() {
    assert_eq!(truncate_right("1234567890", 10, "..."), "1234567890");
  }

  #[test]
  fn test_truncate_right_basic() {
    assert_eq!(truncate_right("HelloWorld", 8, "..."), "Hello...");
  }

  #[test]
  fn test_truncate_right_long_ellipsis() {
    assert_eq!(truncate_right("abcdefghijklmno", 10, "[...]"), "abcde[...]");
  }

  #[test]
  fn test_truncate_right_empty_string() {
    assert_eq!(truncate_right("", 5, "..."), "");
  }

  #[test]
  fn test_truncate_right_zero_max_len() {
    assert_eq!(truncate_right("abcdef", 0, "..."), "");
  }

  #[test]
  fn test_truncate_right_ellipsis_longer_than_max_len() {
    assert_eq!(truncate_right("abcdef", 2, "..."), "..");
  }
}
