use crate::features::feature::Feature;
use crate::features::feature_group::FeatureGroup;
use crate::gene::gene::GeneStrand;
use crate::gene::protein::{Protein, ProteinSegment};
use crate::make_internal_error;
use eyre::{eyre, Report, WrapErr};
use multimap::MultiMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cds {
  pub id: String,
  pub name: String,
  pub product: String,
  pub segments: Vec<CdsSegment>,
  pub proteins: Vec<Protein>,
  pub compat_is_gene: bool,
}

impl Cds {
  pub fn from_feature_group(feature_group: &FeatureGroup) -> Result<Self, Report> {
    assert_eq!(feature_group.feature_type, "CDS");

    // A CDS can consist of one or multiple CDS segments
    let segments = feature_group
      .features
      .iter()
      .map(|feature| {
        Ok(CdsSegment {
          index: feature.index,
          id: feature.id.clone(),
          name: feature.name.clone(),
          start: feature.start,
          end: feature.end,
          strand: feature.strand.clone(),
          frame: feature.frame,
          exceptions: feature.exceptions.clone(),
          attributes: feature.attributes.clone(),
          source_record: feature.source_record.clone(),
          compat_is_gene: false,
        })
      })
      .collect::<Result<Vec<CdsSegment>, Report>>()?;

    if segments.is_empty() {
      return make_internal_error!("CDS contains no segments")?;
    }

    let mut proteins = vec![];
    feature_group
      .children
      .iter()
      .try_for_each(|child_feature_group| find_proteins_recursive(child_feature_group, &mut proteins))?;

    Ok(Self {
      id: feature_group.id.clone(),
      name: feature_group.name.clone(),
      product: feature_group.product.clone(),
      segments,
      proteins,
      compat_is_gene: false,
    })
  }

  /// HACK: COMPATIBILITY: if there are no CDS records, we pretend that each gene record imply a CDS with one segment and one protein
  pub fn from_gene(feature: &Feature) -> Self {
    assert_eq!(feature.feature_type, "gene");

    let protein_segment = ProteinSegment {
      id: format!("protein-segment-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      start: feature.start,
      end: feature.end,
      strand: feature.strand.clone(),
      frame: feature.frame,
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
      source_record: feature.source_record.clone(),
      compat_is_cds: true,
      compat_is_gene: true,
    };

    let protein = Protein {
      id: format!("protein-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      segments: vec![protein_segment],
    };

    let cds_segment = CdsSegment {
      index: feature.index,
      id: format!("cds-segment-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      start: feature.start,
      end: feature.end,
      strand: feature.strand.clone(),
      frame: feature.frame,
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
      source_record: feature.source_record.clone(),
      compat_is_gene: true,
    };

    Self {
      id: format!("cds-from-gene-{}", feature.id),
      name: format!("cds-from-gene-{}", feature.name),
      product: feature.product.clone(),
      segments: vec![cds_segment],
      proteins: vec![protein],
      compat_is_gene: true,
    }
  }

  pub fn name_and_type(&self) -> String {
    format!("CDS '{}'", self.name)
  }
}

fn find_proteins_recursive(feature_group: &FeatureGroup, proteins: &mut Vec<Protein>) -> Result<(), Report> {
  if feature_group.feature_type == "mature_protein_region_of_CDS" {
    let protein = Protein::from_feature_group(feature_group)
      .wrap_err_with(|| eyre!("When processing protein, '{}'", feature_group.name))?;
    proteins.push(protein);
  }

  feature_group
    .children
    .iter()
    .try_for_each(|child_feature_group| find_proteins_recursive(child_feature_group, proteins))
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CdsSegment {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
  pub compat_is_gene: bool,
}

impl CdsSegment {
  pub fn name_and_type(&self) -> String {
    format!("CDS segment '{}'", self.name)
  }
}
