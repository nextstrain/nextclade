use crate::features::feature_group::FeatureGroup;
use crate::features::feature_tree::FeatureTree;
use crate::features::sequence_region::SequenceRegion;
use crate::gene::gene::{find_cdses, Gene};
use crate::io::container::take_exactly_one;
use crate::io::gene_map::GeneMap;
use crate::make_error;
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;

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
