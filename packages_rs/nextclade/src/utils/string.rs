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
