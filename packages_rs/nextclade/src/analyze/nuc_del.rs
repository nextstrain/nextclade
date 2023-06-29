use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::NucRefGlobalRange;
use crate::io::nuc::Nuc;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema, Hash)]
#[serde(rename_all = "camelCase")]
pub struct NucDelRange {
  range: NucRefGlobalRange,
}

impl NucDelRange {
  pub fn new(begin: NucRefGlobalPosition, end: NucRefGlobalPosition) -> Self {
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
  pub const fn range(&self) -> &NucRefGlobalRange {
    &self.range
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema, Hash)]
#[serde(rename_all = "camelCase")]
pub struct NucDel {
  pub pos: NucRefGlobalPosition,
  pub ref_nuc: Nuc,
}
