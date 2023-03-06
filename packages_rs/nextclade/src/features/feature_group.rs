use crate::features::feature::Feature;
use crate::features::feature_type::shorten_feature_type;
use crate::gene::gene::GeneStrand;
use itertools::Itertools;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::fmt::Debug;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FeatureGroup {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub product: String,
  pub feature_type: String,
  pub strand: GeneStrand,
  pub frame: i32,
  pub features: Vec<Feature>,
  pub parent_ids: Vec<String>,
  pub children: Vec<FeatureGroup>,
  pub exceptions: Vec<String>,
  pub notes: Vec<String>,
  pub is_circular: bool,
}

impl Ord for FeatureGroup {
  fn cmp(&self, other: &Self) -> Ordering {
    let s = (self.start(), -(self.end() as isize), &self.name_and_type());
    let o = (other.start(), -(other.end() as isize), &other.name_and_type());
    s.cmp(&o)
  }
}

impl PartialOrd for FeatureGroup {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

impl FeatureGroup {
  pub fn new(id: &str, features: &[Feature]) -> Self {
    let index = features
      .iter()
      .map(|feature| feature.index)
      .sorted()
      .next()
      .unwrap_or_default();

    let id = features.iter().map(|feature| &feature.id).unique().join("+");
    let name = features.iter().map(|feature| &feature.name).unique().join("+");
    let product = features.iter().map(|feature| &feature.product).unique().join("+");
    let feature_type = features.iter().map(|feature| &feature.feature_type).unique().join("+");

    let strand = {
      let strands = features.iter().map(|feature| &feature.strand).unique().collect_vec();
      match strands.as_slice() {
        &[strand] => strand.clone(),
        _ => GeneStrand::Unknown,
      }
    };

    let frame = {
      let frames = features.iter().map(|feature| &feature.frame).unique().collect_vec();
      match frames.as_slice() {
        &[frame] => *frame,
        _ => 0,
      }
    };

    let parent_ids = features
      .iter()
      .flat_map(|feature| &feature.parent_ids)
      .unique()
      .cloned()
      .collect_vec();

    let exceptions = features
      .iter()
      .flat_map(|feature| &feature.exceptions)
      .unique()
      .cloned()
      .collect_vec();

    let notes = features
      .iter()
      .flat_map(|feature| &feature.notes)
      .unique()
      .cloned()
      .collect_vec();

    let is_circular = features.iter().any(|feature| feature.is_circular);

    Self {
      index,
      id,
      name,
      product,
      feature_type,
      strand,
      frame,
      features: features.to_owned(),
      parent_ids,
      children: vec![],
      exceptions,
      notes,
      is_circular,
    }
  }

  #[must_use]
  #[inline]
  pub fn name_and_type(&self) -> String {
    format!("{} '{}'", shorten_feature_type(&self.feature_type), self.name)
  }

  #[must_use]
  #[inline]
  pub fn start(&self) -> usize {
    self
      .features
      .iter()
      .map(|feature| feature.start)
      .min()
      .unwrap_or_default()
  }

  #[must_use]
  #[inline]
  pub fn end(&self) -> usize {
    self
      .features
      .iter()
      .map(|feature| feature.end)
      .min()
      .unwrap_or_default()
  }
}
