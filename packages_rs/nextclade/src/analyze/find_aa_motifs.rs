use crate::analyze::virus_properties::{AaMotifsDesc, CountAaMotifsGeneDesc};
use crate::io::aa::from_aa_seq;
use crate::translate::translate_genes::Translation;
use crate::utils::range::Range;
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AaMotif {
  pub name: String,
  pub gene: String,
  pub position: usize,
  pub seq: String,
}

/// Find motifs in translated sequences, given a list of regexes (with restriction by gene and codon ranges)
/// This is useful for example to find Fly glycosylation spots.
pub fn find_aa_motifs(
  aa_motifs_desc: &[AaMotifsDesc],
  translations: &[Translation],
) -> Result<BTreeMap<String, Vec<AaMotif>>, Report> {
  // Find motifs
  let motifs: Vec<AaMotif> = aa_motifs_desc
    .iter()
    .flat_map(|desc| process_one_aa_motifs_desc(desc, translations))
    .collect::<Result<Vec<AaMotif>, Report>>()?;

  // Group motifs by name
  let motifs = motifs
    .into_iter()
    .group_by(|motif| motif.name.clone())
    .into_iter()
    .map(|(name, motifs)| (name, motifs.collect_vec()))
    .collect();

  Ok(motifs)
}

fn process_one_aa_motifs_desc(
  aa_motifs_desc: &AaMotifsDesc,
  translations: &[Translation],
) -> Vec<Result<AaMotif, Report>> {
  let AaMotifsDesc {
    name,
    motifs,
    include_genes,
    ..
  } = aa_motifs_desc;

  // If no genes specified, process all genes
  let include_genes = if include_genes.is_empty() {
    translations
      .iter()
      .map(|translation| CountAaMotifsGeneDesc {
        gene: translation.gene_name.clone(),
        ranges: vec![],
      })
      .collect_vec()
  } else {
    include_genes.clone()
  };

  include_genes
    .iter()
    .flat_map(|CountAaMotifsGeneDesc { gene, ranges }| {
      translations
        .iter()
        .filter(|Translation { gene_name, .. }| gene_name == gene)
        .flat_map(|translation| process_one_translation(translation, name, motifs, ranges))
        .collect_vec()
    })
    .collect_vec()
}

fn process_one_translation(
  translation: &Translation,
  name: &str,
  motifs: &[String],
  ranges: &[Range],
) -> Vec<Result<AaMotif, Report>> {
  // If no ranges specified for a gene, search the whole gene
  let ranges = if ranges.is_empty() {
    vec![Range {
      begin: 0,
      end: translation.seq.len(),
    }]
  } else {
    ranges.to_owned()
  };

  ranges
    .iter()
    .flat_map(|range| {
      let seq = &translation.seq[range.begin..range.end];
      let seq = from_aa_seq(seq);

      motifs
        .iter()
        .cloned()
        .flat_map(|motif| process_one_motif(name, translation, range, &seq, &motif))
        .collect_vec()
    })
    .collect_vec()
}

fn process_one_motif(
  name: &str,
  translation: &Translation,
  range: &Range,
  seq: &str,
  motif: &str,
) -> Vec<Result<AaMotif, Report>> {
  let re = Regex::new(motif)
    .wrap_err_with(|| eyre!("When compiling motif RegEx '{}'", motif))
    .unwrap();

  re.captures_iter(seq)
    .filter_map(|captures| {
      captures.get(0).map(|capture| {
        Ok(AaMotif {
          name: name.to_owned(),
          gene: translation.gene_name.clone(),
          position: range.begin + capture.start(),
          seq: capture.as_str().to_owned(),
        })
      })
    })
    .collect_vec()
}
