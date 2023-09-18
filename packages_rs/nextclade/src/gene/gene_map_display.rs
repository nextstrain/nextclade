use crate::coord::position::PositionLike;
use crate::features::feature_type::style_for_feature_type;
use crate::gene::cds::Cds;
use crate::gene::cds_segment::{CdsSegment, WrappingPart};
use crate::gene::gene::Gene;
use crate::gene::gene_map::GeneMap;
use crate::gene::protein::{Protein, ProteinSegment};
use crate::utils::string::truncate_with_ellipsis;
use eyre::Report;
use itertools::{max as iter_max, Itertools};
use num_traits::clamp;
use owo_colors::OwoColorize;
use std::cmp::{max, min};
use std::io::Write;

const INDENT: &str = " ";
const INDENT_WIDTH: usize = 2;

pub fn gene_map_to_table_string(gene_map: &GeneMap) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  format_gene_map(&mut buf, gene_map)?;
  Ok(String::from_utf8(buf)?)
}

pub fn format_gene_map<W: Write>(w: &mut W, gene_map: &GeneMap) -> Result<(), Report> {
  let max_gene_name_len = gene_map
    .iter_genes()
    .map(|(_, gene)| gene.name_and_type().len() + INDENT_WIDTH)
    .max()
    .unwrap_or_default();

  let max_cds_name_len = gene_map
    .iter_genes()
    .flat_map(|(_, gene)| &gene.cdses)
    .map(|cds| cds.name_and_type().len() + INDENT_WIDTH * 2)
    .max()
    .unwrap_or_default();

  let max_cds_segment_name_len = gene_map
    .iter_genes()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.segments)
    .map(|seg| seg.name_and_type().len() + INDENT_WIDTH * 3)
    .max()
    .unwrap_or_default();

  let max_protein_name_len = gene_map
    .iter_genes()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.proteins)
    .map(|protein| protein.name_and_type().len() + INDENT_WIDTH * 3)
    .max()
    .unwrap_or_default();

  let max_protein_segment_name_len = gene_map
    .iter_genes()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.proteins)
    .flat_map(|protein| &protein.segments)
    .map(|seg| seg.name_and_type().len() + INDENT_WIDTH * 4)
    .max()
    .unwrap_or_default();

  let max_name_len = clamp(
    iter_max([
      max_gene_name_len,
      max_cds_name_len,
      max_cds_segment_name_len,
      max_protein_name_len,
      max_protein_segment_name_len,
    ])
    .unwrap_or_default(),
    0,
    100,
  );

  writeln!(
    w,
    "{:max_name_len$} │ s │ f | p |  c  │  start  │   end   │   nucs  │    codons   │",
    "Genome",
  )?;

  for (_, gene) in gene_map.iter_genes().sorted_by_key(|(_, gene)| {
    let mut begin = isize::MAX;
    let mut end = isize::MIN;

    for cds in &gene.cdses {
      begin = min(begin, cds.segments[0].range.begin.as_isize());
      end = max(end, cds.segments[0].range.end.as_isize());
    }
    (begin, end, &gene.name)
  }) {
    write_gene(w, max_name_len, gene)?;
    for cds in &gene.cdses {
      write_cds(w, max_name_len, cds)?;
      for cds_segment in &cds.segments {
        write_cds_segment(w, max_name_len, cds_segment)?;
      }
      for protein in &cds.proteins {
        write_protein(w, max_name_len, protein)?;
        for protein_segment in &protein.segments {
          write_protein_segment(w, max_name_len, protein_segment)?;
        }
      }
    }
  }
  Ok(())
}

fn write_gene<W: Write>(w: &mut W, max_name_len: usize, gene: &Gene) -> Result<(), Report> {
  let Gene { exceptions, .. } = gene;

  let indent_width = INDENT_WIDTH;
  let indent = INDENT.repeat(indent_width);
  let max_name_len = max_name_len.saturating_sub(indent_width);
  let name = truncate_with_ellipsis(gene.name_and_type(), max_name_len);
  let exceptions = exceptions.join(", ");
  writeln!(
    w,
    "{indent}{:max_name_len$} │   │   │   │     │         │         │         │             │ {exceptions}",
    name.style(style_for_feature_type("gene")?)
  )?;

  Ok(())
}

