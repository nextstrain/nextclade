use crate::features::feature::{Feature, Landmark};
use crate::features::feature_group::FeatureGroup;
use crate::gene::gene::GeneStrand;
use crate::gene::protein::{Protein, ProteinSegment};
use crate::io::container::take_exactly_one;
use crate::{make_error, make_internal_error};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use multimap::MultiMap;
use num_traits::{clamp, clamp_max};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cds {
  pub id: String,
  pub name: String,
  pub product: String,
  pub strand: GeneStrand,
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
          landmark: feature.landmark.clone(),
          strand: feature.strand,
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
    })
  }

  /// HACK: COMPATIBILITY: if there are no CDS records, we pretend that each gene record imply a CDS with one segment and one protein
  pub fn from_gene(feature: &Feature) -> Result<Self, Report> {
    assert_eq!(feature.feature_type, "gene");

    let protein_segment = ProteinSegment {
      id: format!("protein-segment-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      start: feature.start,
      end: feature.end,
      strand: feature.strand,
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
      product: feature.product.clone(),
      segments: vec![protein_segment],
    };

    let cds_segment = CdsSegment {
      index: feature.index,
      id: format!("cds-segment-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      start: feature.start,
      end: feature.end,
      landmark: feature.landmark.clone(),
      strand: feature.strand,
      frame: feature.frame,
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
      source_record: feature.source_record.clone(),
      compat_is_gene: true,
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

        let landmark_start = landmark.start;
        let landmark_end = landmark.end;

        let mut segment_end = segment.end;
        linear_segments.push({
          let mut segment = segment.clone();
          segment.end = clamp_max(segment_end, landmark_end); // Chop the overflowing part (beyond landmark)
          validate_segment_bounds(&segment, false)?;
          segment
        });

        while segment_end > landmark_end {
          segment_end = segment_end % landmark_end;

          linear_segments.push({
            let mut segment = segment.clone();
            segment.start = landmark_start; // Chop the underflowing part (before landmark)
            segment.end = clamp_max(segment_end, landmark_end); // Chop the overflowing part (beyond landmark)
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
  if segment.start > segment.end {
    return make_error!(
      "Gene map is invalid: In genomic feature '{}': Feature start > end: {} > {}",
      segment.name,
      segment.start + 1,
      segment.end + 1,
    );
  }

  if let Some(landmark) = &segment.landmark {
    let landmark_start = landmark.start;
    let landmark_end = landmark.end;

    if segment.start < landmark_start {
      return make_error!(
      "Gene map is invalid: In genomic feature '{}': Feature start at position {} is outside of landmark feature bounds: {}..{}",
      segment.name,
      segment.start + 1,
      landmark_start + 1,
      landmark_end + 1,
    );
    }

    if !allow_overflow && segment.end > landmark_end {
      return make_error!(
      "Gene map is invalid: In genomic feature '{}': Feature end at position {} is outside of landmark feature bounds: {}..{}",
      segment.name,
      segment.end + 1,
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

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CdsSegment {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub start: usize,
  pub end: usize,
  pub landmark: Option<Landmark>,
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

  #[inline]
  pub const fn len(&self) -> usize {
    self.end - self.start
  }

  #[inline]
  pub const fn is_empty(&self) -> bool {
    self.len() == 0
  }
}
