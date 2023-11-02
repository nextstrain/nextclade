use crate::features::feature_group::FeatureGroup;
use crate::features::feature_tree::FeatureTree;
use crate::features::sequence_region::SequenceRegion;
use crate::gene::cds::Cds;
use crate::gene::cds_segment::CdsSegment;
use crate::gene::gene::{find_cdses, Gene};
use crate::io::file::open_file_or_stdin;
use crate::io::yaml::yaml_parse;
use crate::utils::collections::take_exactly_one;
use crate::utils::error::report_to_string;
use crate::{make_error, make_internal_report};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use log::warn;
use num::Integer;
use regex::internal::Input;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::fmt::Display;
use std::path::Path;

#[derive(Clone, Debug, Default, Deserialize, Serialize, JsonSchema)]
#[must_use]
pub struct GeneMap {
  pub genes: Vec<Gene>,
}

impl GeneMap {
  pub fn new() -> Self {
    Self::from_genes(vec![])
  }

  pub fn from_genes(genes: Vec<Gene>) -> Self {
    Self { genes }
  }

  pub fn from_feature_tree(feature_tree: &FeatureTree) -> Result<Self, Report> {
    convert_feature_tree_to_gene_map(feature_tree)
  }

  pub fn from_path<P: AsRef<Path>>(filename: P) -> Result<Self, Report> {
    let filename = filename.as_ref();
    let mut file = open_file_or_stdin(&Some(filename))?;
    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
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
    self.genes.iter().any(|gene| gene.name == gene_name)
  }

  pub fn get(&self, gene_name: &str) -> Result<&Gene, Report> {
    self
      .genes
      .iter()
      .find(|gene| gene.name == gene_name)
      .ok_or_else(|| make_internal_report!("Gene is expected to be present, but not found: '{gene_name}'"))
  }

  pub fn get_cds<S: AsRef<str>>(&self, cds_name: S) -> Result<&Cds, Report> {
    let cds_name = cds_name.as_ref();
    self
      .genes
      .iter()
      .find_map(|gene| gene.cdses.iter().find(|cds| cds.name == cds_name))
      .ok_or_else(|| make_internal_report!("CDS '{cds_name}' is expected to be present, but not found"))
  }

  pub fn iter_genes(&self) -> impl Iterator<Item = &Gene> + '_ {
    self.genes.iter()
  }

  pub fn iter_genes_mut(&mut self) -> impl Iterator<Item = &mut Gene> + '_ {
    self.genes.iter_mut()
  }

  pub fn into_iter_genes(self) -> impl Iterator<Item = Gene> {
    self.genes.into_iter()
  }

  pub fn iter_cdses(&self) -> impl Iterator<Item = &Cds> + '_ {
    self.genes.iter().flat_map(|gene| gene.cdses.iter())
  }

  pub fn iter_cdses_mut(&mut self) -> impl Iterator<Item = &mut Cds> + '_ {
    self.genes.iter_mut().flat_map(|gene| gene.cdses.iter_mut())
  }

  pub fn into_iter_cdses(self) -> impl Iterator<Item = Cds> {
    self.genes.into_iter().flat_map(|gene| gene.cdses.into_iter())
  }

  pub fn cdses(&self) -> impl Iterator<Item = &Cds> + '_ {
    self.genes.iter().flat_map(|gene| gene.cdses.iter())
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

/// Filters genome annotation according to the list of requested cdses.
pub fn filter_gene_map(mut gene_map: GeneMap, cdses: &Option<Vec<String>>) -> GeneMap {
  if let Some(cdses) = cdses {
    let all_cdses = gene_map.iter_cdses().cloned().collect_vec();
    let requested_but_not_found = get_requested_cdses_not_in_genemap(&all_cdses, cdses);
    if !requested_but_not_found.is_empty() {
      warn!(
        "The following CDS(es) were requested through `--cds-selection` but not found in the genome annotation: {requested_but_not_found}",
      );
    }

    // Keep only requested CDSes and non-empty genes
    let genes = gene_map
      .iter_genes_mut()
      .map(|gene| {
        gene.cdses.retain(|cds| cdses.contains(&cds.name));
        gene.clone()
      })
      .filter(|gene| !gene.cdses.is_empty())
      .collect_vec();

    return GeneMap::from_genes(genes);
  }
  gene_map
}

fn get_requested_cdses_not_in_genemap(all_cdses: &[Cds], cdses: &[String]) -> String {
  cdses
    .iter()
    .filter(|&cds_name| !all_cdses.iter().any(|cds| &cds.name == cds_name))
    .map(|name| format!("'{name}'"))
    .join(", ")
}

pub fn convert_feature_tree_to_gene_map(feature_tree: &FeatureTree) -> Result<GeneMap, Report> {
  let seq_region = take_exactly_one(&feature_tree.seq_regions)
    .wrap_err_with(|| eyre!("Only feature trees with exactly one sequence region are supported. Please keep exactly one sequence region in genome annotation."))?;
  convert_seq_region_to_gene_map(seq_region)
}

fn convert_seq_region_to_gene_map(seq_region: &SequenceRegion) -> Result<GeneMap, Report> {
  let genes = find_genes(&seq_region.children)?;

  if genes.is_empty() {
    return make_error!(
      "Genome annotation: unable to find any genes or CDSes. Please make sure the genome annotation is correct."
    );
  }

  Ok(GeneMap::from_genes(genes))
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
