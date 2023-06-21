use crate::features::feature::Feature;
use crate::features::feature_group::FeatureGroup;
use crate::features::feature_tree::flatten_feature_tree;
use crate::features::feature_type::style_for_feature_type;
use crate::features::sequence_region::SequenceRegion;
use crate::io::gene_map::format_codon_length;
use crate::utils::string::truncate_with_ellipsis;
use eyre::Report;
use itertools::Itertools;
use num_traits::clamp;
use owo_colors::OwoColorize;
use std::cmp::max;
use std::io::Write;

pub fn format_sequence_region_features<W: Write>(w: &mut W, seq_regions: &[SequenceRegion]) -> Result<(), Report> {
  let features_flat = seq_regions
    .iter()
    .flat_map(|reg| flatten_feature_tree(&reg.children))
    .collect_vec();

  let seq_region_names = seq_regions
    .iter()
    .map(|seq_region| seq_region.name_and_type().len() + INDENT)
    .max()
    .unwrap_or_default();

  let max_name_len = features_flat
    .iter()
    .map(|(depth, feature)| feature.name_and_type().len() + (depth + 2) * INDENT)
    .max()
    .unwrap_or_default();

  let max_name_len = max(seq_region_names, max_name_len);
  let max_name_len = clamp(max_name_len, 30, 50);

  let (circular, n_indent) = {
    let is_circular = features_flat.iter().any(|(_, feature)| feature.is_circular);
    let n_indent = max_name_len - 7;

    if is_circular {
      ("(circular)", n_indent - 10)
    } else {
      ("", n_indent)
    }
  };

  let indent = " ".repeat(n_indent);
  writeln!(
    w,
    "Genome {circular}{indent} │ s │ f │  start  │   end   │   nucs  │    codons   │"
  )?;

  for (i, seq_region) in seq_regions.iter().enumerate() {
    if (1..=seq_regions.len()).contains(&i) {
      writeln!(w)?;
    }
    format_sequence_region_feature(w, seq_region, max_name_len)?;
  }

  Ok(())
}

fn format_sequence_region_feature<W: Write>(
  w: &mut W,
  seq_region: &SequenceRegion,
  max_name_len: usize,
) -> Result<(), Report> {
  let SequenceRegion { range, .. } = seq_region;

  let indent_left = " ".repeat(INDENT);
  let name = truncate_with_ellipsis(seq_region.name_and_type(), max_name_len - INDENT);
  let indent_right = max_name_len - INDENT;
  let start = range.begin;
  let end = range.end;
  let nuc_len = range.len();
  let codon_len = format_codon_length(nuc_len);

  writeln!(
    w,
    "{indent_left}{name:indent_right$} │   │   │ {start:7} │ {end:7} │ {nuc_len:7} │ {codon_len:>11} │"
  )?;

  format_feature_groups(w, &seq_region.children, max_name_len)?;

  Ok(())
}

const PASS_ICON: &str = "│  ";
const FORK_ICON: &str = "├──";
const IMPASSE_ICON: &str = "└──";
const INDENT: usize = 2;

fn format_feature_groups<W: Write>(w: &mut W, feature_map: &[FeatureGroup], max_name_len: usize) -> Result<(), Report> {
  format_feature_groups_recursive(w, feature_map, max_name_len, 2)
}

fn format_feature_groups_recursive<W: Write>(
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
      format_feature_groups_recursive(w, &feature_group.children, max_name_len, depth + 1)?;
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
    feature_type,
    frame,
    features,
    parent_ids: _parent_ids,
    children: _children,
    exceptions,
    notes,
    ..
  } = feature;

  let max_name_len = max_name_len - INDENT * depth;

  match &features.as_slice() {
    &[feature] => {
      format_feature(w, feature, max_name_len, depth)?;
    }
    features => {
      let indent = "  ".repeat(depth);
      let name = truncate_with_ellipsis(feature.name_and_type(), max_name_len);
      let frame = frame;
      let exceptions = exceptions.iter().chain(notes.iter()).join(", ");

      let formatted = format!(
        "{indent}{name:max_name_len$} │   │ {frame:} │ {:>7} │ {:>7} │ {:>7} │ {:>11} │ {exceptions}",
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
    feature_type,
    range,
    landmark: _landmark,
    strand,
    frame,
    parent_ids: _parent_ids,
    seqid: _seqid,
    exceptions,
    notes,
    is_circular,
    ..
  } = feature;

  let indent = "  ".repeat(depth);
  let name = truncate_with_ellipsis(feature.name_and_type(), max_name_len);
  let start = range.begin;
  let end = range.end;
  let nuc_len = range.len();
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.iter().chain(notes.iter()).join(", ");
  let _is_circular = if *is_circular { "✔" } else { " " };

  let formatted = format!(
    "{indent}{name:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}"
  ).style(style_for_feature_type(feature_type)?).to_string();

  writeln!(w, "{formatted}")?;
  Ok(())
}
