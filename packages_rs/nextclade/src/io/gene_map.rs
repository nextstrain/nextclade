use crate::gene::cds::{Cds, CdsSegment, MatureProteinRegion};
use crate::gene::gene::Gene;
use crate::make_error;
use crate::utils::string::truncate_with_ellipsis;
use eyre::Report;
use itertools::{max, Itertools};
use log::warn;
use num_traits::clamp;
use owo_colors::OwoColorize;
use std::collections::BTreeMap;
use std::fmt::Display;
use std::io::Write;

pub type GeneMap = BTreeMap<String, Gene>;

fn get_requested_genes_not_in_genemap(gene_map: &GeneMap, genes: &[String]) -> String {
  genes
    .iter()
    .filter(|&gene_name| !gene_map.contains_key(gene_name))
    .join("`, `")
}

/// Filters gene map according to the list of requested genes.
///
/// Here are the possible combinations:
///
/// | --genemap  | --genes |                 behavior                   |
/// |------------|---------|--------------------------------------------|
/// |     +      |    +    | Take only specified genes                  |
/// |     +      |         | Take all genes                             |
/// |            |    +    | Error                                      |
/// |            |         | Skip translation and codon penalties       |
pub fn filter_gene_map(gene_map: Option<GeneMap>, genes: &Option<Vec<String>>) -> Result<GeneMap, Report> {
  match (gene_map, genes) {
    // Both gene map and list of genes are provided. Retain only requested genes.
    (Some(gene_map), Some(genes)) => {
      let gene_map: GeneMap = gene_map
        .into_iter()
        .filter(|(gene_name, ..)| genes.contains(gene_name))
        .collect();

      let requested_genes_not_in_genemap = get_requested_genes_not_in_genemap(&gene_map, genes);
      if !requested_genes_not_in_genemap.is_empty() {
        warn!(
          "The following genes were requested through `--genes` \
           but not found in the gene map: \
           `{requested_genes_not_in_genemap}`",
        );
      }
      Ok(gene_map)
    }

    // Only gene map is provided. Take all the genes.
    (Some(gene_map), None) => Ok(gene_map),

    // Gene list is provided, but no gene map. This is illegal.
    (None, Some(_)) => {
      make_error!(
        "List of genes via '--genes' can only be specified \
         when a gene map (genome annotation) is provided"
      )
    }

    // Nothing is provided. Create an empty gene map.
    // This disables codon-aware alignment, translation, AA mutations, frame shifts, and everything else that relies
    // on gene information.
    (None, None) => Ok(GeneMap::new()),
  }
}

const PASS_ICON: &str = "│  ";
const FORK_ICON: &str = "├──";
const IMPASSE_ICON: &str = "└──";

pub fn format_gene_map<W: Write>(w: &mut W, gene_map: &GeneMap) -> Result<(), Report> {
  let max_gene_name_len = gene_map
    .iter()
    .max_by_key(|(_, gene)| gene.gene_name.len())
    .map(|(_, gene)| gene.gene_name.len().saturating_sub(8))
    .unwrap_or_default();

  let max_cds_name_len = gene_map
    .iter()
    .flat_map(|(_, gene)| &gene.cdses)
    .max_by_key(|cds| cds.name.len().saturating_sub(4))
    .map(|cds| cds.name.len())
    .unwrap_or_default();

  let max_cds_segment_name_len = gene_map
    .iter()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.segments)
    .max_by_key(|cds_segment| cds_segment.name.len())
    .map(|cds| cds.name.len())
    .unwrap_or_default();

  let max_mpr_name_len = gene_map
    .iter()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.mprs)
    .max_by_key(|mpr| mpr.name.len())
    .map(|mpr| mpr.name.len())
    .unwrap_or_default();

  let max_name_len = clamp(
    max([
      max_gene_name_len,
      max_cds_name_len,
      max_cds_segment_name_len,
      max_mpr_name_len,
    ])
    .unwrap_or_default(),
    0,
    50,
  );

  writeln!(
    w,
    "Genome {:n$}     │ s │ f │  start  │   end   │   nucs  │    codons   │",
    "",
    n = max_name_len + 1
  )?;

  writeln!(w, "{PASS_ICON}")?;

  for (i, (gene_name, gene)) in gene_map
    .iter()
    .sorted_by_key(|(_, gene)| (gene.start, gene.end, &gene.gene_name))
    .enumerate()
  {
    write_gene(w, gene_map, max_name_len, i, gene)?;

    for (j, cds) in gene.cdses.iter().enumerate() {
      write_cds(w, gene_map, max_name_len, i, gene, j, cds)?;

      for (s, cds_segment) in cds.segments.iter().enumerate() {
        write_cds_segment(w, gene_map, max_name_len, i, gene, j, cds, s, cds_segment)?;
      }

      if !cds.mprs.is_empty() {
        if i != gene_map.len() - 1 {
          write!(w, "{PASS_ICON} ")?;
          if j != gene.cdses.len() - 1 {
            write!(w, "{PASS_ICON} ")?;
          }
        }
        writeln!(w)?;
      }

      for (k, mpr) in cds.mprs.iter().enumerate() {
        write_mpr(w, gene_map, max_name_len, i, gene, j, cds, k, mpr)?;
      }

      if i != gene_map.len() - 1 {
        write!(w, "{PASS_ICON} ")?;
        if j != gene.cdses.len() - 1 {
          write!(w, "{PASS_ICON} ")?;
        }
      }
      writeln!(w)?;
    }
  }

  writeln!(w, "\nLegend:")?;
  writeln!(w, "  {} - Gene", "█".bright_green())?;
  writeln!(w, "  {} - CDS", "█".bright_cyan())?;
  writeln!(w, "  {} - CDS segment", "█".bright_blue())?;
  writeln!(w, "  {} - Mature protein region of CDS", "█".dimmed())?;
  Ok(())
}

