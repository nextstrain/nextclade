use crate::analyze::aa_changes::{AaDel, AaSub};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaSubFull {
  #[serde(flatten)]
  pub sub: AaSub,
  pub nuc_substitutions: Vec<NucSub>,
  pub nuc_deletions: Vec<NucDel>,
}

impl AaSubFull {
  pub fn from_aa_sub(sub: &AaSub) -> AaSubFull {
    AaSubFull {
      sub: sub.clone(),
      nuc_substitutions: vec![],
      nuc_deletions: vec![],
    }
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaDelFull {
  #[serde(flatten)]
  pub del: AaDel,
  pub nuc_substitutions: Vec<NucSub>,
  pub nuc_deletions: Vec<NucDel>,
}

impl AaDelFull {
  pub fn from_aa_del(del: &AaDel) -> AaDelFull {
    AaDelFull {
      del: del.clone(),
      nuc_substitutions: vec![],
      nuc_deletions: vec![],
    }
  }
}
