use crate::gene::gene::Gene;
use crate::io::gff3::read_gff3_file;
use crate::make_error;
use eyre::Report;
use itertools::Itertools;
use std::collections::BTreeMap;
use std::path::PathBuf;

pub type GeneMap = BTreeMap<String, Gene>;

/// Reads gene map from file and, optionally, filters it according to the list of requested genes.
///
/// Here are the possible combinations:
///
/// | --genemap  | --genes |                 behavior                   |
/// |------------|---------|--------------------------------------------|
/// |     +      |    +    | Take only specified genes                  |
/// |     +      |         | Take all genes                             |
/// |            |    +    | Error                                      |
/// |            |         | Skip translation and codon penalties       |
pub fn read_gene_map(input_gene_map: &Option<PathBuf>, genes: &Option<Vec<String>>) -> Result<GeneMap, Report> {
  match (input_gene_map, genes) {
    // Both gene map and list of genes are provided. Read gene map and retain only requested genes.
    (Some(input_gene_map), Some(genes)) => {
      let gene_map = read_gff3_file(&input_gene_map)?
        .into_iter()
        .filter(|(gene_name, ..)| genes.contains(gene_name))
        .collect();
      Ok(gene_map)
    }

    // Only gene map is provided. Read gene map and take all the genes.
    (Some(input_gene_map), None) => read_gff3_file(&input_gene_map),

    // Gene list is provided, but no gene map. This is illegal.
    (None, Some(_)) => make_error!("List of genes via '--genes' can only be specified when a gene map (genome annotation) is provided"),

    // Nothing is provided. Create an empty gene map.
    // This disables codon-aware alignment, translation, AA mutations, frame shifts, and everything else that relies
    // on gene information.
    (None, None) => Ok(GeneMap::new()),
  }
}