fn write_mpr<W: Write>(
  w: &mut W,
  gene_map: &GeneMap,
  max_name_len: usize,
  i: usize,
  gene: &Gene,
  j: usize,
  cds: &Cds,
  k: usize,
  mpr: &MatureProteinRegion,
) -> Result<(), Report> {
  let MatureProteinRegion {
    id,
    name,
    start,
    end,
    strand,
    frame,
    parent_ids,
    exceptions,
    attributes,
    source_record,
  } = mpr;
  let name = truncate_with_ellipsis(name, max_name_len);
  let gene_icon = if i == gene_map.len() - 1 { "   " } else { PASS_ICON };
  let cds_icon = if j == gene.cdses.len() - 1 { "   " } else { PASS_ICON };
  let mpr_icon = if k == cds.mprs.len() - 1 {
    IMPASSE_ICON
  } else {
    FORK_ICON
  };
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(w, "{gene_icon} {cds_icon} {mpr_icon} {:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}", name.dimmed())?;

  Ok(())
}

fn write_cds_segment<W: Write>(
  w: &mut W,
  gene_map: &GeneMap,
  max_name_len: usize,
  i: usize,
  gene: &Gene,
  j: usize,
  cds: &Cds,
  s: usize,
  cds_segment: &CdsSegment,
) -> Result<(), Report> {
  let CdsSegment {
    index,
    id,
    name,
    start,
    end,
    strand,
    frame,
    mprs,
    exceptions,
    attributes,
    source_record,
    compat_is_gene,
  } = cds_segment;

  let name = truncate_with_ellipsis(name, max_name_len);
  let gene_icon = if i == gene_map.len() - 1 { "   " } else { PASS_ICON };
  let cds_icon = if j == gene.cdses.len() - 1 { "   " } else { PASS_ICON };
  let seg_icon = if s == cds.segments.len() - 1 {
    IMPASSE_ICON
  } else {
    FORK_ICON
  };
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(
    w,
    "{gene_icon} {cds_icon} {seg_icon} {:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
    name.bright_blue()
  )?;

  Ok(())
}

fn write_cds<W: Write>(
  w: &mut W,
  gene_map: &GeneMap,
  max_name_len: usize,
  i: usize,
  gene: &Gene,
  j: usize,
  cds: &Cds,
) -> Result<(), Report> {
  let max_name_len = max_name_len + 4;
  let name = truncate_with_ellipsis(&cds.name, max_name_len);
  let gene_icon = if i == gene_map.len() - 1 { "   " } else { PASS_ICON };
  let cds_icon = if j == gene.cdses.len() - 1 {
    IMPASSE_ICON
  } else {
    FORK_ICON
  };

  writeln!(
    w,
    "{gene_icon} {cds_icon} {:max_name_len$} │   │   │         │         │         │             │",
    name.bright_cyan()
  )?;

  Ok(())
}

fn write_gene<W: Write>(
  w: &mut W,
  gene_map: &GeneMap,
  max_name_len: usize,
  i: usize,
  gene: &Gene,
) -> Result<(), Report> {
  let Gene {
    index,
    id,
    gene_name,
    start,
    end,
    frame,
    strand,
    cdses,
    exceptions,
    attributes,
    source_record,
    compat_is_cds,
  } = gene;

  let max_name_len = max_name_len + 8;
  let gene_name = truncate_with_ellipsis(gene_name, max_name_len);
  let gene_icon = if i == gene_map.len() - 1 {
    IMPASSE_ICON
  } else {
    FORK_ICON
  };
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(
      w,
      "{gene_icon} {:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
      gene_name.bright_green()
    )?;

  Ok(())
}

pub fn gene_map_to_string(gene_map: &GeneMap) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    format_gene_map(&mut buf, gene_map)?;
  }
  Ok(String::from_utf8(buf)?)
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
