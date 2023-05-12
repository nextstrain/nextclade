use crate::analyze::aa_changes::{AaDel, AaSub};
use crate::analyze::nuc_del::{NucDel, NucDelMinimal};
use crate::analyze::nuc_sub::NucSub;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NucSubFull {
  #[serde(flatten)]
  pub sub: NucSub,
  pub aa_substitutions: Vec<AaSub>,
  pub aa_deletions: Vec<AaDel>,
}

impl NucSubFull {
  pub fn from_nuc_sub(sub: &NucSub) -> NucSubFull {
    NucSubFull {
      sub: sub.clone(),
      aa_substitutions: vec![],
      aa_deletions: vec![],
    }
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NucDelFull {
  #[serde(flatten)]
  pub del: NucDel,
  pub aa_substitutions: Vec<AaSub>,
  pub aa_deletions: Vec<AaDel>,
}

impl NucDelFull {
  pub fn from_nuc_del(del: &NucDel) -> NucDelFull {
    NucDelFull {
      del: del.clone(),
      aa_substitutions: vec![],
      aa_deletions: vec![],
    }
  }
}
