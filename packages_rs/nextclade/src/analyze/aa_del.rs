use crate::alphabet::aa::{from_aa, Aa};
use crate::analyze::aa_sub::AaSub;
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
    // NOTE: by convention, in bioinformatics, amino acids are numbered starting from 1, however our arrays are 0-based
    write!(f, "{}:{}{}-", self.cds_name, from_aa(self.ref_aa), self.pos + 1)
  }
}
