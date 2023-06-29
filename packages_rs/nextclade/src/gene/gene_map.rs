use crate::features::feature_group::FeatureGroup;
use crate::features::feature_tree::FeatureTree;
use crate::features::sequence_region::SequenceRegion;
use crate::gene::cds::Cds;
use crate::gene::cds_segment::CdsSegment;
use crate::gene::gene::{find_cdses, Gene};
use crate::io::container::take_exactly_one;
use crate::io::file::open_file_or_stdin;
use crate::io::yaml::yaml_parse;
use crate::utils::error::report_to_string;
use crate::{make_error, make_internal_report};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use log::warn;
use num::Integer;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt::Display;
use std::path::Path;

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[must_use]
pub struct GeneMap {
  pub genes: BTreeMap<String, Gene>,
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

  pub fn from_file<P: AsRef<Path>>(filename: P) -> Result<Self, Report> {
    let filename = filename.as_ref();
    let mut file = open_file_or_stdin(&Some(filename))?;
    let mut buf = vec![];
    {
      file.read_to_end(&mut buf)?;
    }
    Self::from_str(String::from_utf8(buf)?).wrap_err_with(|| eyre!("When reading file: {filename:?}"))
  }

  // TODO: rename this function, because it handles more than GFF3
  pub fn from_str(content: impl AsRef<str>) -> Result<Self, Report> {
    let content = content.as_ref();
    let gene_map_yaml: Result<GeneMap, Report> = Self::from_yaml_str(content);
    let gene_map_gff: Result<GeneMap, Report> = Self::from_gff3_str(content);

    let gene_map = match (gene_map_yaml, gene_map_gff) {
      (Err(json_err), Err(gff_err)) => {
        return make_error!("Attempted to parse the genome annotation as JSON and as GFF, but both attempts failed:\nJSON error: {}\n\nGFF3 error: {}\n",
          report_to_string(&json_err),
          report_to_string(&gff_err),
        )
      },
      (Ok(gene_map), _) => gene_map,
      (_, Ok(gene_map)) => gene_map,
    };

    gene_map.validate()?;
    Ok(gene_map)
  }

  fn from_yaml_str(content: impl AsRef<str>) -> Result<Self, Report> {
    yaml_parse(content.as_ref())
  }

  fn from_gff3_str(content: impl AsRef<str>) -> Result<Self, Report> {
    Self::from_feature_tree(&FeatureTree::from_gff3_str(content.as_ref())?)
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

  pub fn get(&self, gene_name: &str) -> Result<&Gene, Report> {
    self
      .genes
      .get(gene_name)
      .ok_or_else(|| make_internal_report!("Gene is expected to be present, but not found: '{gene_name}'"))
  }

  pub fn get_cds<S: AsRef<str>>(&self, cds_name: S) -> Result<&Cds, Report> {
    let cds_name = cds_name.as_ref();
    self
      .genes
      .iter()
      .find_map(|(_, gene)| gene.cdses.iter().find(|cds| cds.name == cds_name))
      .ok_or_else(|| {
        make_internal_report!("When looking up a CDS translation: CDS '{cds_name}' is expected, but not found")
      })
  }

  pub fn iter_genes(&self) -> impl Iterator<Item = (&String, &Gene)> + '_ {
    self.genes.iter()
  }

  pub fn iter_genes_mut(&mut self) -> impl Iterator<Item = (&String, &mut Gene)> + '_ {
    self.genes.iter_mut()
  }

  pub fn into_iter_genes(self) -> impl Iterator<Item = (String, Gene)> {
    self.genes.into_iter()
  }

  pub fn genes(&self) -> impl Iterator<Item = &Gene> + '_ {
    self.genes.values()
  }

  pub fn iter_cdses(&self) -> impl Iterator<Item = &Cds> + '_ {
    self.genes.iter().flat_map(|(_, gene)| gene.cdses.iter())
  }

  pub fn iter_cdses_mut(&mut self) -> impl Iterator<Item = &mut Cds> + '_ {
    self.genes.iter_mut().flat_map(|(_, gene)| gene.cdses.iter_mut())
  }

  pub fn into_iter_cdses(self) -> impl Iterator<Item = Cds> {
    self.genes.into_iter().flat_map(|(_, gene)| gene.cdses.into_iter())
  }

  pub fn cdses(&self) -> impl Iterator<Item = &Cds> + '_ {
    self.genes.iter().flat_map(|(_, gene)| gene.cdses.iter())
  }

  pub fn validate(&self) -> Result<(), Report> {
    self.iter_cdses().try_for_each(|cds| {
      cds.len().is_multiple_of(&3).then_some(()).ok_or_else(|| {
        let segment_lengths = cds.segments.iter().map(CdsSegment::len).join("+");
        let n_segments = cds.segments.len();
        eyre!(
          "Length of a CDS is expected to be divisible by 3, but the length of CDS '{}' is {} \
          (it consists of {n_segments} fragment(s) of length(s) {segment_lengths}). \
          This is likely a mistake in genome annotation.",
          cds.name,
          cds.len()
        )
      })
    })?;

    Ok(())
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
        .into_iter_genes()
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

pub fn convert_feature_tree_to_gene_map(feature_tree: &FeatureTree) -> Result<GeneMap, Report> {
  let seq_region = take_exactly_one(&feature_tree.seq_regions)
    .wrap_err_with(|| eyre!("Only feature trees with exactly one sequence region are supported. Please keep exactly one sequence region in gene map."))?;
  convert_seq_region_to_gene_map(seq_region)
}

fn convert_seq_region_to_gene_map(seq_region: &SequenceRegion) -> Result<GeneMap, Report> {
  let genes = find_genes(&seq_region.children)?;

  if genes.is_empty() {
    return make_error!(
      "Gene map: unable to find any genes or CDSes. Please make sure the genome annotation is correct."
    );
  }

  Ok(GeneMap::from_genes(
    genes.into_iter().map(|gene| (gene.name.clone(), gene)).collect(),
  ))
}

fn find_genes(feature_groups: &[FeatureGroup]) -> Result<Vec<Gene>, Report> {
  let mut genes = vec![];
  feature_groups
    .iter()
    .try_for_each(|feature_group| find_genes_recursive(feature_group, &mut genes))?;

  if genes.is_empty() {
    // If there are no genes, but there are CDSes, then pretend each CDS is a gene
    find_cdses(feature_groups)?
      .into_iter()
      .map(|cds| Gene::from_cds(&cds))
      .collect()
  } else {
    Ok(genes)
  }
}

fn find_genes_recursive(feature_group: &FeatureGroup, genes: &mut Vec<Gene>) -> Result<(), Report> {
  if feature_group.feature_type == "gene" {
    let gene = Gene::from_feature_group(feature_group)
      .wrap_err_with(|| eyre!("When processing gene, '{}'", feature_group.name))?;
    genes.push(gene);
  }

  feature_group
    .children
    .iter()
    .try_for_each(|child_feature_group| find_genes_recursive(child_feature_group, genes))
}
