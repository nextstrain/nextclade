use crate::features::feature_type::shorten_feature_type;
use crate::gene::gene::GeneStrand;
use crate::io::gff3::GffCommonInfo;
use bio::io::gff::Record as GffRecord;
use eyre::Report;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Feature {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub feature_type: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub parent_ids: Vec<String>,
  pub exceptions: Vec<String>,
  pub notes: Vec<String>,
  pub is_circular: bool,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
}

impl Feature {
  pub fn from_gff_record((index, record): (usize, GffRecord)) -> Result<Self, Report> {
    let GffCommonInfo {
      id,
      name,
      start,
      end,
      strand,
      frame,
      exceptions,
      notes,
      is_circular,
      attributes,
      gff_record_str,
    } = GffCommonInfo::from_gff_record(&record)?;

    let name = name.unwrap_or_else(|| format!("Feature #{index}"));
    let id = attributes.get("ID").cloned().unwrap_or_else(|| name.clone());
    let feature_type = record.feature_type().to_owned();
    let parent_ids = attributes.get_vec("Parent").cloned().unwrap_or_default();

    Ok(Self {
      index,
      id,
      name,
      feature_type,
      start,
      end,
      strand,
      frame,
      parent_ids,
      exceptions,
      notes,
      is_circular,
      attributes,
      source_record: Some(gff_record_str),
    })
  }

  #[must_use]
  #[inline]
  pub fn name_and_type(&self) -> String {
    format!("{} '{}'", shorten_feature_type(&self.feature_type), self.name)
  }
}
