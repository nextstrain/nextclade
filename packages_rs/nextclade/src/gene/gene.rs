use crate::gene::cds::Cds;
use eyre::Report;
use itertools::Itertools;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq, Hash, Ord, PartialOrd)]
pub enum GeneStrand {
  #[serde(rename = "+")]
  Forward,
  #[serde(rename = "-")]
  Reverse,
  #[serde(rename = ".")]
  Unknown,
}

impl Display for GeneStrand {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    self.serialize(f)
  }
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
  pub index: usize,
  pub id: String,
  pub name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub cdses: Vec<Cds>,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
  pub compat_is_cds: bool,
}

impl Gene {
  /// HACK: COMPATIBILITY: if there are no gene records, pretend that CDS records describe full genes
  pub fn from_cds(cds: &Cds) -> Result<Self, Report> {
    let index = 0;
    let id = cds.segments.iter().map(|seg| &seg.id).unique().join("+");
    let name = cds.segments.iter().map(|seg| &seg.name).unique().join("+");
    let start = cds.segments.first().map(|seg| seg.start).unwrap_or_default();
    let end = cds.segments.last().map(|seg| seg.end).unwrap_or_default();
    let strand = cds
      .segments
      .first()
      .map_or(GeneStrand::Unknown, |seg| seg.strand.clone());
    let frame = cds.segments.first().map(|seg| seg.frame).unwrap_or_default();
    let exceptions = cds
      .segments
      .iter()
      .flat_map(|seg| &seg.exceptions)
      .cloned()
      .collect_vec();

    Ok(Self {
      index,
      id,
      name,
      start,
      end,
      strand,
      frame,
      cdses: vec![cds.clone()],
      exceptions,
      attributes: MultiMap::new(),
      source_record: None,
      compat_is_cds: true,
    })
  }

  #[inline]
  pub const fn len(&self) -> usize {
    self.end - self.start
  }

  #[inline]
  pub const fn len_codon(&self) -> usize {
    (self.len() - self.len() % 3) / 3
  }

  #[inline]
  pub const fn is_empty(&self) -> bool {
    self.len() == 0
  }

  pub fn name_and_type(&self) -> String {
    format!("Gene '{}'", self.name)
  }
}
