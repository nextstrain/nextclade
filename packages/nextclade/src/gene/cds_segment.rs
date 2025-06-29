use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::{NucRefGlobalRange, NucRefLocalRange};
use crate::features::feature::Landmark;
use crate::gene::frame::Frame;
use crate::gene::gene::GeneStrand;
use crate::gene::phase::Phase;
use indexmap::IndexMap;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;

/// Marks the parts of circular, wrapping segments
///
/// Example:
///   WrappingStart      : |....<-----|
///   WrappingCentral(1) : |----------|
///   WrappingCentral(2) : |----------|
///   WrappingEnd(3)     : |---->     |
#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "kebab-case")]
pub enum WrappingPart {
  NonWrapping,            // This is not a part of a circular, wrapping feature.
  WrappingStart,          // Wrapping part before the first wrap.
  WrappingCentral(usize), // Wrapping parts after first wrap - contains index of the part in the wrapping feature.
  WrappingEnd(usize),     // Last wrapping part.
}

// Shows whether the CDS is incomplete and by how much
#[derive(Clone, Debug, Default, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "kebab-case")]
pub enum Truncation {
  #[default]
  None,
  FivePrime(usize),
  ThreePrime(usize),
  Both((usize, usize)),
}

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CdsSegment {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub range: NucRefGlobalRange,
  pub range_local: NucRefLocalRange,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub landmark: Option<Landmark>,
  pub wrapping_part: WrappingPart,
  pub strand: GeneStrand,
  pub frame: Frame,
  pub phase: Phase,
  pub truncation: Truncation,
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub exceptions: Vec<String>,
  pub attributes: IndexMap<String, Vec<String>>,
  #[serde(skip)]
  pub source_record: Option<String>,
  pub compat_is_gene: bool,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub color: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub gff_seqid: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub gff_source: Option<String>,
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub gff_feature_type: Option<String>,

  #[serde(flatten)]
  pub other: Value,
}

impl CdsSegment {
  pub fn name_and_type(&self) -> String {
    format!("CDS segment '{}'", self.name)
  }

  pub const fn start(&self) -> NucRefGlobalPosition {
    self.range.begin
  }

  pub const fn end(&self) -> NucRefGlobalPosition {
    self.range.end
  }

  #[inline]
  pub fn len(&self) -> usize {
    self.range.len()
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }
}
