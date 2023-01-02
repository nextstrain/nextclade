use crate::analyze::virus_properties::{CountAaMotifsDesc, CountAaMotifsGeneDesc};
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

pub fn find_aa_motifs(
  count_aa_motifs_desc: &[CountAaMotifsDesc],
  translations: &[Translation],
) -> Result<BTreeMap<String, Vec<AaMotif>>, Report> {
  let motifs: Vec<AaMotif> = count_aa_motifs_desc
    .iter()
    .flat_map(
      |CountAaMotifsDesc {
         name,
         motifs,
         include_genes,
       }| {
        // If no genes specified, process all genes
        let include_genes = if include_genes.is_empty() {
          translations
            .iter()
            .map(|tr| CountAaMotifsGeneDesc {
              gene: tr.gene_name.clone(),
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
              .flat_map(|tr| {
                // If no ranges specified for a gene, search the whole gene
                let ranges = if ranges.is_empty() {
                  vec![Range {
                    begin: 0,
                    end: tr.seq.len(),
                  }]
                } else {
                  ranges.clone()
                };

                ranges
                  .iter()
                  .flat_map(|range| {
                    let seq = &tr.seq[range.begin..range.end];
                    let seq = from_aa_seq(seq);

                    motifs
                      .iter()
                      .cloned()
                      .flat_map(|motif| {
                        let re = Regex::new(&motif)
                          .wrap_err_with(|| eyre!("When compiling motif RegEx '{}'", motif))
                          .unwrap();

                        re.captures_iter(&seq)
                          .filter_map(|captures| {
                            captures.get(0).map(|capture| {
                              Ok(AaMotif {
                                name: name.clone(),
                                gene: tr.gene_name.clone(),
                                position: range.begin + capture.start(),
                                seq: capture.as_str().to_owned(),
                              })
                            })
                          })
                          .collect_vec()
                      })
                      .collect_vec()
                  })
                  .collect_vec()
              })
              .collect_vec()
          })
          .collect_vec()
      },
    )
    .collect::<Result<Vec<AaMotif>, Report>>()?;

  Ok(
    motifs
      .into_iter()
      .group_by(|motif| motif.name.clone())
      .into_iter()
      .map(|(name, motifs)| (name, motifs.collect_vec()))
      .collect(),
  )
}
