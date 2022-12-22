use crate::gene::gene::{Gene, GeneStrand};
use crate::io::gff3::GffCommonInfo;
use crate::utils::collections::are_all_equal;
use crate::utils::string::surround_with_quotes;
use crate::{make_error, make_internal_error};
use bio::io::gff::Record as GffRecord;
use eyre::Report;
use itertools::Itertools;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cds {
  pub id: String,
  pub name: String,
  pub segments: Vec<CdsSegment>,
  pub parent_ids: Vec<String>,
  pub mprs: Vec<MatureProteinRegion>,
  pub compat_is_gene: bool,
}

impl Cds {
  pub fn from_segments(id: &str, segments: Vec<CdsSegment>) -> Result<Self, Report> {
    let ids = segments.iter().map(|segment| &segment.id).collect_vec();
    if !are_all_equal(&ids) {
      return make_internal_error!(
        "Gene Map: all CDS segments which belong to the same CDS must have the same `ID` attribute, but found: {}",
        ids.iter().unique().map(surround_with_quotes).join(", ")
      );
    }

    let parent_id_sets = segments
      .iter()
      .map(|segment| segment.attributes.get_vec("Parent").cloned().unwrap_or_default())
      .collect_vec();

    if !are_all_equal(&parent_id_sets) {
      return make_error!("Gene Map: all CDS segments which belong to the same CDS (have the same `ID` attribute) must have the same set of parents (`Parent` attribute)");
    }

    let name = segments.iter().map(|segment| &segment.name).unique().join("+");

    let parent_ids = parent_id_sets.first().unwrap_or(&vec![]).iter().cloned().collect_vec();

    let mprs = segments
      .iter()
      .flat_map(|segment| &segment.mprs)
      .unique_by(|mpr| &mpr.id)
      .cloned()
      .collect_vec();

    Ok(Self {
      id: id.to_owned(),
      name,
      segments,
      parent_ids,
      mprs,
      compat_is_gene: false,
    })
  }

  /// HACK: COMPATIBILITY: if there are no CDS records, we pretend that each gene record imply a CDS with a segment
  pub fn from_gene(gene: &Gene) -> Self {
    let cds_id = format!("cds-from-gene-{}", gene.id.clone());
    let cds_segment_id = format!("cds-segment-from-gene-{}", gene.id.clone());
    Self {
      id: cds_id.clone(),
      name: gene.gene_name.clone(),
      parent_ids: vec![cds_id],
      mprs: vec![],
      segments: vec![CdsSegment {
        index: gene.index,
        id: cds_segment_id,
        name: gene.gene_name.clone(),
        start: gene.start,
        end: gene.end,
        strand: GeneStrand::Forward,
        frame: gene.frame,
        mprs: vec![],
        exceptions: gene.exceptions.clone(),
        attributes: gene.attributes.clone(),
        source_record: gene.source_record.clone(),
        compat_is_gene: true,
      }],
      compat_is_gene: true,
    }
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
  pub mprs: Vec<MatureProteinRegion>,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
  pub compat_is_gene: bool,
}

impl CdsSegment {
  pub fn from_gff_record((index, record): &(usize, GffRecord)) -> Result<Self, Report> {
    let GffCommonInfo {
      id,
      name,
      start,
      end,
      strand,
      frame,
      exceptions,
      attributes,
      gff_record_str,
    } = GffCommonInfo::from_gff_record(record)?;

    let id = id.unwrap_or_else(|| format!("cds-segment-{index}"));
    let name = name.unwrap_or_else(|| id.clone());

    Ok(Self {
      index: *index,
      id,
      name,
      start,
      end,
      strand: GeneStrand::Forward,
      frame,
      mprs: vec![],
      exceptions,
      attributes,
      source_record: Some(gff_record_str),
      compat_is_gene: false,
    })
  }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct MatureProteinRegion {
  pub id: String,
  pub name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub parent_ids: Vec<String>,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
}

impl MatureProteinRegion {
  pub fn from_gff_record((index, record): &(usize, GffRecord)) -> Result<Self, Report> {
    let GffCommonInfo {
      id,
      name,
      start,
      end,
      strand,
      frame,
      exceptions,
      attributes,
      gff_record_str,
    } = GffCommonInfo::from_gff_record(record)?;

    let id = id.unwrap_or_else(|| format!("mpr-{index}"));
    let name = name.unwrap_or_else(|| id.clone());
    let parent_ids = attributes.get_vec("Parent").cloned().unwrap_or_default();

    Ok(Self {
      id,
      name,
      start,
      end,
      strand,
      frame,
      parent_ids,
      exceptions,
      attributes,
      source_record: Some(gff_record_str),
    })
  }
}
