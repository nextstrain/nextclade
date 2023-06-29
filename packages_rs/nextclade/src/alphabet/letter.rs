use color_eyre::{Section, SectionExt};
use eyre::{Report, WrapErr};
use serde::{Deserialize, Deserializer, Serializer};

/// Allows to lookup scores for nucleotides and amino acids in a generic way
pub trait ScoreMatrixLookup<T> {
  fn lookup_match_score(x: T, y: T) -> i32;
}

/// Generic representation of a character defining nucleotide or amino acid
pub trait Letter<L>: Copy + Eq + Ord + ScoreMatrixLookup<L> {
  const GAP: L;

  fn is_gap(&self) -> bool;

  fn is_unknown(&self) -> bool;

  fn from_string(s: &str) -> Result<L, Report>;

  fn from_seq(seq: &[L]) -> String;

  fn to_seq(s: &str) -> Result<Vec<L>, Report>;
}

/// Serde serializer for Letter sequences
pub fn serde_serialize_seq<L: Letter<L>, S: Serializer>(seq: &[L], s: S) -> Result<S::Ok, S::Error> {
  s.serialize_str(&L::from_seq(seq))
}

/// Serde deserializer for Letter sequences
pub fn serde_deserialize_seq<'de, D: Deserializer<'de>, L: Letter<L>>(deserializer: D) -> Result<Vec<L>, D::Error> {
  let seq_str = String::deserialize(deserializer)?;
  let seq = L::to_seq(&seq_str)
    .wrap_err("When deserializing nucleotide sequence")
    .with_section(|| seq_str.header("Sequence:"))
    .unwrap();
  Ok(seq)
}
