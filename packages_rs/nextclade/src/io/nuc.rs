#![allow(clippy::use_self, clippy::upper_case_acronyms)]

use crate::align::score_matrix_nuc::lookup_nuc_scoring_matrix;
use crate::io::letter::{Letter, ScoreMatrixLookup};
use crate::make_error;
use eyre::Report;

#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
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
  GAP,
}

impl ScoreMatrixLookup<Nuc> for Nuc {
  fn lookup_match_score(x: Nuc, y: Nuc) -> i32 {
    lookup_nuc_scoring_matrix(x, y)
  }
}

impl Letter<Nuc> for Nuc {
  const GAP: Nuc = Nuc::GAP;

  #[inline]
  fn is_gap(&self) -> bool {
    self == &Nuc::GAP
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
    '-' => Ok(Nuc::GAP),
    _ => make_error!("Unknown nucleotide: {letter}"),
  }
}

#[inline]
pub fn from_nuc(nuc: Nuc) -> char {
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
    Nuc::GAP => '-',
  }
}

pub fn to_nuc_seq(str: &str) -> Result<Vec<Nuc>, Report> {
  str.chars().map(to_nuc).collect()
}

pub fn from_nuc_seq(seq: &[Nuc]) -> String {
  seq.iter().map(|nuc| from_nuc(*nuc)).collect()
}
