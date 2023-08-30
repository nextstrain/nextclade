use crate::align::score_matrix_aa::lookup_aa_scoring_matrix;
use crate::alphabet::letter::{Letter, ScoreMatrixLookup};
use crate::make_error;
use eyre::{eyre, Report, WrapErr};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::fmt::{Display, Formatter};

#[repr(u8)]
#[derive(
  Debug, Clone, Copy, Eq, PartialEq, PartialOrd, Ord, Hash, Serialize, Deserialize, schemars::JsonSchema, Default,
)]
pub enum Aa {
  A,
  B,
  C,
  D,
  E,
  F,
  G,
  H,
  I,
  J,
  K,
  L,
  M,
  N,
  O,
  P,
  Q,
  R,
  S,
  T,
  U,
  V,
  W,
  Y,
  Z,
  X,

  #[serde(rename = "*")]
  Stop,

  #[serde(rename = "-")]
  #[default]
  Gap,
}

impl Aa {
  #[inline]
  pub fn is_stop(self) -> bool {
    self == Aa::Stop
  }
}

impl ScoreMatrixLookup<Aa> for Aa {
  fn lookup_match_score(x: Aa, y: Aa) -> i32 {
    lookup_aa_scoring_matrix(x, y)
  }
}

impl Display for Aa {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", from_aa(*self))
  }
}

impl Letter<Aa> for Aa {
  const GAP: Aa = Aa::Gap;

  #[inline]
  fn is_gap(&self) -> bool {
    self == &Aa::Gap
  }

  #[inline]
  fn is_unknown(&self) -> bool {
    self == &Aa::X
  }

  #[inline]
  fn from_string(s: &str) -> Result<Aa, Report> {
    if s.len() == 1 {
      let first_char = s
        .chars()
        .nth(0)
        .ok_or_else(|| eyre!("Unable to retrieve first character"))?;
      Ok(to_aa(first_char)?)
    } else {
      make_error!("Expected 1 character, but got {}", s.len())
    }
    .wrap_err_with(|| format!("When parsing amino acid: '{s}'"))
  }

  fn from_seq(seq: &[Aa]) -> String {
    from_aa_seq(seq)
  }

  fn to_seq(s: &str) -> Result<Vec<Aa>, Report> {
    to_aa_seq(s)
  }
}

#[inline]
pub fn to_aa(letter: char) -> Result<Aa, Report> {
  match letter {
    'A' => Ok(Aa::A),
    'B' => Ok(Aa::B),
    'C' => Ok(Aa::C),
    'D' => Ok(Aa::D),
    'E' => Ok(Aa::E),
    'F' => Ok(Aa::F),
    'G' => Ok(Aa::G),
    'H' => Ok(Aa::H),
    'I' => Ok(Aa::I),
    'J' => Ok(Aa::J),
    'K' => Ok(Aa::K),
    'L' => Ok(Aa::L),
    'M' => Ok(Aa::M),
    'N' => Ok(Aa::N),
    'O' => Ok(Aa::O),
    'P' => Ok(Aa::P),
    'Q' => Ok(Aa::Q),
    'R' => Ok(Aa::R),
    'S' => Ok(Aa::S),
    'T' => Ok(Aa::T),
    'U' => Ok(Aa::U),
    'V' => Ok(Aa::V),
    'W' => Ok(Aa::W),
    'Y' => Ok(Aa::Y),
    'Z' => Ok(Aa::Z),
    'X' => Ok(Aa::X),
    '*' => Ok(Aa::Stop),
    '-' => Ok(Aa::Gap),
    _ => make_error!("Unknown amino acid: {letter}"),
  }
}

#[inline]
pub const fn from_aa(nuc: Aa) -> char {
  match nuc {
    Aa::A => 'A',
    Aa::B => 'B',
    Aa::C => 'C',
    Aa::D => 'D',
    Aa::E => 'E',
    Aa::F => 'F',
    Aa::G => 'G',
    Aa::H => 'H',
    Aa::I => 'I',
    Aa::J => 'J',
    Aa::K => 'K',
    Aa::L => 'L',
    Aa::M => 'M',
    Aa::N => 'N',
    Aa::O => 'O',
    Aa::P => 'P',
    Aa::Q => 'Q',
    Aa::R => 'R',
    Aa::S => 'S',
    Aa::T => 'T',
    Aa::U => 'U',
    Aa::V => 'V',
    Aa::W => 'W',
    Aa::Y => 'Y',
    Aa::Z => 'Z',
    Aa::X => 'X',
    Aa::Stop => '*',
    Aa::Gap => '-',
  }
}

pub fn to_aa_seq(str: &str) -> Result<Vec<Aa>, Report> {
  str.chars().map(to_aa).collect()
}

pub fn from_aa_seq(seq: &[Aa]) -> String {
  seq.iter().map(|aa| from_aa(*aa)).collect()
}
