use crate::features::feature_group::FeatureGroup;
use crate::gene::gene::GeneStrand;
use crate::make_internal_error;
use eyre::Report;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Protein {
  pub id: String,
  pub name: String,
  pub segments: Vec<ProteinSegment>,
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
          strand: feature.strand.clone(),
          frame: feature.frame,
          exceptions: feature.exceptions.clone(),
          attributes: feature.attributes.clone(),
          source_record: feature.source_record.clone(),
          compat_is_cds: false,
          compat_is_gene: false,
        })
      })
      .collect::<Result<Vec<ProteinSegment>, Report>>()?;

    if segments.is_empty() {
      return make_internal_error!("Protein contains no segments")?;
    }

    Ok(Self {
      id: feature_group.id.clone(),
      name: feature_group.name.clone(),
      segments,
    })
  }

  pub fn name_and_type(&self) -> String {
    format!("Protein '{}'", self.name)
  }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ProteinSegment {
  pub id: String,
  pub name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
  pub compat_is_cds: bool,
  pub compat_is_gene: bool,
}

impl ProteinSegment {
  pub fn name_and_type(&self) -> String {
    format!("Protein segment '{}'", self.name)
  }
}
