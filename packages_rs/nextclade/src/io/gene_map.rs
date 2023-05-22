use crate::features::feature_tree::FeatureTree;
use crate::features::gene_map::convert_feature_tree_to_gene_map;
use crate::gene::cds::Cds;
use crate::io::file::open_file_or_stdin;
use crate::io::yaml::yaml_parse;
use crate::utils::error::report_to_string;
use crate::{make_error, make_internal_report};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use log::warn;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt::Display;
use std::path::Path;

#[derive(Clone, Debug, Deserialize, Serialize)]
#[must_use]
pub struct GeneMap {
  cdses: BTreeMap<String, Cds>,
}

impl GeneMap {
  pub fn new() -> Self {
    Self::from_cdses(BTreeMap::<String, Cds>::new())
  }

  pub fn from_cdses(cdses: BTreeMap<String, Cds>) -> Self {
    Self { cdses }
  }

  pub fn from_feature_tree(feature_tree: &FeatureTree) -> Result<Self, Report> {
    convert_feature_tree_to_gene_map(feature_tree)
  }

  pub fn from_gff3_file(filename: impl AsRef<Path>) -> Result<Self, Report> {
    let filename = filename.as_ref();
    let mut file = open_file_or_stdin(&Some(filename))?;
    let mut buf = vec![];
    {
      file.read_to_end(&mut buf)?;
    }
    Self::from_gff3_str(&String::from_utf8(buf)?).wrap_err_with(|| eyre!("When reading file: {filename:?}"))
  }

  // TODO: rename this function, because it handles more than GFF3
  pub fn from_gff3_str(content: impl AsRef<str>) -> Result<Self, Report> {
    let gene_map_json: Result<GeneMap, Report> = yaml_parse(content.as_ref());
    let gene_map_gff: Result<GeneMap, Report> = Self::from_gff3_str_impl(content.as_ref());

    Ok(match (gene_map_json, gene_map_gff) {
      (Err(json_err), Err(gff_err)) => {
        return make_error!("Attempted to parse the genome annotation as JSON and as GFF, but both attempts failed:\nJSON error: {}\n\nGFF3 error: {}\n",
          report_to_string(&json_err),
          report_to_string(&gff_err),
        )
      },
      (Ok(gene_map), _) => gene_map,
      (_, Ok(gene_map)) => gene_map,
    })
  }

  // TODO: rename this function after renaming the function above
  fn from_gff3_str_impl(content: &str) -> Result<Self, Report> {
    Self::from_feature_tree(&FeatureTree::from_gff3_str(content)?)
  }

  #[must_use]
  pub fn is_empty(&self) -> bool {
    self.cdses.is_empty()
  }

  #[must_use]
  pub fn len(&self) -> usize {
    self.cdses.len()
  }

  #[must_use]
  pub fn contains(&self, gene_name: &str) -> bool {
    self.cdses.contains_key(gene_name)
  }

  pub fn get(&self, gene_name: &str) -> Result<&Cds, Report> {
    self
      .cdses
      .get(gene_name)
      .ok_or_else(|| make_internal_report!("Gene is expected to be present, but not found: '{gene_name}'"))
  }

  pub fn iter_cdses(&self) -> impl Iterator<Item = (&String, &Cds)> + '_ {
    self.cdses.iter()
  }

  pub fn iter_cdses_mut(&mut self) -> impl Iterator<Item = (&String, &mut Cds)> + '_ {
    self.cdses.iter_mut()
  }

  pub fn into_iter_cdses(self) -> impl Iterator<Item = (String, Cds)> {
    self.cdses.into_iter()
  }

  pub fn cdses(&self) -> impl Iterator<Item = &Cds> + '_ {
    self.cdses.values()
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
      let cdses: BTreeMap<String, Cds> = gene_map
        .into_iter_cdses()
        .filter(|(name, ..)| genes.contains(name))
        .collect();

      let requested_genes_not_in_genemap = get_requested_genes_not_in_genemap(&cdses, genes);
      if !requested_genes_not_in_genemap.is_empty() {
        warn!(
          "The following genes were requested through `--genes` \
           but not found in the gene map: \
           `{requested_genes_not_in_genemap}`",
        );
      }
      Ok(GeneMap::from_cdses(cdses))
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

