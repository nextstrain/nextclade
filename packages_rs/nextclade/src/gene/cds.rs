use crate::features::feature::{Feature, Landmark};
use crate::features::feature_group::FeatureGroup;
use crate::gene::gene::GeneStrand;
use crate::gene::protein::{Protein, ProteinSegment};
use crate::io::container::take_exactly_one;
use crate::utils::range::NucRefGlobalRange;
use crate::{make_error, make_internal_error};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use num_traits::clamp_max;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Cds {
  pub id: String,
  pub name: String,
  pub product: String,
  pub strand: GeneStrand,
  pub segments: Vec<CdsSegment>,
  pub proteins: Vec<Protein>,
  pub compat_is_gene: bool,
  pub color: Option<String>,
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
          range: feature.range,
          landmark: feature.landmark.clone(),
          strand: feature.strand,
          frame: feature.frame,
          exceptions: feature.exceptions.clone(),
          attributes: feature.attributes.clone(),
          source_record: feature.source_record.clone(),
          compat_is_gene: false,
          color: None,
        })
      })
      .collect::<Result<Vec<CdsSegment>, Report>>()?;

    if segments.is_empty() {
      return make_internal_error!("CDS contains no segments")?;
    }

    let segments = split_circular_cds_segments(&segments)?;

    let mut proteins = vec![];
    feature_group
      .children
      .iter()
      .try_for_each(|child_feature_group| find_proteins_recursive(child_feature_group, &mut proteins))?;

    let strand = {
      let strands = segments.iter().map(|segment| segment.strand).unique().collect_vec();
      take_exactly_one(&strands)
        .wrap_err_with(|| {
          eyre!(
            "When deducing strand for CDS '{}' from strands of its segments",
            feature_group.name
          )
        })
        .cloned()
    }?;

    Ok(Self {
      id: feature_group.id.clone(),
      name: feature_group.name.clone(),
      product: feature_group.product.clone(),
      strand,
      segments,
      proteins,
      compat_is_gene: false,
      color: None,
    })
  }

  /// HACK: COMPATIBILITY: if there are no CDS records, we pretend that each gene record imply a CDS with one segment and one protein
  pub fn from_gene(feature: &Feature) -> Result<Self, Report> {
    assert_eq!(feature.feature_type, "gene");

    let protein_segment = ProteinSegment {
      id: format!("protein-segment-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      range: feature.range.clone(),
      strand: feature.strand,
      frame: feature.frame,
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
      source_record: feature.source_record.clone(),
      compat_is_cds: true,
      compat_is_gene: true,
      color: None,
    };

    let protein = Protein {
      id: format!("protein-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      product: feature.product.clone(),
      segments: vec![protein_segment],
      color: None,
    };

    let cds_segment = CdsSegment {
      index: feature.index,
      id: format!("cds-segment-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      range: feature.range.clone(),
      landmark: feature.landmark.clone(),
      strand: feature.strand,
      frame: feature.frame,
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
      source_record: feature.source_record.clone(),
      compat_is_gene: true,
      color: None,
    };

    let segments = vec![cds_segment];
    let segments = split_circular_cds_segments(&segments)?;

    Ok(Self {
      id: format!("cds-from-gene-{}", feature.id),
      name: feature.name.clone(),
      product: feature.product.clone(),
      strand: feature.strand,
      segments,
      proteins: vec![protein],
      compat_is_gene: true,
      color: None,
    })
  }

  pub fn name_and_type(&self) -> String {
    format!("CDS '{}'", self.name)
  }

  #[inline]
  pub fn len(&self) -> usize {
    self.segments.iter().map(CdsSegment::len).sum()
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }
}

/// Split features, which attached to circular landmark features, to strictly linear segments, without wraparound.
/// Each feature which goes beyond the landmark end will be split into at least 2 segments:
///   - from segment start to landmark end
///   - from landmark start to segment end, wrapped around (the overflowing segment)
/// We also support the case when feature wraps around more than once.
fn split_circular_cds_segments(segments: &[CdsSegment]) -> Result<Vec<CdsSegment>, Report> {
  let mut linear_segments = vec![];
  for segment in segments {
    if let Some(landmark) = &segment.landmark {
      if landmark.is_circular {
        validate_segment_bounds(segment, true)?;

        let landmark_start = landmark.range.begin;
        let landmark_end = landmark.range.end;

        let mut segment_end = segment.range.end;
        linear_segments.push({
          let mut segment = segment.clone();
          segment.range.end = clamp_max(segment_end, landmark_end); // Chop the overflowing part (beyond landmark)
          validate_segment_bounds(&segment, false)?;
          segment
        });

        while segment_end > landmark_end {
          segment_end = segment_end % landmark_end;

          linear_segments.push({
            let mut segment = segment.clone();
            segment.range.begin = landmark_start; // Chop the underflowing part (before landmark)
            segment.range.end = clamp_max(segment_end, landmark_end); // Chop the overflowing part (beyond landmark)
            validate_segment_bounds(&segment, false)?;
            segment
          });
        }
      } else {
        validate_segment_bounds(segment, false)?;
        linear_segments.push(segment.clone());
      }
    } else {
      validate_segment_bounds(segment, false)?;
      linear_segments.push(segment.clone());
    }
  }

  Ok(linear_segments)
}

fn validate_segment_bounds(segment: &CdsSegment, allow_overflow: bool) -> Result<(), Report> {
  if segment.range.begin > segment.range.end {
    return make_error!(
      "Gene map is invalid: In genomic feature '{}': Feature start > end: {} > {}",
      segment.name,
      segment.range.begin + 1,
      segment.range.end + 1,
    );
  }

  if let Some(landmark) = &segment.landmark {
    let landmark_start = landmark.range.begin;
    let landmark_end = landmark.range.end;

    if segment.range.begin < landmark_start {
      return make_error!(
      "Gene map is invalid: In genomic feature '{}': Feature start at position {} is outside of landmark feature bounds: {}..{}",
      segment.name,
      segment.range.begin + 1,
      landmark_start + 1,
      landmark_end + 1,
    );
    }

    if !allow_overflow && segment.range.end > landmark_end {
      return make_error!(
      "Gene map is invalid: In genomic feature '{}': Feature end at position {} is outside of landmark feature bounds: {}..{}",
      segment.name,
      segment.range.end + 1,
      landmark_start + 1,
      landmark_end + 1,
    );
    }
  }

  Ok(())
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

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CdsSegment {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub range: NucRefGlobalRange,
  pub landmark: Option<Landmark>,
  pub strand: GeneStrand,
  pub frame: i32,
  pub exceptions: Vec<String>,
  pub attributes: HashMap<String, Vec<String>>,
  pub source_record: Option<String>,
  pub compat_is_gene: bool,
  pub color: Option<String>,
}

impl CdsSegment {
  pub fn name_and_type(&self) -> String {
    format!("CDS segment '{}'", self.name)
  }

  #[inline]
  pub const fn len(&self) -> usize {
    self.range.len()
  }

  #[inline]
  pub const fn is_empty(&self) -> bool {
    self.len() == 0
  }
}
