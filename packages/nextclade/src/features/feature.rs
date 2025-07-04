use crate::coord::range::NucRefGlobalRange;
use crate::features::feature_type::shorten_feature_type;
use crate::gene::gene::GeneStrand;
use crate::io::gff3_encoding::gff_decode_attribute;
use crate::io::gff3_reader::{get_one_of_attributes_optional, GffCommonInfo};
use crate::utils::collections::first;
use bio::io::gff::Record as GffRecord;
use eyre::{Context, Report};
use indexmap::IndexMap;
use itertools::Itertools;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct Feature {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub product: String,
  pub feature_type: String,
  pub range: NucRefGlobalRange,
  pub landmark: Option<Landmark>,
  pub strand: GeneStrand,
  pub parent_ids: Vec<String>,
  pub seqid: String, // Column 0 in the GFF file
  pub exceptions: Vec<String>,
  pub notes: Vec<String>,
  pub is_circular: bool,
  pub attributes: IndexMap<String, Vec<String>>,
  #[serde(skip)]
  pub source_record: Option<String>,
  pub gff_seqid: Option<String>,
  pub gff_source: Option<String>,
  pub gff_feature_type: Option<String>,
}

impl Feature {
  pub fn from_gff_record(index: usize, record: &GffRecord) -> Result<Self, Report> {
    let GffCommonInfo {
      id,
      name,
      range,
      strand,
      exceptions,
      notes,
      is_circular,
      attributes,
      gff_record_str,
      gff_seqid,
      gff_source,
      gff_feature_type,
    } = GffCommonInfo::from_gff_record(record)?;

    let attributes: IndexMap<String, Vec<String>> =
      attributes.into_iter().map(gff_read_convert_attributes).try_collect()?;

    let name = name.unwrap_or_else(|| format!("Feature #{index}"));
    let id = id.unwrap_or_else(|| {
      attributes
        .get("ID")
        .and_then(|ids| first(ids).ok())
        .cloned()
        .unwrap_or_else(|| name.clone())
    });
    let feature_type = record.feature_type().to_owned();
    let parent_ids = attributes.get("Parent").cloned().unwrap_or_default();
    let product = get_one_of_attributes_optional(record, &["Product", "product", "Protein", "protein", "protein_id"])
      .unwrap_or_else(|| name.clone());
    let seqid = record.seqname().to_owned();

    Ok(Self {
      index,
      id,
      name,
      product,
      feature_type,
      range,
      landmark: None,
      strand,
      parent_ids,
      seqid,
      exceptions,
      notes,
      is_circular,
      attributes,
      source_record: Some(gff_record_str),
      gff_seqid,
      gff_source,
      gff_feature_type,
    })
  }

  #[must_use]
  #[inline]
  pub fn name_and_type(&self) -> String {
    format!("{} '{}'", shorten_feature_type(&self.feature_type), self.name)
  }
}

fn gff_read_convert_attributes((key, values): (String, Vec<String>)) -> Result<(String, Vec<String>), Report> {
  let key = gff_decode_attribute(&key).wrap_err_with(|| format!("Failed to decode GFF attribute key: {key:?}"))?;
  let values: Vec<String> = values
    .into_iter()
    .map(|v| {
      gff_decode_attribute(&v).wrap_err_with(|| format!("Failed to decode GFF attribute value: {v:?} for key: {key:?}"))
    })
    .try_collect()?;
  Ok((key, values))
}

#[derive(Clone, Default, Debug, Deserialize, Serialize, PartialEq, Eq, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Landmark {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub range: NucRefGlobalRange,
  pub strand: GeneStrand,
  pub is_circular: bool,
}

impl Landmark {
  pub fn from_feature(feature: &Feature) -> Landmark {
    let Feature {
      index,
      id,
      name,
      range,
      strand,
      is_circular,
      ..
    } = feature;

    Self {
      index: *index,
      name: name.clone(),
      id: id.clone(),
      range: range.clone(),
      strand: *strand,
      is_circular: *is_circular,
    }
  }
}
