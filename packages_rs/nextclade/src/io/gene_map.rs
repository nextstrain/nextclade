use crate::features::feature_tree::FeatureTree;
use crate::features::feature_type::style_for_feature_type;
use crate::features::gene_map::convert_feature_tree_to_gene_map;
use crate::gene::cds::{Cds, CdsSegment, Protein, ProteinSegment};
use crate::gene::gene::Gene;
use crate::make_error;
use crate::utils::string::truncate_with_ellipsis;
use eyre::Report;
use itertools::{max, Itertools};
use log::warn;
use num_traits::clamp;
use owo_colors::OwoColorize;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt::Display;
use std::io::Write;
use std::path::Path;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[must_use]
pub struct GeneMap {
  genes: BTreeMap<String, Gene>,
}

impl GeneMap {
  pub fn new() -> Self {
    Self::from_genes(BTreeMap::<String, Gene>::new())
  }

  pub fn from_genes(genes: BTreeMap<String, Gene>) -> Self {
    Self { genes }
  }

  pub fn from_feature_tree(feature_tree: &FeatureTree) -> Result<Self, Report> {
    convert_feature_tree_to_gene_map(feature_tree)
  }

  pub fn from_gff3_file<P: AsRef<Path>>(filename: P) -> Result<Self, Report> {
    Self::from_feature_tree(&FeatureTree::from_gff3_file(filename)?)
  }

  pub fn from_gff3_str(content: &str) -> Result<Self, Report> {
    Self::from_feature_tree(&FeatureTree::from_gff3_str(content)?)
  }

  #[must_use]
  pub fn is_empty(&self) -> bool {
    self.genes.is_empty()
  }

  #[must_use]
  pub fn len(&self) -> usize {
    self.genes.len()
  }

  #[must_use]
  pub fn contains(&self, gene_name: &str) -> bool {
    self.genes.contains_key(gene_name)
  }

  #[must_use]
  pub fn get(&self, gene_name: &str) -> Option<&Gene> {
    self.genes.get(gene_name)
  }

  pub fn iter(&self) -> std::collections::btree_map::Iter<String, Gene> {
    self.genes.iter()
  }

  pub fn into_iter(self) -> std::collections::btree_map::IntoIter<String, Gene> {
    self.genes.into_iter()
  }
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
      let gene_map: BTreeMap<String, Gene> = gene_map
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
      Ok(GeneMap::from_genes(gene_map))
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

fn get_requested_genes_not_in_genemap(gene_map: &BTreeMap<String, Gene>, genes: &[String]) -> String {
  genes
    .iter()
    .filter(|&gene_name| !gene_map.contains_key(gene_name))
    .join("`, `")
}

const PASS_ICON: &str = "│  ";
const FORK_ICON: &str = "├──";
const IMPASSE_ICON: &str = "└──";

pub fn gene_map_to_string(gene_map: &GeneMap) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    format_gene_map(&mut buf, gene_map)?;
  }
  Ok(String::from_utf8(buf)?)
}

pub fn format_gene_map<W: Write>(w: &mut W, gene_map: &GeneMap) -> Result<(), Report> {
  let max_gene_name_len = gene_map
    .iter()
    .map(|(_, gene)| gene.name_and_type().len().saturating_sub(8))
    .max()
    .unwrap_or_default();

  let max_cds_name_len = gene_map
    .iter()
    .flat_map(|(_, gene)| &gene.cdses)
    .map(|cds| cds.name_and_type().len())
    .max()
    .unwrap_or_default();

  let max_cds_segment_name_len = gene_map
    .iter()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.segments)
    .map(|seg| seg.name_and_type().len())
    .max()
    .unwrap_or_default();

  let max_protein_name_len = gene_map
    .iter()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.proteins)
    .map(|protein| protein.name_and_type().len())
    .max()
    .unwrap_or_default();

  let max_protein_segment_name_len = gene_map
    .iter()
    .flat_map(|(_, gene)| &gene.cdses)
    .flat_map(|cds| &cds.proteins)
    .flat_map(|protein| &protein.segments)
    .map(|seg| seg.name_and_type().len())
    .max()
    .unwrap_or_default();

  let max_name_len = clamp(
    max([
      max_gene_name_len,
      max_cds_name_len,
      max_cds_segment_name_len,
      max_protein_name_len,
      max_protein_segment_name_len,
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

  for (gene_name, gene) in gene_map
    .iter()
    .sorted_by_key(|(_, gene)| (gene.start, gene.end, &gene.gene_name))
  {
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
  let Gene {
    index,
    id,
    gene_name: name,
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
  let name = truncate_with_ellipsis(gene.name_and_type(), max_name_len);
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(
      w,
      "  {:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
      name.style(style_for_feature_type("gene")?)
    )?;

  Ok(())
}

fn write_cds<W: Write>(w: &mut W, max_name_len: usize, cds: &Cds) -> Result<(), Report> {
  let max_name_len = max_name_len + 4;
  let name = truncate_with_ellipsis(cds.name_and_type(), max_name_len);

  writeln!(
    w,
    "    {:max_name_len$} │   │   │         │         │         │             │",
    name.style(style_for_feature_type("cds")?)
  )?;

  Ok(())
}

fn write_cds_segment<W: Write>(w: &mut W, max_name_len: usize, cds_segment: &CdsSegment) -> Result<(), Report> {
  let CdsSegment {
    index,
    id,
    name,
    start,
    end,
    strand,
    frame,
    exceptions,
    attributes,
    source_record,
    compat_is_gene,
  } = cds_segment;

  let name = truncate_with_ellipsis(cds_segment.name_and_type(), max_name_len);
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(
    w,
    "      {:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
    name.style(style_for_feature_type("cds segment")?)
  )?;

  Ok(())
}

fn write_protein<W: Write>(w: &mut W, max_name_len: usize, protein: &Protein) -> Result<(), Report> {
  let name = truncate_with_ellipsis(protein.name_and_type(), max_name_len);
  writeln!(
    w,
    "      {:max_name_len$} │   │   │         │         │         │             │",
    name.style(style_for_feature_type("protein")?)
  )?;

  Ok(())
}

fn write_protein_segment<W: Write>(
  w: &mut W,
  max_name_len: usize,
  protein_segment: &ProteinSegment,
) -> Result<(), Report> {
  let ProteinSegment {
    id,
    name,
    start,
    end,
    strand,
    frame,
    exceptions,
    attributes,
    source_record,
    compat_is_cds,
    compat_is_gene,
  } = protein_segment;

  let name = truncate_with_ellipsis(protein_segment.name_and_type(), max_name_len);
  let nuc_len = end - start;
  let codon_len = format_codon_length(nuc_len);
  let exceptions = exceptions.join(", ");
  writeln!(
    w,
    "        {:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
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
