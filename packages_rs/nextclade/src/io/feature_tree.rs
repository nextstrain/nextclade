use crate::gene::gene::GeneStrand;
use crate::io::gene_map::format_codon_length;
use crate::io::gff3::GffCommonInfo;
use crate::make_error;
use crate::utils::error::to_eyre_error;
use crate::utils::string::{surround_with_quotes, truncate_with_ellipsis};
use bio::io::gff::{GffType, Reader as GffReader, Record as GffRecord};
use color_eyre::Section;
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use lazy_static::lazy_static;
use multimap::MultiMap;
use num_traits::clamp;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use std::hash::Hash;
use std::io::{Read, Write};
use std::path::Path;

pub const NAME_ATTRS: &[&str] = &["Name", "name", "gene_name", "gene", "locus_tag", "product", "ID"];

lazy_static! {
  pub static ref NAME_ATTRS_STR: String = NAME_ATTRS.iter().map(surround_with_quotes).join(", ");
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Feature {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub feature_type: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub parent_ids: Vec<String>,
  pub children: Vec<Feature>,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
}

impl Feature {
  pub fn from_gff_record((index, record): (usize, GffRecord)) -> Result<Self, Report> {
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
    } = GffCommonInfo::from_gff_record(&record)?;

    let name = name.unwrap_or_else(|| format!("Feature #{index}"));
    let id = attributes.get("ID").cloned().unwrap_or_else(|| name.clone());
    let feature_type = record.feature_type().to_owned();
    let parent_ids = attributes.get_vec("Parent").cloned().unwrap_or_default();

    Ok(Self {
      index,
      id,
      name,
      feature_type,
      start,
      end,
      strand,
      frame,
      parent_ids,
      children: vec![],
      exceptions,
      attributes,
      source_record: Some(gff_record_str),
    })
  }

  #[must_use]
  #[inline]
  pub fn name_and_type(&self) -> String {
    format!("{} '{}'", self.feature_type, self.name)
  }
}

/// Read GFF3 records given a file
pub fn read_gff3_feature_map<P: AsRef<Path>>(filename: P) -> Result<Vec<Feature>, Report> {
  let filename = filename.as_ref();
  let mut reader = GffReader::from_file(filename, GffType::GFF3).map_err(|report| eyre!(report))?;
  process_gff_records(&mut reader).wrap_err_with(|| format!("When reading GFF3 file '{filename:?}'"))
}

/// Read GFF3 records given a string
pub fn read_gff3_feature_map_str(content: &str) -> Result<Vec<Feature>, Report> {
  let mut reader = GffReader::new(content.as_bytes(), GffType::GFF3);
  process_gff_records(&mut reader).wrap_err("When reading GFF3 file")
}

/// Read GFF3 records and convert them into the internal representation
fn process_gff_records<R: Read>(reader: &mut GffReader<R>) -> Result<Vec<Feature>, Report> {
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

  let features = build_hierarchy_of_features(&features)?;

  Ok(features)
}

/// Assemble list of features with parent-child relationships into a hierarchy.
/// The features are matched by `ID` attribute in the parent and `Parent` attribute in child.
fn build_hierarchy_of_features(features: &[Feature]) -> Result<Vec<Feature>, Report> {
  // Find top-level features (having no parents)
  let mut features_top_level = features
    .iter()
    .filter(|feature| feature.parent_ids.is_empty())
    .sorted_by_key(|Feature { start, end, name, .. }| (*start, *end, name.clone()))
    .cloned()
    .collect_vec();

  // Convert a flat list of features into a tree
  build_hierarchy_of_features_recursive(&mut features_top_level, features)?;

  Ok(features_top_level)
}

fn build_hierarchy_of_features_recursive(
  parent_features: &mut [Feature],
  all_features: &[Feature],
) -> Result<(), Report> {
  parent_features.iter_mut().try_for_each(|mut parent_feature| {
    parent_feature.children = all_features
      .iter()
      .filter(|child_feature| child_feature.parent_ids.contains(&parent_feature.id))
      .sorted_by_key(|Feature { start, end, name, .. }| (*start, *end, name.clone()))
      .cloned()
      .collect_vec();
    build_hierarchy_of_features_recursive(&mut parent_feature.children, all_features)
  })
}

pub fn flatten_feature_map(feature_map: &[Feature]) -> Vec<Feature> {
  let mut feature_map_flat = vec![];
  flatten_feature_map_recursive(feature_map, &mut feature_map_flat);
  feature_map_flat
}

fn flatten_feature_map_recursive(feature_map: &[Feature], feature_map_flat: &mut Vec<Feature>) {
  feature_map.iter().cloned().for_each(|feature| {
    feature_map_flat.push(feature.clone());
    flatten_feature_map_recursive(&feature.children, feature_map_flat);
  });
}

pub fn feature_map_to_string(feature_map: &[Feature]) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    format_feature_map(&mut buf, feature_map)?;
  }
  Ok(String::from_utf8(buf)?)
}

const PASS_ICON: &str = "│  ";
const FORK_ICON: &str = "├──";
const IMPASSE_ICON: &str = "└──";

pub fn format_feature_map<W: Write>(w: &mut W, feature_map: &[Feature]) -> Result<(), Report> {
  let feature_map_flat = flatten_feature_map(feature_map);

  let max_name_len = feature_map_flat
    .iter()
    .max_by_key(|feature| feature.name_and_type().len())
    .map(|feature| feature.name_and_type().len())
    .unwrap_or_default();
  let max_name_len = clamp(max_name_len, 0, 50);

  writeln!(
    w,
    "Genome {:n$}     │ s │ f │  start  │   end   │   nucs  │    codons   │",
    "",
    n = max_name_len + 1
  )?;

  writeln!(w, "{PASS_ICON}")?;

  format_feature_map_recursive(w, feature_map, max_name_len, 1)
}

fn format_feature_map_recursive<W: Write>(
  w: &mut W,
  features: &[Feature],
  max_name_len: usize,
  depth: usize,
) -> Result<(), Report> {
  features
    .iter()
    .enumerate()
    .try_for_each(|(height, feature)| -> Result<(), Report> {
      format_feature(w, feature, max_name_len, depth)?;
      format_feature_map_recursive(w, &feature.children, max_name_len, depth + 1)?;
      Ok(())
    })
}

fn format_feature<W: Write>(w: &mut W, feature: &Feature, max_name_len: usize, depth: usize) -> Result<(), Report> {
  let Feature {
    index,
    id,
    name,
    feature_type,
    start,
    end,
    strand,
    frame,
    parent_ids,
    children,
    exceptions,
    attributes,
    source_record,
  } = feature;

  let indent = "    ".repeat(depth);
  let name = truncate_with_ellipsis(feature.name_and_type(), max_name_len);
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(
    w,
    "{indent} {name:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
  )?;
  Ok(())
}
