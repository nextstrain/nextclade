pub fn surround_with_quotes(s: impl AsRef<str>) -> String {
  let s = s.as_ref();
  format!(r#""{s}""#)
}
