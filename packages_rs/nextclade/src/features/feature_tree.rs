use crate::features::feature::{Feature, Landmark};
use crate::features::feature_group::FeatureGroup;
use crate::features::feature_tree_format::format_sequence_region_features;
use crate::features::sequence_region::SequenceRegion;
use crate::io::file::open_file_or_stdin;
use crate::make_error;
use crate::utils::error::to_eyre_error;
use bio::io::gff::{GffType, Reader as GffReader, Record as GffRecord};
use eyre::{eyre, Report, WrapErr};
use itertools::{chain, Itertools};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::path::Path;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FeatureTree {
  pub seq_regions: Vec<SequenceRegion>,
}

impl FeatureTree {
  pub fn from_gff3_file<P: AsRef<Path>>(filename: P) -> Result<Self, Report> {
    let filename = filename.as_ref();
    let mut file = open_file_or_stdin(&Some(filename))?;
    let mut buf = vec![];
    {
      file.read_to_end(&mut buf)?;
    }
    Self::from_gff3_str(&String::from_utf8(buf)?).wrap_err_with(|| eyre!("When reading file: {filename:?}"))
  }

  pub fn from_gff3_str(content: &str) -> Result<Self, Report> {
    let seq_regions = read_gff3_feature_tree_str(content)?;
    Ok(Self { seq_regions })
  }

  pub fn to_pretty_string(&self) -> Result<String, Report> {
    let mut buf = Vec::<u8>::new();
    {
      format_sequence_region_features(&mut buf, &self.seq_regions)?;
    }
    Ok(String::from_utf8(buf)?)
  }
}

/// Read GFF3 records given a string
fn read_gff3_feature_tree_str(content: &str) -> Result<Vec<SequenceRegion>, Report> {
  // Find char ranges of sequence regions in GFF file
  let ranges = {
    // Find where sequence regions start
    let begins = content.match_indices("##sequence-region").collect_vec();

    // Find where the GFF entries end (the "tail")
    let tail = content.match_indices("###").collect_vec();

    // Extract indices
    let mut begins = chain(&begins, &tail)
      .map(|(index, _)| index)
      .sorted()
      .unique()
      .copied()
      .collect_vec();

    if begins.len() == 1 {
      // The subsequent iteration in pairs will have no iterations if there's only 1 item.
      // But we want to keep the first range when it's the only range. So let's fixup the array of indices by pushing
      // the `end` once more.
      let end = if tail.len() == 1 { tail[0].0 } else { content.len() };
      begins.push(end);
    }

    // Iterate over pairs of adjacent indices, which give us ranges. The last "tail" range is conveniently excluded.
    begins
      .into_iter()
      .tuple_windows()
      .map(|(content_begin, content_end)| {
        #[allow(clippy::string_slice)]
        let content = &content[content_begin..content_end - 1];
        (content, content_begin, content_end)
      })
      .collect_vec()
  };

  if !ranges.is_empty() {
    // Parse text ranges into sequence regions data structures (along with its entries)
    ranges
    .into_iter()
    .enumerate()
    .map(|(index,(content, content_begin, content_end))| {
      let content = content.trim();

      // Extract '##sequence-region' header line
      let header_line = content
        .lines()
        .next()
        .ok_or_else(|| eyre!("When parsing '##sequence-region' starting at line {content_begin}: content of the region is empty"))?;

      // Parse '##sequence-region {id} {start} {end}' header line
      let (id, start, end) = parse_sequence_region_header(header_line).wrap_err_with(|| {
        format!("When parsing '##sequence-region' header at line {content_begin}:\n  {header_line}")
      })?;

      // Parse GFF entries of the region
      let mut reader = GffReader::new(content.as_bytes(), GffType::GFF3);
      let children = process_gff_records(&mut reader)
        .wrap_err_with(|| {
          eyre!("When processing GFF entries of ##sequence-region '{id} {start} {end}' starting at line {content_begin}:\n  {content}")
        })?;

      Ok(SequenceRegion {
        index,
        id,
        start,
        end,
        children,
      })
    })
    .collect()
  } else {
    // There is no '##sequence-region' lines in this file. Pretend the whole file is one sequence region.
    let mut reader = GffReader::new(content.as_bytes(), GffType::GFF3);
    let children = process_gff_records(&mut reader).wrap_err("When parsing GFF3 file")?;
    let end = children.iter().map(FeatureGroup::end).max().unwrap_or_default();

    let id = children
      .iter()
      .find(|child| child.feature_type == "region")
      .map_or_else(|| "Untitled".to_owned(), |region| region.id.clone());

    Ok(vec![SequenceRegion {
      index: 0,
      id,
      start: 0,
      end,
      children,
    }])
  }
}

