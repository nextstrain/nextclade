use crate::align::score_matrix_nuc::lookup_nuc_scoring_matrix;
use crate::alphabet::letter::{Letter, ScoreMatrixLookup};
use crate::make_error;
use eyre::{Report, WrapErr, eyre};
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use strum_macros::EnumIter;

/// A nucleotide
#[repr(u8)]
#[derive(
  Debug,
  Clone,
  Copy,
  Eq,
  PartialEq,
  PartialOrd,
  Ord,
  Serialize,
  Deserialize,
  schemars::JsonSchema,
  Hash,
  Default,
  EnumIter,
)]
pub enum Nuc {
  T,
  A,
  W,
  C,
  Y,
  M,
  H,
  G,
  K,
  R,
  D,
  S,
  B,
  V,
  N,

  #[serde(rename = "-")]
  #[default]
  Gap,
}

impl Nuc {
  #[inline]
  pub const fn is_acgt(self) -> bool {
    matches!(self, Nuc::A | Nuc::C | Nuc::G | Nuc::T)
  }

  #[inline]
  pub const fn is_acgtn(self) -> bool {
    matches!(self, Nuc::A | Nuc::C | Nuc::G | Nuc::T | Nuc::N)
  }
}

impl ScoreMatrixLookup<Nuc> for Nuc {
  fn lookup_match_score(x: Nuc, y: Nuc) -> i32 {
    lookup_nuc_scoring_matrix(x, y)
  }
}

impl Display for Nuc {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", from_nuc(*self))
  }
}

impl Letter<Nuc> for Nuc {
  const GAP: Nuc = Nuc::Gap;
  const UNKNOWN: Nuc = Nuc::N;

  #[inline]
  fn is_gap(&self) -> bool {
    self == &Nuc::Gap
  }

  #[inline]
  fn is_unknown(&self) -> bool {
    self == &Nuc::N
  }

  #[inline]
  fn from_string(s: &str) -> Result<Nuc, Report> {
    if s.len() == 1 {
      let first_char = s
        .chars()
        .nth(0)
        .ok_or_else(|| eyre!("Unable to retrieve first character"))?;
      Ok(to_nuc(first_char)?)
    } else {
      make_error!("Expected 1 character, but got {}", s.len())
    }
    .wrap_err_with(|| format!("When parsing nucleotide: '{s}'"))
  }

  fn from_seq(seq: &[Nuc]) -> String {
    from_nuc_seq(seq)
  }

  fn to_seq(s: &str) -> Result<Vec<Nuc>, Report> {
    to_nuc_seq(s)
  }
}

/// Checks whether 2 of nucleotides are equivalent, taking into account ambiguous nucleotides,
/// according to UIPAC table.
pub fn is_nuc_match(x: Nuc, y: Nuc) -> bool {
  lookup_nuc_scoring_matrix(x, y) > 0
}

/// Checks whether every base that `nuc` stands for is also a base of `filter`, according to the IUPAC table.
///
/// Filter `N` accepts every nucleotide. Filter `R` accepts `A`, `G` and `R`. Filter `G` accepts `G`, but not the
/// ambiguous `R`, which can also be `A`. A gap is a subset only of a gap.
pub const fn is_nuc_subset(nuc: Nuc, filter: Nuc) -> bool {
  let nuc = nuc_base_set(nuc);
  nuc & nuc_base_set(filter) == nuc
}

/// Bases that a nucleotide code stands for, as a bit set of `A`, `C`, `G`, `T` and gap
const fn nuc_base_set(nuc: Nuc) -> u8 {
  const A: u8 = 1;
  const C: u8 = 2;
  const G: u8 = 4;
  const T: u8 = 8;
  const GAP: u8 = 16;
  match nuc {
    Nuc::A => A,
    Nuc::C => C,
    Nuc::G => G,
    Nuc::T => T,
    Nuc::R => A | G,
    Nuc::Y => C | T,
    Nuc::S => C | G,
    Nuc::W => A | T,
    Nuc::K => G | T,
    Nuc::M => A | C,
    Nuc::B => C | G | T,
    Nuc::D => A | G | T,
    Nuc::H => A | C | T,
    Nuc::V => A | C | G,
    Nuc::N => A | C | G | T,
    Nuc::Gap => GAP,
  }
}

