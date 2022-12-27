use crate::gene::gene::GeneStrand;
use crate::io::gene_map::format_codon_length;
use crate::io::gff3::GffCommonInfo;
use crate::make_error;
use crate::utils::error::to_eyre_error;
use crate::utils::string::truncate_with_ellipsis;
use bio::io::gff::{GffType, Reader as GffReader, Record as GffRecord};
use color_eyre::Section;
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use lazy_static::lazy_static;
use multimap::MultiMap;
use num_traits::clamp;
use owo_colors::{DynColors, OwoColorize, ParseColorError, Style};
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::HashMap;
use std::fmt::Debug;
use std::hash::Hash;
use std::io::{Read, Write};
use std::path::Path;
use std::str::FromStr;

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
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
  pub exceptions: Vec<String>,
  pub notes: Vec<String>,
  pub is_circular: bool,
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
      notes,
      is_circular,
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
      exceptions,
      notes,
      is_circular,
      attributes,
      source_record: Some(gff_record_str),
    })
  }

  #[must_use]
  #[inline]
  pub fn name_and_type(&self) -> String {
    format!("{} '{}'", shorten_feature_type(&self.feature_type), self.name)
  }
}

#[derive(Clone, Debug, Deserialize, Serialize, PartialEq, Eq)]
#[serde(rename_all = "camelCase")]
pub struct FeatureGroup {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub feature_type: String,
  pub strand: GeneStrand,
  pub frame: i32,
  pub features: Vec<Feature>,
  pub parent_ids: Vec<String>,
  pub children: Vec<FeatureGroup>,
  pub exceptions: Vec<String>,
  pub notes: Vec<String>,
  pub is_circular: bool,
}

impl Ord for FeatureGroup {
  fn cmp(&self, other: &Self) -> Ordering {
    let s = (self.start(), -(self.end() as isize), &self.name_and_type());
    let o = (other.start(), -(other.end() as isize), &other.name_and_type());
    s.cmp(&o)
  }
}

impl PartialOrd for FeatureGroup {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

impl FeatureGroup {
  fn new(id: &str, features: &[Feature]) -> Self {
    let index = features
      .iter()
      .map(|feature| feature.index)
      .sorted()
      .next()
      .unwrap_or_default();

    let id = features.iter().map(|feature| &feature.id).unique().join("+");
    let name = features.iter().map(|feature| &feature.name).unique().join("+");
    let feature_type = features.iter().map(|feature| &feature.feature_type).unique().join("+");

    let strand = {
      let strands = features.iter().map(|feature| &feature.strand).unique().collect_vec();
      match strands.as_slice() {
        &[strand] => strand.clone(),
        _ => GeneStrand::Unknown,
      }
    };

    let frame = {
      let frames = features.iter().map(|feature| &feature.frame).unique().collect_vec();
      match frames.as_slice() {
        &[frame] => *frame,
        _ => 0,
      }
    };

    let parent_ids = features
      .iter()
      .flat_map(|feature| &feature.parent_ids)
      .unique()
      .cloned()
      .collect_vec();

    let exceptions = features
      .iter()
      .flat_map(|feature| &feature.exceptions)
      .unique()
      .cloned()
      .collect_vec();

    let notes = features
      .iter()
      .flat_map(|feature| &feature.notes)
      .unique()
      .cloned()
      .collect_vec();

    let is_circular = features.iter().any(|feature| feature.is_circular);

    Self {
      index,
      id,
      name,
      feature_type,
      strand,
      frame,
      features: features.to_owned(),
      parent_ids,
      children: vec![],
      exceptions,
      notes,
      is_circular,
    }
  }

  #[must_use]
  #[inline]
  pub fn name_and_type(&self) -> String {
    format!("{} '{}'", shorten_feature_type(&self.feature_type), self.name)
  }

  #[must_use]
  #[inline]
  pub fn start(&self) -> usize {
    self
      .features
      .iter()
      .map(|feature| feature.start)
      .min()
      .unwrap_or_default()
  }

