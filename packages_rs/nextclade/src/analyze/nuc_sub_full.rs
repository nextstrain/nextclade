use crate::analyze::aa_del::AaDelMinimal;
use crate::analyze::aa_sub::AaSubMinimal;
use crate::analyze::nuc_del::{NucDel, NucDelMinimal};
use crate::analyze::nuc_sub::NucSub;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NucSubFull {
  #[serde(flatten)]
  pub sub: NucSub,
  pub aa_substitutions: Vec<AaSubMinimal>,
  pub aa_deletions: Vec<AaDelMinimal>,
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

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NucDelFull {
  #[serde(flatten)]
  pub del: NucDel,
  pub aa_substitutions: Vec<AaSubMinimal>,
  pub aa_deletions: Vec<AaDelMinimal>,
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
