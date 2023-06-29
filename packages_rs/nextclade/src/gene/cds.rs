use crate::features::feature::Feature;
use crate::features::feature_group::FeatureGroup;
use crate::gene::cds_segment::{CdsSegment, WrappingPart};
use crate::gene::frame::Frame;
use crate::gene::phase::Phase;
use crate::gene::protein::{Protein, ProteinSegment};
use crate::utils::range::{NucRefLocalRange, Range};
use crate::{make_error, make_internal_error};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use maplit::hashmap;
use num_traits::clamp_max;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::Display;

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Cds {
  pub id: String,
  pub name: String,
  pub product: String,
  pub segments: Vec<CdsSegment>,
  pub proteins: Vec<Protein>,
  pub exceptions: Vec<String>,
  pub attributes: HashMap<String, Vec<String>>,
  pub compat_is_gene: bool,
  pub color: Option<String>,
}

impl Cds {
  pub fn from_feature_group(feature_group: &FeatureGroup) -> Result<Self, Report> {
    assert_eq!(feature_group.feature_type, "CDS");

    // A CDS can consist of one or multiple CDS segments
    let segments = {
      feature_group
        .features
        .iter()
        .map({
          let mut begin = 0;

          move |feature| {
            let range_local = Range::from_usize(begin, begin + feature.range.len());
            let phase = Phase::from_begin(range_local.begin)?;
            let frame = Frame::from_begin(feature.range.begin)?;

            let segment = CdsSegment {
              index: feature.index,
              id: feature.id.clone(),
              name: feature.name.clone(),
              range: feature.range.clone(),
              range_local: Range::from_usize(begin, begin + feature.range.len()),
              landmark: feature.landmark.clone(),
              wrapping_part: WrappingPart::NonWrapping,
              strand: feature.strand,
              frame,
              phase,
              exceptions: feature.exceptions.clone(),
              attributes: feature.attributes.clone(),
              source_record: feature.source_record.clone(),
              compat_is_gene: false,
              color: None,
            };

            begin += feature.range.len();

            Ok(segment)
          }
        })
        .collect::<Result<Vec<CdsSegment>, Report>>()
    }?;

    if segments.is_empty() {
      return make_internal_error!("CDS contains no segments")?;
    }

    let segments = split_circular_cds_segments(&segments)?;

    let mut proteins = vec![];
    feature_group
      .children
      .iter()
      .try_for_each(|child_feature_group| find_proteins_recursive(child_feature_group, &mut proteins))?;

    let attributes: HashMap<String, Vec<String>> = {
      let mut attributes: HashMap<String, Vec<String>> = hashmap! {};
      for segment in &segments {
        for (k, vs) in &segment.attributes {
          attributes.entry(k.clone()).or_default().extend_from_slice(vs);
        }
      }
      attributes
        .into_iter()
        .map(|(k, vs)| (k, vs.into_iter().unique().collect_vec()))
        .collect()
    };

    let exceptions = segments
      .iter()
      .flat_map(|segment| segment.exceptions.clone())
      .unique()
      .collect_vec();

    Ok(Self {
      id: feature_group.id.clone(),
      name: feature_group.name.clone(),
      product: feature_group.product.clone(),
      segments,
      proteins,
      exceptions,
      attributes,
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

    let range_local = Range::from_usize(0, feature.range.len());
    let phase = Phase::from_begin(range_local.begin)?;
    let frame = Frame::from_begin(feature.range.begin)?;

    let cds_segment = CdsSegment {
      index: feature.index,
      id: format!("cds-segment-from-gene-{}", feature.id.clone()),
      name: feature.name.clone(),
      range: feature.range.clone(),
      range_local,
      landmark: feature.landmark.clone(),
      wrapping_part: WrappingPart::NonWrapping,
      strand: feature.strand,
      frame,
      phase,
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
      segments,
      proteins: vec![protein],
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
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
///   - the part from segment start to landmark end, before the wrap around
///   - (optionally) the middle parts spanning the entire sequence
///   - the last part from landmark start to segment end
fn split_circular_cds_segments(segments: &[CdsSegment]) -> Result<Vec<CdsSegment>, Report> {
  let mut linear_segments = vec![];
  for segment in segments {
    if let Some(landmark) = &segment.landmark {
      if landmark.is_circular && segment.range.end > landmark.range.end {
        // The landmark features is circular and segment overflows (wraps around) it. Let's split this segment into
        // a group of non-wrapping linear parts.
        validate_segment_bounds(segment, true)?;

        let landmark_start = landmark.range.begin;
        let landmark_end = landmark.range.end;

        let mut segment_local_begin = 0;
        let mut segment_end = segment.range.end;

        // The first part, which is before the first wraparound
        linear_segments.push({
          let mut segment = segment.clone();
          segment.range.end = clamp_max(segment_end, landmark_end); // Chop the overflowing part (beyond landmark).
          segment.range_local = NucRefLocalRange::from_usize(segment_local_begin, segment_local_begin + segment.len());
          segment_local_begin += segment.len();

          segment.wrapping_part = WrappingPart::WrappingStart; // Mark this part as the first part of the wrapping group.
          validate_segment_bounds(&segment, false)?;
          segment
        });

        // The followup parts, beyond the first wraparound. Note that the segment can wrap more then once.
        let mut part_counter = 1;
        while segment_end > landmark_end {
          segment_end = segment_end % landmark_end;

          linear_segments.push({
            let mut segment = segment.clone();
            segment.range.begin = landmark_start; // Chop the underflowing part (before landmark).
            segment.range.end = clamp_max(segment_end, landmark_end); // Chop the overflowing part (beyond landmark),
                                                                      // in case the segment wraps multiple times.
            segment.range_local =
              NucRefLocalRange::from_usize(segment_local_begin, segment_local_begin + segment.len());
            segment_local_begin += segment.len();

            segment.wrapping_part = WrappingPart::WrappingCentral(part_counter); // Mark this part as one of the
                                                                                 // follow up parts in the wrapping
                                                                                 // group, beyond the first wraparound.
            validate_segment_bounds(&segment, false)?;
            segment
          });

          part_counter += 1;
        }

        // Mark the last part specially
        if let Some(last_part) = linear_segments.last_mut() {
          last_part.wrapping_part = WrappingPart::WrappingEnd(part_counter - 1);
        }
      } else {
        // The landmark feature is not circular or this segment is within its boundaries.
        validate_segment_bounds(segment, false)?;
        linear_segments.push(segment.clone());
      }
    } else {
      // No landmark feature. This segment is not circular.
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
