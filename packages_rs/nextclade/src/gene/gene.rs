use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
pub enum GeneStrand {
  #[serde(rename = "+")]
  Forward,
  #[serde(rename = "-")]
  Reverse,
  #[serde(rename = ".")]
  Unknown,
}

impl From<bio_types::strand::Strand> for GeneStrand {
  fn from(s: bio_types::strand::Strand) -> Self {
    match s {
      bio_types::strand::Strand::Forward => Self::Forward,
      bio_types::strand::Strand::Reverse => Self::Reverse,
      bio_types::strand::Strand::Unknown => Self::Unknown,
    }
  }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Gene {
  pub gene_name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
}

impl Gene {
  pub const fn len(&self) -> usize {
    self.end - self.start
  }

  pub const fn is_empty(&self) -> bool {
    self.len() == 0
  }

  #[inline]
  pub fn codon_to_nuc(&self, codon: usize) -> usize {
    if self.strand == GeneStrand::Reverse {
      self.end - (codon + 1) * 3
    } else {
      self.start + codon * 3
    }
  }
}
