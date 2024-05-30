use crate::features::feature_group::FeatureGroup;
use crate::features::feature_tree::FeatureTree;
use crate::features::sequence_region::SequenceRegion;
use crate::gene::auspice_annotations::convert_auspice_annotations_to_genes;
use crate::gene::cds::Cds;
use crate::gene::cds_segment::CdsSegment;
use crate::gene::gene::{find_cdses, Gene};
use crate::io::file::open_file_or_stdin;
use crate::io::yaml::yaml_parse;
use crate::tree::tree::AuspiceGenomeAnnotations;
use crate::utils::collections::take_exactly_one;
use crate::utils::error::report_to_string;
use crate::utils::string::{format_list, Indent};
use crate::{make_error, make_internal_report};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use log::warn;
use num::Integer;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::path::Path;

type GeneMapParserFn = Box<dyn Fn(&str) -> Result<GeneMap, Report>>;

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

  pub fn from_auspice_annotations(anns: &AuspiceGenomeAnnotations) -> Result<Self, Report> {
    let genes = convert_auspice_annotations_to_genes(anns)?;
    Ok(GeneMap::from_genes(genes))
  }

  pub fn from_path<P: AsRef<Path>>(filename: P) -> Result<Self, Report> {
    let filename = filename.as_ref();
    let mut file = open_file_or_stdin(&Some(filename))?;
    let mut buf = vec![];
    file.read_to_end(&mut buf)?;
    Self::from_str(String::from_utf8(buf)?).wrap_err_with(|| eyre!("When reading file: {filename:?}"))
  }

  pub fn from_str(content: impl AsRef<str>) -> Result<Self, Report> {
    let content = content.as_ref();

    let parsers: Vec<(&str, GeneMapParserFn)> = vec![
      (
        "Genome annotation in GFF3 format",
        Box::new(|content| Self::from_gff3_str(content)),
      ),
      (
        "Genome annotation in external JSON format",
        Box::new(|content| Self::from_yaml_str(content)),
      ),
      (
        "Genome annotation extracted from Auspice JSON",
        Box::new(|content| Self::from_tree_json_str(content)),
      ),
    ];

    let mut errors = Vec::new();
    for (name, parser) in &parsers {
      match parser(content) {
        Ok(map) => {
          map.validate()?;
          return Ok(map);
        }
        Err(err) => {
          errors.push(format!(
            "When attempted to parse as {name}: {}\n",
            report_to_string(&err)
          ));
        }
      }
    }

    make_error!(
      "Attempted to parse the genome annotation but failed. Tried multiple formats:\n\n{}\n",
      format_list(Indent::default(), errors.into_iter())
    )
  }

  fn from_yaml_str(content: impl AsRef<str>) -> Result<Self, Report> {
    yaml_parse(content.as_ref())
  }

  fn from_gff3_str(content: impl AsRef<str>) -> Result<Self, Report> {
    Self::from_feature_tree(&FeatureTree::from_gff3_str(content.as_ref())?)
  }

  fn from_tree_json_str(content: impl AsRef<str>) -> Result<Self, Report> {
    let anns = AuspiceGenomeAnnotations::from_tree_json_str(content)?;
    Self::from_auspice_annotations(&anns)
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
  pub fn contains(&self, name: &str) -> bool {
    self.genes.iter().any(|gene| gene.name == name)
  }

  pub fn get(&self, gene_name: &str) -> Result<&Gene, Report> {
    self
      .genes
      .iter()
      .find(|gene| gene.name == gene_name)
      .ok_or_else(|| make_internal_report!("Gene '{gene_name}' is expected to be present, but not found"))
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

    let gene_name_dupes = self
      .iter_genes()
      .map(|x| &x.name)
      .sorted()
      .duplicates()
      .map(|name| format!("'{name}'"))
      .join(", ");

    if !gene_name_dupes.is_empty() {
      return make_error!("Gene names are expected to be unique, but found duplicate names: {gene_name_dupes}");
    }

    let cds_name_dupes = self
      .iter_cdses()
      .map(|x| &x.name)
      .sorted()
      .duplicates()
      .map(|name| format!("'{name}'"))
      .join(", ");

    if !cds_name_dupes.is_empty() {
      return make_error!("CDS names are expected to be unique, but found duplicate names: {cds_name_dupes}");
    }

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

#[cfg(test)]
mod tests {
  use super::*;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  fn genome_annotation_fails_on_duplicate_gene_names() -> Result<(), Report> {
    let result = GeneMap::from_str(
      r#"##gff-version 3
##sequence-region MN908947 1 29903
MN908947	GenBank	gene	13468	21555	.	+	.	Name=ORF1b;ID=1
MN908947	GenBank	gene	25393	26220	.	+	.	Name=ORF3a;ID=2
MN908947	GenBank	gene	21563	25384	.	+	.	Name=S;ID=3
MN908947	GenBank	CDS	21563	25384	.	+	.	Name=S1;Parent=3
MN908947	GenBank	gene	26245	26472	.	+	.	Name=S;ID=4
MN908947	GenBank	CDS	21563	25384	.	+	.	Name=S2;Parent=4
MN908947	GenBank	gene	26523	27191	.	+	.	Name=M;ID=5
MN908947	GenBank	gene	27756	27887	.	+	.	Name=N;ID=8
MN908947	GenBank	CDS	27756	27887	.	+	.	Name=N1;Parent=8
MN908947	GenBank	gene	27894	28259	.	+	.	Name=N;ID=9
MN908947	GenBank	CDS	27894	28259	.	+	.	Name=N2;Parent=9

"#,
    );

    assert_eq!(
      "Gene names are expected to be unique, but found duplicate names: 'N', 'S'",
      report_to_string(&result.unwrap_err()),
    );

    Ok(())
  }

  #[rstest]
  fn genome_annotation_fails_on_duplicate_cds_names_across_genes() -> Result<(), Report> {
    let result = GeneMap::from_str(
      r#"##gff-version 3
##sequence-region MN908947 1 29903
MN908947	GenBank	gene	21563	25384	.	+	.	Name=S;ID=3
MN908947	GenBank	CDS	21563	25384	.	+	.	Name=D;Parent=3
MN908947	GenBank	gene	27894	28259	.	+	.	Name=N;ID=9
MN908947	GenBank	CDS	27894	28259	.	+	.	Name=D;Parent=9

"#,
    );

    assert_eq!(
      "CDS names are expected to be unique, but found duplicate names: 'D'",
      report_to_string(&result.unwrap_err()),
    );

    Ok(())
  }

  #[rstest]
  fn genome_annotation_fails_on_duplicate_cds_names_within_gene() -> Result<(), Report> {
    let result = GeneMap::from_str(
      r#"##gff-version 3
##sequence-region MN908947 1 29903
MN908947	GenBank	gene	21563	25384	.	+	.	Name=S;ID=3
MN908947	GenBank	CDS	21563	25384	.	+	.	Name=D;Parent=3;ID=D1
MN908947	GenBank	CDS	27894	28259	.	+	.	Name=D;Parent=3;ID=D2
MN908947	GenBank	gene	27894	28259	.	+	.	Name=N;ID=9
MN908947	GenBank	CDS	27894	28259	.	+	.	Name=N;Parent=9

"#,
    );

    assert_eq!(
      "CDS names are expected to be unique, but found duplicate names: 'D'",
      report_to_string(&result.unwrap_err()),
    );

    Ok(())
  }
}
