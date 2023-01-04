use crate::features::feature_group::FeatureGroup;
use crate::features::feature_tree::FeatureTree;
use crate::features::sequence_region::SequenceRegion;
use crate::gene::cds::{Cds, CdsSegment, Protein, ProteinSegment};
use crate::gene::gene::Gene;
use crate::io::container::take_exactly_one;
use crate::io::gene_map::GeneMap;
use crate::{make_error, make_internal_error};
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
    genes.into_iter().map(|gene| (gene.gene_name.clone(), gene)).collect(),
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
    let gene = convert_gene(feature_group).wrap_err_with(|| eyre!("When processing gene, '{}'", feature_group.name))?;
    genes.push(gene);
  }

  feature_group
    .children
    .iter()
    .try_for_each(|child_feature_group| find_genes_recursive(child_feature_group, genes))
}

fn convert_gene(feature_group: &FeatureGroup) -> Result<Gene, Report> {
  assert_eq!(feature_group.feature_type, "gene");

  let feature = take_exactly_one(&feature_group.features).wrap_err_with(|| {
    eyre!(
      "When processing feature group '{}' ('{}') of type '{}': genes must consist of exactly one feature",
      feature_group.name,
      feature_group.id,
      feature_group.feature_type
    )
  })?;

  let mut cdses = find_cdses(&feature_group.children)?;

  // HACK: COMPAT: If there are no CDSes in this gene, then pretend the whole gene is a CDS
  if cdses.is_empty() {
    cdses.push(Cds::from_gene(feature));
  }

  Ok(Gene {
    index: feature.index,
    id: feature.id.clone(),
    gene_name: feature.name.clone(),
    start: feature.start,
    end: feature.end,
    strand: feature.strand.clone(),
    frame: feature.frame,
    cdses,
    exceptions: feature.exceptions.clone(),
    attributes: feature.attributes.clone(),
    source_record: feature.source_record.clone(),
    compat_is_cds: false,
  })
}

fn find_cdses(feature_groups: &[FeatureGroup]) -> Result<Vec<Cds>, Report> {
  let mut cdses = vec![];
  feature_groups
    .iter()
    .try_for_each(|child_feature_group| find_cdses_recursive(child_feature_group, &mut cdses))?;
  Ok(cdses)
}

fn find_cdses_recursive(feature_group: &FeatureGroup, cdses: &mut Vec<Cds>) -> Result<(), Report> {
  if feature_group.feature_type == "CDS" {
    let cds = convert_cds(feature_group).wrap_err_with(|| eyre!("When processing CDS, '{}'", feature_group.name))?;
    cdses.push(cds);
  }

  feature_group
    .children
    .iter()
    .try_for_each(|child_feature_group| find_cdses_recursive(child_feature_group, cdses))
}

fn convert_cds(feature_group: &FeatureGroup) -> Result<Cds, Report> {
  assert_eq!(feature_group.feature_type, "CDS");

  // A CDS can consist of one or multiple CDS segments
  let segments = feature_group
    .features
    .iter()
    .map(|feature| {
      Ok(CdsSegment {
        index: feature.index,
        id: feature.id.clone(),
        name: feature.name.clone(),
        start: feature.start,
        end: feature.end,
        strand: feature.strand.clone(),
        frame: feature.frame,
        exceptions: feature.exceptions.clone(),
        attributes: feature.attributes.clone(),
        source_record: feature.source_record.clone(),
        compat_is_gene: false,
      })
    })
    .collect::<Result<Vec<CdsSegment>, Report>>()?;

  if segments.is_empty() {
    return make_internal_error!("CDS contains no segments")?;
  }

  let mut mprs = vec![];
  feature_group
    .children
    .iter()
    .try_for_each(|child_feature_group| find_proteins_recursive(child_feature_group, &mut mprs))?;

  Ok(Cds {
    id: feature_group.id.clone(),
    name: feature_group.name.clone(),
    segments,
    proteins: mprs,
    compat_is_gene: false,
  })
}

fn find_proteins_recursive(feature_group: &FeatureGroup, proteins: &mut Vec<Protein>) -> Result<(), Report> {
  if feature_group.feature_type == "mature_protein_region_of_CDS" {
    let protein =
      convert_protein(feature_group).wrap_err_with(|| eyre!("When processing protein, '{}'", feature_group.name))?;
    proteins.push(protein);
  }

  feature_group
    .children
    .iter()
    .try_for_each(|child_feature_group| find_proteins_recursive(child_feature_group, proteins))
}

fn convert_protein(feature_group: &FeatureGroup) -> Result<Protein, Report> {
  assert!(
    &["mature_protein_region_of_CDS", "signal_peptide_region_of_CDS"].contains(&feature_group.feature_type.as_str())
  );

  // A protein can consist of one or multiple protein segments
  let segments = feature_group
    .features
    .iter()
    .map(|feature| {
      Ok(ProteinSegment {
        id: feature.id.clone(),
        name: feature.name.clone(),
        start: feature.start,
        end: feature.end,
        strand: feature.strand.clone(),
        frame: feature.frame,
        exceptions: feature.exceptions.clone(),
        attributes: feature.attributes.clone(),
        source_record: feature.source_record.clone(),
        compat_is_cds: false,
        compat_is_gene: false,
      })
    })
    .collect::<Result<Vec<ProteinSegment>, Report>>()?;

  if segments.is_empty() {
    return make_internal_error!("CDS contains no segments")?;
  }

  Ok(Protein {
    id: feature_group.id.clone(),
    name: feature_group.name.clone(),
    segments,
  })
}