fn write_cds<W: Write>(w: &mut W, max_name_len: usize, cds: &Cds) -> Result<(), Report> {
  let indent_width = INDENT_WIDTH * 2;
  let indent = INDENT.repeat(indent_width);
  let max_name_len = max_name_len.saturating_sub(indent_width);
  let name = truncate_with_ellipsis(cds.name_and_type(), max_name_len);
  let nuc_len = cds.len();
  let codon_len = format_codon_length(nuc_len);
  let exceptions = cds.exceptions.join(", ");
  writeln!(
    w,
    "{indent}{:max_name_len$} │   │   │   │     │         │         │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
    name.style(style_for_feature_type("cds")?)
  )?;

  Ok(())
}

fn write_cds_segment<W: Write>(w: &mut W, max_name_len: usize, cds_segment: &CdsSegment) -> Result<(), Report> {
  let CdsSegment {
    range,
    strand,
    frame,
    phase,
    exceptions,
    ..
  } = cds_segment;

  let indent_width = INDENT_WIDTH * 3;
  let indent = INDENT.repeat(indent_width);
  let max_name_len = max_name_len.saturating_sub(indent_width);
  let name = truncate_with_ellipsis(cds_segment.name_and_type(), max_name_len);
  let start = range.begin.green();
  let end = range.end.red();
  let nuc_len = cds_segment.len();
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  let wrap = match cds_segment.wrapping_part {
    WrappingPart::NonWrapping => "   ".to_owned(),
    WrappingPart::WrappingStart => "\u{21BB} 0".to_owned(),
    WrappingPart::WrappingCentral(i) => format!("\u{21BB} {i}"),
    WrappingPart::WrappingEnd(i) => format!("\u{21BB} {i}"),
  };
  writeln!(
    w,
    "{indent}{:max_name_len$} │ {strand:} │ {frame:} | {phase:} | {wrap:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
    name.style(style_for_feature_type("cds segment")?)
  )?;

  Ok(())
}

fn write_protein<W: Write>(w: &mut W, max_name_len: usize, protein: &Protein) -> Result<(), Report> {
  let indent_width = INDENT_WIDTH * 3;
  let indent = INDENT.repeat(indent_width);
  let max_name_len = max_name_len.saturating_sub(indent_width);
  let name = truncate_with_ellipsis(protein.name_and_type(), max_name_len);
  writeln!(
    w,
    "{indent}{:max_name_len$} │   │   │   │     │         │         │         │             │",
    name.style(style_for_feature_type("protein")?)
  )?;

  Ok(())
}

fn write_protein_segment<W: Write>(
  w: &mut W,
  max_name_len: usize,
  protein_segment: &ProteinSegment,
) -> Result<(), Report> {
  let ProteinSegment { range, exceptions, .. } = protein_segment;

  let indent_width = INDENT_WIDTH * 4;
  let indent = INDENT.repeat(indent_width);
  let max_name_len = max_name_len.saturating_sub(indent_width);
  let name = truncate_with_ellipsis(protein_segment.name_and_type(), max_name_len);
  let start = range.begin;
  let end = range.end;
  let nuc_len = range.len();
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(
    w,
    "{indent}{:max_name_len$} │   │   │   │     │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
    name.style(style_for_feature_type("protein segment")?)
  )?;

  Ok(())
}

pub fn format_codon_length(nuc_len: usize) -> String {
  let codons = nuc_len / 3;
  let codons_decimal = match nuc_len % 3 {
    0 => "     ",
    1 => " +1/3",
    2 => " +2/3",
    _ => unreachable!(),
  };
  format!("{codons}{codons_decimal}")
}
