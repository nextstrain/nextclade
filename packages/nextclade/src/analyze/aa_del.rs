use crate::alphabet::aa::{Aa};
use crate::analyze::aa_sub::AaSub;
use crate::analyze::abstract_mutation::{AbstractMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::coord::position::AaRefPosition;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaDel {
  pub cds_name: String,
  pub pos: AaRefPosition,
  pub ref_aa: Aa,
}

impl AbstractMutation<AaRefPosition, Aa> for AaDel {
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
