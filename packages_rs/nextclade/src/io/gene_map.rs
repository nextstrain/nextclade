use crate::gene::cds::Cds;
use crate::gene::gene::Gene;
use crate::make_error;
use eyre::Report;
use itertools::Itertools;
use log::warn;
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
  writeln!(w, "Genome")?;

  for (i, (gene_name, gene)) in gene_map
    .iter()
    .sorted_by_key(|(_, gene)| (gene.start, gene.end, &gene.gene_name))
    .enumerate()
  {
    let Gene {
      gene_name,
      start,
      end,
      frame,
      strand,
      cdses,
      attributes,
    } = gene;

    gene_name.clone().truncate(13);
    let gene_icon = if i == gene_map.len() - 1 {
      IMPASSE_ICON
    } else {
      FORK_ICON
    };
    writeln!(w, "{gene_icon} Gene {gene_name:13} │ {strand:} │ {start:>7} │ {end:>7} │")?;

    for (j, cds) in cdses
      .iter()
      .sorted_by_key(|cds| (cds.start, cds.end, &cds.name))
      .enumerate()
    {
      let Cds {
        name,
        start,
        end,
        frame,
        strand,
        attributes,
      } = cds;

      name.clone().truncate(10);
      let gene_icon = if i == gene_map.len() - 1 { "   " } else { PASS_ICON };
      let cds_icon = if j == cdses.len() - 1 { IMPASSE_ICON } else { FORK_ICON };
      writeln!(w, "{gene_icon} {cds_icon} CDS {name:10} │ {strand:} │ {start:>7} │ {end:>7} │")?;
    }
  }
  Ok(())
}

pub fn gene_map_to_string(gene_map: &GeneMap) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    format_gene_map(&mut buf, gene_map)?;
  }
  Ok(String::from_utf8(buf)?)
}
