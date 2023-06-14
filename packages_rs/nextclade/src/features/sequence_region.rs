use crate::features::feature_group::FeatureGroup;
use crate::features::feature_type::shorten_feature_type;
use crate::utils::range::NucRefGlobalRange;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct SequenceRegion {
  pub index: usize,
  pub id: String,
  pub range: NucRefGlobalRange,
  pub children: Vec<FeatureGroup>,
}

impl SequenceRegion {
  #[must_use]
  #[inline]
  pub fn name_and_type(&self) -> String {
    format!("{} '{}'", shorten_feature_type("Sequence region"), self.id)
  }
}
