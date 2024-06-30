use crate::alphabet::aa::{from_aa, Aa};
use crate::analyze::abstract_mutation::{AbstractMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::coord::position::AaRefPosition;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

/// Represents minimal aminoacid substitution (without feature name)
#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Hash, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaSubMin {
  pub pos: AaRefPosition,
  pub ref_aa: Aa,
  pub qry_aa: Aa,
}

impl AbstractMutation<AaRefPosition, Aa> for AaSubMin {
  fn clone_with(&self, params: MutParams<AaRefPosition, Aa>) -> Self {
    Self {
      pos: params.pos,
      ref_aa: params.ref_letter,
      qry_aa: params.qry_letter,
    }
  }
}

impl QryLetter<Aa> for AaSubMin {
  fn qry_letter(&self) -> Aa {
    self.qry_aa
  }
}

impl RefLetter<Aa> for AaSubMin {
  fn ref_letter(&self) -> Aa {
    self.ref_aa
  }
}

impl Pos<AaRefPosition> for AaSubMin {
  fn pos(&self) -> AaRefPosition {
    self.pos
  }
}

impl AaSubMin {
  #[must_use]
  pub const fn invert(&self) -> Self {
    Self {
      ref_aa: self.qry_aa,
      pos: self.pos,
      qry_aa: self.ref_aa,
    }
  }
}

impl Display for AaSubMin {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    // NOTE: by convention, in bioinformatics, amino acids are numbered starting from 1, however our arrays are 0-based
    write!(f, "{}{}{}", from_aa(self.ref_aa), self.pos + 1, from_aa(self.qry_aa))
  }
}