fn parse_sequence_region_header(line: &str) -> Result<(String, usize, usize), Report> {
  const SEQ_REGION_REGEX: &str = r"^##sequence-region\s+(?P<id>\S+?)\s+(?P<start>\d{1,10})\s+(?P<end>\d{1,10})$";

  lazy_static! {
    static ref RE: Regex = Regex::new(SEQ_REGION_REGEX)
      .wrap_err_with(|| format!("When compiling regular expression '{SEQ_REGION_REGEX}'"))
      .unwrap();
  }

  let captures = RE.captures(line).ok_or_else(|| eyre!("Unknown format"))?;
  match (captures.name("id"), captures.name("start"), captures.name("end")) {
    (Some(id), Some(start), Some(end)) => {
      let id = id.as_str().to_owned();

      let start = start
        .as_str()
        .parse::<usize>()
        .wrap_err_with(|| format!("When parsing start position:\n  {}", start.as_str()))?;

      let start = start - 1; // Convert to 0-based indices

      let end = end
        .as_str()
        .parse::<usize>()
        .wrap_err_with(|| format!("When parsing end position:\n  {}", end.as_str()))?;

      Ok((id, start, end))
    }
    _ => make_error!("Unknown format: 'seqid', 'start' or 'end' positions not found"),
  }
}

/// Read GFF3 records and convert them into the internal representation
fn process_gff_records<R: Read>(reader: &mut GffReader<R>) -> Result<Vec<FeatureGroup>, Report> {
  let records = reader
    .records()
    .map(to_eyre_error)
    .collect::<Result<Vec<GffRecord>, Report>>()?;

  // let records_copy = records.clone();

  let mut features = records
    .into_iter()
    .enumerate()
    // .map(|(index, record)| {
    //   let landmark = find_landmark(index, record, records);
    //   (index, record, landmark)
    // })
    // .map(|(index, record, landmark)| Feature::from_gff_record(index, record, landmark))
    .map(|(index, record)| Feature::from_gff_record(index, record))
    .collect::<Result<Vec<Feature>, Report>>()?;

  validate(&features)?;

  if features.is_empty() {
    return make_error!("Gene map contains no features. This is not allowed.");
  }

  process_circular_features(&mut features)?;

  build_hierarchy_of_features(&features)
}

fn process_circular_features(features: &mut [Feature]) -> Result<(), Report> {
  let features2 = features.to_owned(); // TODO(perf): avoid copy

  features.iter_mut().try_for_each(|feature| {
      // Find the landmark feature for this feature. Landmark feature is a feature used to establish the coordinate
      // system for the current feature. The ID of the landmark feature is contained in the 'seqid' column of each
      // feature.
      let landmark = features2.iter().find(|candidate| {
        // HACK: the 'seqid' does not always matches the landmark 'ID' exactly. Sometimes ID contains additional range
        // number after a colon. For better compatibility with the existing GFF files, we strip these extra details
        // before matching the two IDs.
        match candidate.id.split(':').next() {
          Some(candidate_id) => feature.seqid == candidate_id,
          None => false,
        }
      });

    match landmark {
      None => make_error!("Gene map is invalid: In genomic feature '{}': The column 'seqid' (column 0) refers to feature '{}', but the feature with such 'ID' attribute is not found. Make sure that the column 'seqid' (column 0) contains an 'ID' of the landmark feature and that this feature exists.", feature.name, feature.seqid),
      Some(landmark) => {
        // If the landmark is circular, the features anchored on it can wrap around the end of its range.
        // To indicate that, we mark each feature with an optional attribute to facilitate computations later.
        feature.landmark = Landmark::from_feature(landmark);
        Ok(())
      }
    }
  })
}

