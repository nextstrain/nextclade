use eyre::Report;

/// Allows to lookup scores for nucleotides and amino acids in a generic way
pub trait ScoreMatrixLookup<T> {
  fn lookup_match_score(x: T, y: T) -> i32;
}

/// Generic representation of a character defining nucleotide or amino acid
pub trait Letter<T>: Copy + Eq + Ord + ScoreMatrixLookup<T> {
  const GAP: T;

  fn is_gap(&self) -> bool;

  fn from_string(s: &str) -> Result<T, Report>;
}
