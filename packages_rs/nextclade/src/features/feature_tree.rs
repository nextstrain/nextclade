use crate::features::feature::Feature;
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
pub struct FeatureTree {
  pub seq_regions: Vec<SequenceRegion>,
}

impl FeatureTree {
  pub fn from_gff3_file<P: AsRef<Path>>(filename: P) -> Result<Self, Report> {
    let mut file = open_file_or_stdin(&Some(filename))?;
    let mut buf = vec![];
    {
      file.read_to_end(&mut buf)?;
    }
    Self::from_gff3_str(&String::from_utf8(buf)?)
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
    let begins = content.match_indices("##sequence-region");

    // Find where the GFF entries end (the "tail")
    let tail = content.match_indices("###");

    // Extract indices
    let begins = chain(begins, tail)
      .map(|(index, _)| index)
      .sorted()
      .unique()
      .collect_vec();

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
    let children = process_gff_records(&mut reader).wrap_err("When reading GFF3 file")?;
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
  let features = reader
    .records()
    .map(to_eyre_error)
    .collect::<Result<Vec<GffRecord>, Report>>()?
    .into_iter()
    .enumerate()
    .map(Feature::from_gff_record)
    .collect::<Result<Vec<Feature>, Report>>()?;

  if features.is_empty() {
    return make_error!("Gene map contains no features. This is not allowed.");
  }

  build_hierarchy_of_features(&features)
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
