use crate::make_error;
use eyre::Report;

#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
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
  STOP,
  GAP,
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
    '*' => Ok(Aa::STOP),
    '-' => Ok(Aa::GAP),
    _ => make_error!("Unknown nucleotide: {letter}"),
  }
}

#[inline]
pub fn from_aa(nuc: &Aa) -> char {
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
    Aa::STOP => '*',
    Aa::GAP => '-',
  }
}

pub fn to_aa_seq(str: &str) -> Result<Vec<Aa>, Report> {
  str.chars().map(to_aa).collect()
}

pub fn from_aa_seq(seq: &[Aa]) -> String {
  seq.iter().map(from_aa).collect()
}
