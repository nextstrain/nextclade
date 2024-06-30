use crate::alphabet::nuc::Nuc;
use crate::analyze::abstract_mutation::{AbstractMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::NucRefGlobalRange;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};


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

impl AbstractMutation<NucRefGlobalPosition, Nuc> for NucDel {
  fn clone_with(&self, params: MutParams<NucRefGlobalPosition, Nuc>) -> Self {
    Self {
      pos: params.pos,
      ref_nuc: params.ref_letter,
    }
  }
}

impl QryLetter<Nuc> for NucDel {
  fn qry_letter(&self) -> Nuc {
    Nuc::Gap
  }
}

impl RefLetter<Nuc> for NucDel {
  fn ref_letter(&self) -> Nuc {
    self.ref_nuc
  }
}

impl Pos<NucRefGlobalPosition> for NucDel {
  fn pos(&self) -> NucRefGlobalPosition {
    self.pos
  }
}

impl NucDel {
  pub const fn to_sub(&self) -> NucSub {
    NucSub {
      ref_nuc: self.ref_nuc,
      pos: self.pos,
      qry_nuc: Nuc::Gap,
    }
  }
}

impl Display for NucDel {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    self.to_sub().fmt(f)
  }
}
