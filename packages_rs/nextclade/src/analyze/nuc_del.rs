use crate::analyze::nuc_sub::NucSub;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::str::FromStr;

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize)]
pub struct NucDel {
  pub start: usize,
  pub length: usize,
}

impl NucDel {
  pub fn end(&self) -> usize {
    self.start + self.length
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct NucDelMinimal {
  #[serde(rename = "ref")]
  pub reff: Nuc,
  pub pos: usize,
}

/// Order deletions by position, then ref character
impl Ord for NucDelMinimal {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.reff).cmp(&(other.pos, other.reff))
  }
}

impl PartialOrd for NucDelMinimal {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}