  #[must_use]
  #[inline]
  pub fn end(&self) -> usize {
    self
      .features
      .iter()
      .map(|feature| feature.end)
      .min()
      .unwrap_or_default()
  }
}

/// Read GFF3 records given a file
pub fn read_gff3_feature_map<P: AsRef<Path>>(filename: P) -> Result<Vec<FeatureGroup>, Report> {
  let filename = filename.as_ref();
  let mut reader = GffReader::from_file(filename, GffType::GFF3).map_err(|report| eyre!(report))?;
  process_gff_records(&mut reader).wrap_err_with(|| format!("When reading GFF3 file '{filename:?}'"))
}

/// Read GFF3 records given a string
pub fn read_gff3_feature_map_str(content: &str) -> Result<Vec<FeatureGroup>, Report> {
  let mut reader = GffReader::new(content.as_bytes(), GffType::GFF3);
  process_gff_records(&mut reader).wrap_err("When reading GFF3 file")
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

pub fn flatten_feature_map(feature_map: &[FeatureGroup]) -> Vec<(usize, Feature)> {
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

pub fn feature_map_to_string(feature_map: &[FeatureGroup]) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    format_feature_map(&mut buf, feature_map)?;
  }
  Ok(String::from_utf8(buf)?)
}

const PASS_ICON: &str = "│  ";
const FORK_ICON: &str = "├──";
const IMPASSE_ICON: &str = "└──";
const INDENT: usize = 2;

pub fn format_feature_map<W: Write>(w: &mut W, feature_map: &[FeatureGroup]) -> Result<(), Report> {
  let feature_map_flat = flatten_feature_map(feature_map);

  let max_name_len = feature_map_flat
    .iter()
    .max_by_key(|(depth, feature)| feature.name_and_type().len() + (depth + 1) * INDENT)
    .map(|(depth, feature)| feature.name_and_type().len() + (depth + 1) * INDENT)
    .unwrap_or_default();
  let max_name_len = clamp(max_name_len, 30, 50);

  let is_circular = feature_map_flat.iter().any(|(_, feature)| feature.is_circular);
  let n_indent = max_name_len - 7;

  let (circular, n_indent) = if is_circular {
    ("(circular)", n_indent - 10)
  } else {
    ("", n_indent)
  };

  let indent = " ".repeat(n_indent);
  writeln!(
    w,
    "Genome {circular} {indent}│ s │ f │  start  │   end   │   nucs  │    codons   │"
  )?;

  format_feature_map_recursive(w, feature_map, max_name_len, 1)
}

fn format_feature_map_recursive<W: Write>(
  w: &mut W,
  feature_groups: &[FeatureGroup],
  max_name_len: usize,
  depth: usize,
) -> Result<(), Report> {
  feature_groups
    .iter()
    .enumerate()
    .try_for_each(|(height, feature_group)| -> Result<(), Report> {
      format_feature_group(w, feature_group, max_name_len, depth)?;
      format_feature_map_recursive(w, &feature_group.children, max_name_len, depth + 1)?;
      Ok(())
    })
}

fn format_feature_group<W: Write>(
  w: &mut W,
  feature: &FeatureGroup,
  max_name_len: usize,
  depth: usize,
) -> Result<(), Report> {
  let FeatureGroup {
    index,
    id,
    name,
    feature_type,
    strand,
    frame,
    features,
    parent_ids,
    children,
    exceptions,
    notes,
    is_circular,
  } = feature;

  let max_name_len = max_name_len - INDENT * depth;

  match &features.as_slice() {
    &[feature] => {
      format_feature(w, feature, max_name_len, depth)?;
    }
    features => {
      let indent = "  ".repeat(depth);
      let name = truncate_with_ellipsis(feature.name_and_type(), max_name_len);
      let strand = strand;
      let frame = frame;
      let exceptions = exceptions.iter().chain(notes.iter()).join(", ");

      let formatted = format!(
        "{indent}{name:max_name_len$} │ {strand:} │ {frame:} │ {:>7} │ {:>7} │ {:>7} │ {:>11} │ {exceptions}",
        "", "", "", ""
      )
      .style(style_for_feature_type(feature_type)?)
      .to_string();
      writeln!(w, "{formatted}")?;
      for feature in features.iter() {
        format_feature(w, feature, max_name_len - INDENT, depth + 1)?;
      }
    }
  }

  Ok(())
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
    exceptions,
    notes,
    is_circular,
    attributes,
    source_record,
  } = feature;

  let indent = "  ".repeat(depth);
  let name = truncate_with_ellipsis(feature.name_and_type(), max_name_len);
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.iter().chain(notes.iter()).join(", ");
  let is_circular = if *is_circular { "✔" } else { " " };

  let formatted = format!(
    "{indent}{name:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}"
  ).style(style_for_feature_type(feature_type)?).to_string();

  writeln!(w, "{formatted}")?;
  Ok(())
}

fn style_for_feature_type(feature_type: &str) -> Result<Style, Report> {
  match feature_type.to_lowercase().as_str() {
    "cds" => color_from_hex("#846ab8"),
    "exon" => color_from_hex("#60ab60"),
    "gene" => color_from_hex("#4e7ede"),
    "mpr" | "mature_protein_region_of_cds" => color_from_hex("#9c8668"),
    "mrna" => color_from_hex("#3f919e"),
    "transcript" => color_from_hex("#518a6a"),
    _ => Ok(Style::default().dimmed()),
  }
}

fn color_from_hex(hex_color: &str) -> Result<Style, Report> {
  let color = DynColors::from_str(hex_color).map_err(|err: ParseColorError| eyre!("{err:#?}"))?;
  Ok(Style::default().color(color))
}

fn shorten_feature_type(feature_type: &str) -> &str {
  lazy_static! {
    pub static ref FEATURE_TYPES_ABBREV: HashMap<&'static str, &'static str> = [
      ("mature_protein_region_of_CDS", "mature protein"),
      ("five_prime_UTR", "5' UTR"),
      ("three_prime_UTR", "3' UTR"),
    ]
    .iter()
    .copied()
    .collect();
  }
  (*FEATURE_TYPES_ABBREV).get(feature_type).unwrap_or(&feature_type)
}
