//! Implements GFF3-compliant percent-encoding.
//!
//! See https://github.com/The-Sequence-Ontology/Specifications/blob/fe73505276dd324bf6a55773f3413fe2bed47af4/gff3.md#description-of-the-format (accessed 2025-07-05).
//!
//! For non-attribute fields (columns 1-8):
//! "Literal use of tab, newline, carriage return, the percent (%) sign, and control characters must be encoded...
//! no other characters may be encoded."
//! Control characters are 0x00-0x1F and 0x7F.
//!
//! For attribute fields (column 9):
//! "In addition, the following characters have reserved meanings in column 9 and must be escaped when used in other contexts:
//! ; semicolon (%3B)
//! = equals (%3D)
//! & ampersand (%26)
//! , comma (%2C)"
//!
use eyre::Report;
use percent_encoding::{AsciiSet, CONTROLS, percent_decode_str, percent_encode};

/// The set of characters to be percent-encoded in GFF3 non-attribute fields (columns 1-8).
const GFF_NON_ATTRIBUTE_ENCODE_SET: &AsciiSet = &CONTROLS.add(b'%');

/// The set of characters to be percent-encoded in GFF3 attribute fields (column 9).
const GFF_ATTRIBUTE_ENCODE_SET: &AsciiSet = &GFF_NON_ATTRIBUTE_ENCODE_SET.add(b';').add(b'=').add(b'&').add(b',');

pub fn gff_encode_non_attribute(s: impl AsRef<str>) -> String {
  percent_encode(s.as_ref().as_bytes(), GFF_NON_ATTRIBUTE_ENCODE_SET).to_string()
}

pub fn gff_decode_non_attribute(s: impl AsRef<str>) -> Result<String, Report> {
  Ok(percent_decode_str(s.as_ref()).decode_utf8()?.into_owned())
}

pub fn gff_encode_attribute(s: impl AsRef<str>) -> String {
  percent_encode(s.as_ref().as_bytes(), GFF_ATTRIBUTE_ENCODE_SET).to_string()
}

pub fn gff_decode_attribute(s: impl AsRef<str>) -> Result<String, Report> {
  Ok(percent_decode_str(s.as_ref()).decode_utf8()?.into_owned())
}

#[cfg(test)]
mod tests {
  use super::*;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  #[case("hello world", "hello world")]
  #[case("hello%world", "hello%25world")]
  #[case("hello\tworld", "hello%09world")]
  #[case("hello\nworld", "hello%0Aworld")]
  #[case("hello\rworld", "hello%0Dworld")]
  #[case("a\t\n\r%b", "a%09%0A%0D%25b")]
  #[case("a;b=c&d,e", "a;b=c&d,e")]
  #[case("", "")]
  #[case("a", "a")]
  #[case("%", "%25")]
  #[case("\x00\x01\x1F\x7F", "%00%01%1F%7F")]
  #[case("%%", "%25%25")]
  #[case("\t\t", "%09%09")]
  fn test_gff_encode_non_attribute(#[case] raw: &str, #[case] encoded: &str) {
    assert_eq!(gff_encode_non_attribute(raw), encoded);
  }

  #[rstest]
  #[case("hello world", "hello world")]
  #[case("hello%25world", "hello%world")]
  #[case("hello%09world", "hello\tworld")]
  #[case("hello%0Aworld", "hello\nworld")]
  #[case("hello%0Dworld", "hello\rworld")]
  #[case("a%09%0A%0D%25b", "a\t\n\r%b")]
  #[case("a;b=c&d,e", "a;b=c&d,e")]
  #[case("", "")]
  #[case("a", "a")]
  #[case("%25", "%")]
  #[case("%00%01%1F%7F", "\x00\x01\x1F\x7F")]
  #[case("%25%25", "%%")]
  #[case("%09%09", "		")]
  #[case("a%3Bb%3Dc%26d%2Ce", "a;b=c&d,e")]
  fn test_gff_decode_non_attribute(#[case] encoded: &str, #[case] raw: &str) {
    assert_eq!(gff_decode_non_attribute(encoded).unwrap(), raw);
  }

  #[rstest]
  #[case("hello world", "hello world")]
  #[case("hello%world", "hello%25world")]
  #[case("hello\tworld", "hello%09world")]
  #[case("hello\nworld", "hello%0Aworld")]
  #[case("hello\rworld", "hello%0Dworld")]
  #[case("a\t\n\r%b", "a%09%0A%0D%25b")]
  #[case("a;b", "a%3Bb")]
  #[case("a=b", "a%3Db")]
  #[case("a&b", "a%26b")]
  #[case("a,b", "a%2Cb")]
  #[case("a;b=c&d,e", "a%3Bb%3Dc%26d%2Ce")]
  #[case("", "")]
  #[case("a", "a")]
  #[case("%", "%25")]
  #[case(";", "%3B")]
  #[case("=", "%3D")]
  #[case("&", "%26")]
  #[case(",", "%2C")]
  #[case("\x00\x01\x1F\x7F", "%00%01%1F%7F")]
  #[case("%%", "%25%25")]
  #[case("\t\t", "%09%09")]
  #[case(";;", "%3B%3B")]
  fn test_gff_encode_attribute(#[case] raw: &str, #[case] encoded: &str) {
    assert_eq!(gff_encode_attribute(raw), encoded);
  }

  #[rstest]
  #[case("hello world", "hello world")]
  #[case("hello%25world", "hello%world")]
  #[case("hello%09world", "hello\tworld")]
  #[case("hello%0Aworld", "hello\nworld")]
  #[case("hello%0Dworld", "hello\rworld")]
  #[case("hello%3Bworld", "hello;world")]
  #[case("hello%3Dworld", "hello=world")]
  #[case("hello%26world", "hello&world")]
  #[case("hello%2Cworld", "hello,world")]
  #[case("a%3Bb%3Dc%26d%2Ce%25f%09%0A%0D", "a;b=c&d,e%f\t\n\r")]
  #[case("", "")]
  #[case("a", "a")]
  #[case("%3B", ";")]
  #[case("%3D", "=")]
  #[case("%26", "&")]
  #[case("%2C", ",")]
  #[case("%25", "%")]
  #[case("%00%01%1F%7F", "\x00\x01\x1F\x7F")]
  #[case("%3B%3B", ";;")]
  #[case("%25%25", "%%")]
  fn test_gff_decode_attribute(#[case] encoded: &str, #[case] raw: &str) {
    assert_eq!(gff_decode_attribute(encoded).unwrap(), raw);
  }
}
