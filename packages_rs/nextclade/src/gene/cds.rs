use crate::features::feature::Feature;
use crate::gene::gene::GeneStrand;
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

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Protein {
  pub id: String,
  pub name: String,
  pub segments: Vec<ProteinSegment>,
}

impl Protein {
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
