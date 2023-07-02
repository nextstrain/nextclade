use crate::align::score_matrix_nuc::lookup_nuc_scoring_matrix;
use crate::alphabet::letter::{Letter, ScoreMatrixLookup};
use crate::make_error;
use eyre::{eyre, Report, WrapErr};
use serde::{Deserialize, Deserializer, Serialize, Serializer};

#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq, PartialOrd, Ord, Serialize, Deserialize, schemars::JsonSchema, Hash)]
#[derive(Default)]
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

impl ToString for Nuc {
  fn to_string(&self) -> String {
    String::from(from_nuc(*self))
  }
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

impl Letter<Nuc> for Nuc {
  const GAP: Nuc = Nuc::Gap;

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
