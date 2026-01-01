use crate::alphabet::aa::{to_aa, Aa};
use crate::analyze::aa_sub::AaSub;
use crate::analyze::abstract_mutation::{AbstractMutation, CloneableMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::coord::position::AaRefPosition;
use crate::coord::range::AaRefRange;
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

/// An aminoacid deletion
#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaDel {
  pub cds_name: String,
  pub pos: AaRefPosition,
  pub ref_aa: Aa,
}

impl AbstractMutation<AaRefPosition, Aa> for AaDel {}

impl CloneableMutation<AaRefPosition, Aa> for AaDel {
  fn clone_with(&self, params: MutParams<AaRefPosition, Aa>) -> Self {
    Self {
      cds_name: self.cds_name.clone(),
      pos: params.pos,
      ref_aa: params.ref_letter,
    }
  }
}

impl QryLetter<Aa> for AaDel {
  fn qry_letter(&self) -> Aa {
    Aa::Gap
  }
}

impl RefLetter<Aa> for AaDel {
  fn ref_letter(&self) -> Aa {
    self.ref_aa
  }
}

impl Pos<AaRefPosition> for AaDel {
  fn pos(&self) -> AaRefPosition {
    self.pos
  }
}

impl AaDel {
  pub fn from_raw(cds: impl AsRef<str>, pos: usize, ref_nuc: char) -> Result<Self, Report> {
    Ok(Self {
      cds_name: cds.as_ref().to_owned(),
      pos: pos.into(),
      ref_aa: to_aa(ref_nuc)?,
    })
  }

  /// Converts deletion to substitution to Gap
  #[inline]
  pub fn to_sub(&self) -> AaSub {
    AaSub {
      cds_name: self.cds_name.clone(),
      ref_aa: self.ref_aa,
      pos: self.pos,
      qry_aa: Aa::Gap,
    }
  }
}

impl Display for AaDel {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    self.to_sub().fmt(f)
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema, Hash)]
#[serde(rename_all = "camelCase")]
pub struct AaDelRange {
  pub range: AaRefRange,
}

impl AaDelRange {
  pub fn new(begin: AaRefPosition, end: AaRefPosition) -> Self {
    Self {
      range: AaRefRange::new(begin, end),
    }
  }

  pub fn from_usize(begin: usize, end: usize) -> Self {
    Self {
      range: AaRefRange::from_usize(begin, end),
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
  pub const fn range(&self) -> &AaRefRange {
    &self.range
  }
}
