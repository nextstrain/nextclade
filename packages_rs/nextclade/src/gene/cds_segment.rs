use crate::features::feature::Landmark;
use crate::gene::frame::Frame;
use crate::gene::gene::GeneStrand;
use crate::gene::phase::Phase;
use crate::utils::range::{NucRefGlobalRange, NucRefLocalRange};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

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

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CdsSegment {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub range: NucRefGlobalRange,
  pub range_local: NucRefLocalRange,
  pub landmark: Option<Landmark>,
  pub wrapping_part: WrappingPart,
  pub strand: GeneStrand,
  pub frame: Frame,
  pub phase: Phase,
  pub exceptions: Vec<String>,
  pub attributes: HashMap<String, Vec<String>>,
  #[serde(skip)]
  pub source_record: Option<String>,
  pub compat_is_gene: bool,
  pub color: Option<String>,
}

impl CdsSegment {
  pub fn name_and_type(&self) -> String {
    format!("CDS segment '{}'", self.name)
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