fn get_requested_genes_not_in_genemap(gene_map: &BTreeMap<String, Cds>, genes: &[String]) -> String {
  genes
    .iter()
    .filter(|&gene_name| !gene_map.contains_key(gene_name))
    .join("`, `")
}

// const INDENT: &str = " ";
// const INDENT_WIDTH: usize = 2;
//
// pub fn gene_map_to_string(gene_map: &GeneMap) -> Result<String, Report> {
//   let mut buf = Vec::<u8>::new();
//   {
//     format_gene_map(&mut buf, gene_map)?;
//   }
//   Ok(String::from_utf8(buf)?)
// }
//
// pub fn format_gene_map<W: Write>(w: &mut W, gene_map: &GeneMap) -> Result<(), Report> {
//   let max_gene_name_len = gene_map
//     .iter_genes()
//     .map(|(_, gene)| gene.name_and_type().len() + INDENT_WIDTH)
//     .max()
//     .unwrap_or_default();
//
//   let max_cds_name_len = gene_map
//     .iter_genes()
//     .flat_map(|(_, gene)| &gene.cdses)
//     .map(|cds| cds.name_and_type().len() + INDENT_WIDTH * 2)
//     .max()
//     .unwrap_or_default();
//
//   let max_cds_segment_name_len = gene_map
//     .iter_genes()
//     .flat_map(|(_, gene)| &gene.cdses)
//     .flat_map(|cds| &cds.segments)
//     .map(|seg| seg.name_and_type().len() + INDENT_WIDTH * 3)
//     .max()
//     .unwrap_or_default();
//
//   let max_protein_name_len = gene_map
//     .iter_genes()
//     .flat_map(|(_, gene)| &gene.cdses)
//     .flat_map(|cds| &cds.proteins)
//     .map(|protein| protein.name_and_type().len() + INDENT_WIDTH * 3)
//     .max()
//     .unwrap_or_default();
//
//   let max_protein_segment_name_len = gene_map
//     .iter_genes()
//     .flat_map(|(_, gene)| &gene.cdses)
//     .flat_map(|cds| &cds.proteins)
//     .flat_map(|protein| &protein.segments)
//     .map(|seg| seg.name_and_type().len() + INDENT_WIDTH * 4)
//     .max()
//     .unwrap_or_default();
//
//   let max_name_len = clamp(
//     max([
//       max_gene_name_len,
//       max_cds_name_len,
//       max_cds_segment_name_len,
//       max_protein_name_len,
//       max_protein_segment_name_len,
//     ])
//     .unwrap_or_default(),
//     0,
//     100,
//   );
//
//   writeln!(
//     w,
//     "{:max_name_len$} │ s │ f │  start  │   end   │   nucs  │    codons   │",
//     "Genome",
//   )?;
//
//   for (gene_name, gene) in gene_map
//     .iter_genes()
//     .sorted_by_key(|(_, gene)| (gene.start, gene.end, &gene.name))
//   {
//     write_gene(w, max_name_len, gene)?;
//     for cds in &gene.cdses {
//       write_cds(w, max_name_len, cds)?;
//       for cds_segment in &cds.segments {
//         write_cds_segment(w, max_name_len, cds_segment)?;
//       }
//       for protein in &cds.proteins {
//         write_protein(w, max_name_len, protein)?;
//         for protein_segment in &protein.segments {
//           write_protein_segment(w, max_name_len, protein_segment)?;
//         }
//       }
//     }
//   }
//   Ok(())
// }
//
// fn write_gene<W: Write>(w: &mut W, max_name_len: usize, gene: &Gene) -> Result<(), Report> {
//   let Gene {
//     index,
//     id,
//     name,
//     start,
//     end,
//     frame,
//     strand,
//     cdses,
//     exceptions,
//     attributes,
//     source_record,
//     compat_is_cds,
//   } = gene;
//
//   let indent_width = INDENT_WIDTH;
//   let indent = INDENT.repeat(indent_width);
//   let max_name_len = max_name_len.saturating_sub(indent_width);
//   let name = truncate_with_ellipsis(gene.name_and_type(), max_name_len);
//   let nuc_len = gene.len();
//   let codon_len = format_codon_length(nuc_len);
//   let exceptions = exceptions.join(", ");
//   writeln!(
//     w,
//     "{indent}{:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
//     name.style(style_for_feature_type("gene")?)
//   )?;
//
//   Ok(())
// }
//
// fn write_cds<W: Write>(w: &mut W, max_name_len: usize, cds: &Cds) -> Result<(), Report> {
//   let indent_width = INDENT_WIDTH * 2;
//   let indent = INDENT.repeat(indent_width);
//   let max_name_len = max_name_len.saturating_sub(indent_width);
//   let name = truncate_with_ellipsis(cds.name_and_type(), max_name_len);
//   writeln!(
//     w,
//     "{indent}{:max_name_len$} │   │   │         │         │         │             │",
//     name.style(style_for_feature_type("cds")?)
//   )?;
//
//   Ok(())
// }
//
// fn write_cds_segment<W: Write>(w: &mut W, max_name_len: usize, cds_segment: &CdsSegment) -> Result<(), Report> {
//   let CdsSegment {
//     index,
//     id,
//     name,
//     start,
//     end,
//     landmark,
//     strand,
//     frame,
//     exceptions,
//     attributes,
//     source_record,
//     compat_is_gene,
//   } = cds_segment;
//
//   let indent_width = INDENT_WIDTH * 3;
//   let indent = INDENT.repeat(indent_width);
//   let max_name_len = max_name_len.saturating_sub(indent_width);
//   let name = truncate_with_ellipsis(cds_segment.name_and_type(), max_name_len);
//   let nuc_len = end - start;
//   let codon_len = format_codon_length(nuc_len);
//   let exceptions = exceptions.join(", ");
//   writeln!(
//     w,
//     "{indent}{:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
//     name.style(style_for_feature_type("cds segment")?)
//   )?;
//
//   Ok(())
// }
//
// fn write_protein<W: Write>(w: &mut W, max_name_len: usize, protein: &Protein) -> Result<(), Report> {
//   let indent_width = INDENT_WIDTH * 3;
//   let indent = INDENT.repeat(indent_width);
//   let max_name_len = max_name_len.saturating_sub(indent_width);
//   let name = truncate_with_ellipsis(protein.name_and_type(), max_name_len);
//   writeln!(
//     w,
//     "{indent}{:max_name_len$} │   │   │         │         │         │             │",
//     name.style(style_for_feature_type("protein")?)
//   )?;
//
//   Ok(())
// }
//
// fn write_protein_segment<W: Write>(
//   w: &mut W,
//   max_name_len: usize,
//   protein_segment: &ProteinSegment,
// ) -> Result<(), Report> {
//   let ProteinSegment {
//     id,
//     name,
//     start,
//     end,
//     strand,
//     frame,
//     exceptions,
//     attributes,
//     source_record,
//     compat_is_cds,
//     compat_is_gene,
//   } = protein_segment;
//
//   let indent_width = INDENT_WIDTH * 4;
//   let indent = INDENT.repeat(indent_width);
//   let max_name_len = max_name_len.saturating_sub(indent_width);
//   let name = truncate_with_ellipsis(protein_segment.name_and_type(), max_name_len);
//   let nuc_len = end - start;
//   let codon_len = format_codon_length(nuc_len);
//   let exceptions = exceptions.join(", ");
//   writeln!(
//     w,
//     "{indent}{:max_name_len$} │ {strand:} │ {frame:} │ {start:>7} │ {end:>7} │ {nuc_len:>7} │ {codon_len:>11} │ {exceptions}",
//     name.style(style_for_feature_type("protein segment")?)
//   )?;
//
//   Ok(())
// }
//
// pub fn format_codon_length(nuc_len: usize) -> String {
//   let codons = nuc_len / 3;
//   let codons_decimal = match nuc_len % 3 {
//     0 => "     ",
//     1 => " +1/3",
//     2 => " +2/3",
//     _ => unreachable!(),
//   };
//   format!("{codons}{codons_decimal}")
// }
