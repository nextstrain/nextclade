use crate::analyze::aa_changes::AaSub;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::io::aa::Aa;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaDelMinimal {
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: usize,
}

impl AaDelMinimal {
  /// Converts deletion to substitution to Gap
  #[inline]
  pub const fn to_sub(&self) -> AaSubMinimal {
    AaSubMinimal {
      reff: self.reff,
      pos: self.pos,
      qry: Aa::Gap,
    }
  }
}

/// Order deletions by position, then ref character
impl Ord for AaDelMinimal {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.reff).cmp(&(other.pos, other.reff))
  }
}

impl PartialOrd for AaDelMinimal {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}