/// Assemble list of features with parent-child relationships into a hierarchy
fn build_hierarchy_of_features(features: &[Feature]) -> Result<Vec<FeatureGroup>, Report> {
  // Group children according to their `ID` (Features with the same `ID` are considered the same feature, just split into multiple segments).
  let all_features = features
    .iter()
    .group_by(|feature| feature.id.clone())
    .into_iter()
    .map(|(id, features)| FeatureGroup::new(&id, &features.cloned().collect_vec()))
    .collect_vec();

  // Find top-level features (having no parents)
  let features_top_level = all_features
    .iter()
    .filter(|feature_group| feature_group.parent_ids.is_empty())
    .sorted()
    .cloned()
    .collect_vec();

  // Convert a flat list of features into a tree. The features are matched by `ID` attribute in the parent and `Parent` attribute in child.
  let feature_groups = build_hierarchy_of_features_recursive(&features_top_level, &all_features)?;

  Ok(feature_groups)
}

fn build_hierarchy_of_features_recursive(
  parent_features: &[FeatureGroup],
  all_features: &[FeatureGroup],
) -> Result<Vec<FeatureGroup>, Report> {
  parent_features
    .iter()
    .cloned()
    .map(|mut parent_feature| {
      let children = all_features
        .iter()
        .filter(|child_feature| child_feature.parent_ids.contains(&parent_feature.id))
        .cloned()
        .collect_vec();

      let children = build_hierarchy_of_features_recursive(&children, all_features)?;

      parent_feature.children = children;
      Ok(parent_feature)
    })
    .collect()
}

pub fn flatten_feature_tree(feature_map: &[FeatureGroup]) -> Vec<(usize, Feature)> {
  let mut feature_map_flat = vec![];
  flatten_feature_map_recursive(feature_map, 0, &mut feature_map_flat);
  feature_map_flat
}

fn flatten_feature_map_recursive(
  feature_map: &[FeatureGroup],
  depth: usize,
  feature_map_flat: &mut Vec<(usize, Feature)>,
) {
  feature_map.iter().cloned().for_each(|feature_group| {
    feature_map_flat.extend(
      feature_group
        .features
        .iter()
        .map(|feature| (depth, feature.clone()))
        .collect_vec(),
    );
    flatten_feature_map_recursive(&feature_group.children, depth + 1, feature_map_flat);
  });
}

fn validate(features: &[Feature]) -> Result<(), Report> {
  let mut errors: Vec<String> = vec![];

  let mut missing_parents = vec![];
  let mut self_reference = vec![];
  for feature1 in features {
    feature1.parent_ids.iter().for_each(|parent_id| {
      let feature2 = features.iter().find(|feature2| &feature2.id == parent_id);
      match feature2 {
        None => {
          missing_parents.push((parent_id, feature1));
        }
        Some(feature2) => {
          if feature2.id == feature1.id {
            self_reference.push(feature1);
          }
        }
      }
    });
  }

  if !missing_parents.is_empty() {
    let details = missing_parents
      .iter()
      .map(|(parent_id, feature)| format!("  - ID={};Name={};Parent={}", feature.id, feature.name, parent_id))
      .join("\n");

    errors.push(format!("The following features refer to non-existing parents:\n{details}\nFor each case, make sure attribute 'Parent' contains an 'ID' of an existing feature, or remove attribute 'Parent'."));
  }

  if !self_reference.is_empty() {
    let details = self_reference
      .iter()
      .map(|feature| format!("  - ID={};Name={}", feature.id, feature.name))
      .join("\n");

    errors.push(format!("The following features refer to themselves:\n{details}\nFor each case, make sure the attribute 'Parent' does not contain the 'ID' of the feature itself."));
  }

  if !errors.is_empty() {
    return make_error!(
      "Gene map is invalid. The following errors were found:\n\n{}",
      errors.join("\n\n")
    );
  }

  Ok(())
}
