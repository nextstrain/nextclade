use crate::gene::gene::{Gene, GeneStrand};
use multimap::MultiMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cds {
  pub id: String,
  pub name: String,
  pub segments: Vec<CdsSegment>,
  pub proteins: Vec<Protein>,
  pub compat_is_gene: bool,
}

impl Cds {
  /// HACK: COMPATIBILITY: if there are no CDS records, we pretend that each gene record imply a CDS with one segment and one protein
  pub fn from_gene(gene: &Gene) -> Self {
    let protein_segment = ProteinSegment {
      id: format!("protein-segment-from-gene-{}", gene.id.clone()),
      name: gene.gene_name.clone(),
      start: gene.start,
      end: gene.end,
      strand: gene.strand.clone(),
      frame: gene.frame,
      exceptions: gene.exceptions.clone(),
      attributes: gene.attributes.clone(),
      source_record: gene.source_record.clone(),
      compat_is_cds: true,
      compat_is_gene: true,
    };

    let protein = Protein {
      id: format!("protein-from-gene-{}", gene.id.clone()),
      name: gene.gene_name.clone(),
      segments: vec![protein_segment],
    };

    let cds_segment = CdsSegment {
      index: gene.index,
      id: format!("cds-segment-from-gene-{}", gene.id.clone()),
      name: gene.gene_name.clone(),
      start: gene.start,
      end: gene.end,
      strand: GeneStrand::Forward,
      frame: gene.frame,
      exceptions: gene.exceptions.clone(),
      attributes: gene.attributes.clone(),
      source_record: gene.source_record.clone(),
      compat_is_gene: true,
    };

    Self {
      id: format!("cds-from-gene-{}", gene.id),
      name: gene.gene_name.clone(),
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
