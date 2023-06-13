use crate::analyze::nuc_sub::NucSub;
use crate::io::nuc::Nuc;
use crate::utils::range::{NucRefGlobalPosition, NucRefGlobalRange};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::str::FromStr;

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema, Hash)]
pub struct NucDel {
  range: NucRefGlobalRange,
}

impl NucDel {
  pub const fn new(begin: NucRefGlobalPosition, end: NucRefGlobalPosition) -> Self {
    Self {
      range: NucRefGlobalRange::new(begin, end),
    }
  }

  pub fn from_usize(begin: usize, end: usize) -> Self {
    Self {
      range: NucRefGlobalRange::from_usize(begin, end),
    }
  }

  #[inline]
  pub fn len(&self) -> usize {
    self.range.len()
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.range.is_empty()
  }

  #[inline]
  pub fn range(&self) -> &NucRefGlobalRange {
    &self.range
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NucDelMinimal {
  #[serde(rename = "refNuc")]
  pub reff: Nuc,
  pub pos: NucRefGlobalPosition,
}

impl NucDelMinimal {
  /// Converts deletion to substitution to Gap
  #[inline]
  pub const fn to_sub(&self) -> NucSub {
    NucSub {
      reff: self.reff,
      pos: self.pos,
      qry: Nuc::Gap,
    }
  }
}

/// Order deletions by position, then ref character
impl Ord for NucDelMinimal {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.reff).cmp(&(other.pos, other.reff))
  }
}

impl PartialOrd for NucDelMinimal {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}
