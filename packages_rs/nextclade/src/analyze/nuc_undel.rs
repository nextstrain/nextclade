use crate::alphabet::nuc::Nuc;
use crate::analyze::abstract_mutation::{AbstractMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::NucRefGlobalRange;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::str::FromStr;

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema, Hash)]
#[serde(rename_all = "camelCase")]
pub struct NucUndelRange {
  range: NucRefGlobalRange,
}

impl NucUndelRange {
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
pub struct NucUndel {
  pub pos: NucRefGlobalPosition,
  pub qry_nuc: Nuc,
}

impl RefLetter<Nuc> for NucUndel {
  fn ref_letter(&self) -> Nuc {
    Nuc::Gap
  }
}
impl QryLetter<Nuc> for NucUndel {
  fn qry_letter(&self) -> Nuc {
    self.qry_nuc
  }
}

impl Pos<NucRefGlobalPosition> for NucUndel {
  fn pos(&self) -> NucRefGlobalPosition {
    self.pos
  }
}

impl NucUndel {
  pub const fn to_sub(&self) -> NucSub {
    NucSub {
      ref_nuc: Nuc::Gap,
      pos: self.pos,
      qry_nuc: self.qry_nuc,
    }
  }
}

impl Display for NucUndel {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    self.to_sub().fmt(f)
  }
}
