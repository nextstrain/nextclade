use crate::features::feature_group::FeatureGroup;
use crate::gene::gene::GeneStrand;
use crate::make_internal_error;
use eyre::Report;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Protein {
  pub id: String,
  pub name: String,
  pub product: String,
  pub segments: Vec<ProteinSegment>,
  pub color: Option<String>,
}

impl Protein {
  pub fn from_feature_group(feature_group: &FeatureGroup) -> Result<Self, Report> {
    assert!(
      &["mature_protein_region_of_CDS", "signal_peptide_region_of_CDS"].contains(&feature_group.feature_type.as_str())
    );

    // A protein can consist of one or multiple protein segments
    let segments = feature_group
      .features
      .iter()
      .map(|feature| {
        Ok(ProteinSegment {
          id: feature.id.clone(),
          name: feature.name.clone(),
          start: feature.start,
          end: feature.end,
          strand: feature.strand,
          frame: feature.frame,
          exceptions: feature.exceptions.clone(),
          attributes: feature.attributes.clone(),
          source_record: feature.source_record.clone(),
          compat_is_cds: false,
          compat_is_gene: false,
          color: None,
        })
      })
      .collect::<Result<Vec<ProteinSegment>, Report>>()?;

    if segments.is_empty() {
      return make_internal_error!("Protein contains no segments")?;
    }

    Ok(Self {
      id: feature_group.id.clone(),
      name: feature_group.name.clone(),
      product: feature_group.product.clone(),
      segments,
      color: None,
    })
  }

  pub fn name_and_type(&self) -> String {
    format!("Protein '{}'", self.name)
  }
}

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ProteinSegment {
  pub id: String,
  pub name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub exceptions: Vec<String>,
  pub attributes: HashMap<String, Vec<String>>,
  pub source_record: Option<String>,
  pub compat_is_cds: bool,
  pub compat_is_gene: bool,
  pub color: Option<String>,
}

impl ProteinSegment {
  pub fn name_and_type(&self) -> String {
    format!("Protein segment '{}'", self.name)
  }
}