#[inline]
pub fn to_nuc(letter: char) -> Result<Nuc, Report> {
  match letter {
    'T' => Ok(Nuc::T),
    'A' => Ok(Nuc::A),
    'W' => Ok(Nuc::W),
    'C' => Ok(Nuc::C),
    'Y' => Ok(Nuc::Y),
    'M' => Ok(Nuc::M),
    'H' => Ok(Nuc::H),
    'G' => Ok(Nuc::G),
    'K' => Ok(Nuc::K),
    'R' => Ok(Nuc::R),
    'D' => Ok(Nuc::D),
    'S' => Ok(Nuc::S),
    'B' => Ok(Nuc::B),
    'V' => Ok(Nuc::V),
    'N' => Ok(Nuc::N),
    '-' => Ok(Nuc::Gap),
    _ => make_error!("Unknown nucleotide: {letter}"),
  }
}

#[inline]
pub const fn from_nuc(nuc: Nuc) -> char {
  match nuc {
    Nuc::T => 'T',
    Nuc::A => 'A',
    Nuc::W => 'W',
    Nuc::C => 'C',
    Nuc::Y => 'Y',
    Nuc::M => 'M',
    Nuc::H => 'H',
    Nuc::G => 'G',
    Nuc::K => 'K',
    Nuc::R => 'R',
    Nuc::D => 'D',
    Nuc::S => 'S',
    Nuc::B => 'B',
    Nuc::V => 'V',
    Nuc::N => 'N',
    Nuc::Gap => '-',
  }
}

pub fn to_nuc_seq(str: &str) -> Result<Vec<Nuc>, Report> {
  str.chars().map(to_nuc).collect()
}

/// Converts string characters to `Nuc`s, replacing unknown characters with `N`
pub fn to_nuc_seq_replacing(str: &str) -> Vec<Nuc> {
  str.chars().map(|c| to_nuc(c).unwrap_or(Nuc::N)).collect()
}

pub fn from_nuc_seq(seq: &[Nuc]) -> String {
  seq.iter().map(|nuc| from_nuc(*nuc)).collect()
}

#[cfg(test)]
mod tests {
  use super::*;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  // Base sets from the IUPAC-IUB nomenclature for incompletely specified bases (1985)
  #[rustfmt::skip]
  #[rstest]
  #[case::same_base(              (Nuc::A,   Nuc::A),   true)]
  #[case::other_base(             (Nuc::A,   Nuc::C),   false)]
  #[case::base_in_code(           (Nuc::G,   Nuc::R),   true)]
  #[case::code_wider_than_base(   (Nuc::R,   Nuc::G),   false)]
  #[case::code_in_wider_code(     (Nuc::W,   Nuc::D),   true)]
  #[case::disjoint_codes(         (Nuc::S,   Nuc::W),   false)]
  #[case::overlapping_codes(      (Nuc::R,   Nuc::M),   false)]
  #[case::any_in_n(               (Nuc::V,   Nuc::N),   true)]
  #[case::n_in_narrower_code(     (Nuc::N,   Nuc::B),   false)]
  #[case::gap_in_gap(             (Nuc::Gap, Nuc::Gap), true)]
  #[case::gap_not_in_n(           (Nuc::Gap, Nuc::N),   false)]
  #[case::base_not_in_gap(        (Nuc::A,   Nuc::Gap), false)]
  #[trace]
  fn test_nuc_is_nuc_subset(#[case] (nuc, filter): (Nuc, Nuc), #[case] expected: bool) {
    assert_eq!(expected, is_nuc_subset(nuc, filter));
  }
}
