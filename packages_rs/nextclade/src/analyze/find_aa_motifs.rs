use crate::analyze::find_aa_motifs_changes::AaMotifsMap;
use crate::analyze::virus_properties::{AaMotifsDesc, CountAaMotifsGeneDesc};
use crate::io::aa::from_aa_seq;
use crate::translate::translate_genes::{CdsTranslation, Translation};
use crate::utils::range::{intersect_or_none, AaRefPosition, AaRefRange};
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::hash::{Hash, Hasher};

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Ord, PartialOrd, Eq, PartialEq, Hash)]
#[serde(rename_all = "camelCase")]
pub struct AaMotif {
  pub name: String,
  pub cds: String,
  pub position: AaRefPosition,
  pub seq: String,
}

impl From<AaMotifWithoutSeq> for AaMotif {
  fn from(aa_motif: AaMotifWithoutSeq) -> Self {
    aa_motif.0
  }
}

/// Find motifs in translated sequences, given a list of regexes (with restriction by gene and codon ranges)
/// This is useful for example to find Fly glycosylation spots.
pub fn find_aa_motifs(aa_motifs_desc: &[AaMotifsDesc], translation: &Translation) -> Result<AaMotifsMap, Report> {
  // Find motifs
  let motifs: Vec<AaMotif> = aa_motifs_desc
    .iter()
    .flat_map(|desc| process_one_aa_motifs_desc(desc, translation))
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
  translation: &Translation,
) -> Vec<Result<AaMotif, Report>> {
  let AaMotifsDesc {
    name,
    motifs,
    include_genes,
    ..
  } = aa_motifs_desc;

  // If no genes specified, process all genes
  let include_genes = if include_genes.is_empty() {
    translation
      .cdses()
      .map(|translation| CountAaMotifsGeneDesc {
        gene: translation.name.clone(),
        ranges: vec![],
      })
      .collect_vec()
  } else {
    include_genes.clone()
  };

  include_genes
    .iter()
    .flat_map(|CountAaMotifsGeneDesc { gene, ranges }| {
      translation
        .cdses()
        .filter(|CdsTranslation { name, .. }| name == gene)
        .flat_map(|translation| process_one_translation(translation, name, motifs, ranges))
        .collect_vec()
    })
    .collect_vec()
}

fn process_one_translation(
  translation: &CdsTranslation,
  name: &str,
  motifs: &[String],
  ranges: &[AaRefRange],
) -> Vec<Result<AaMotif, Report>> {
  // If no ranges specified for a gene, search the whole gene
  let ranges = if ranges.is_empty() {
    Cow::Owned(vec![AaRefRange::from_usize(0, translation.seq.len())])
  } else {
    Cow::Borrowed(ranges)
  };

  ranges.iter().flat_map(|motif_range| {
      translation.alignment_ranges.iter().filter_map(|alignment_range| {
        // Trim motif ranges outside alignment range
        // NOTE(design): this silently ignores motifs outside of alignment range (e.g. in partial sequences)
        // this is currently by design (as discussed internally), but might be revised in the future.
        intersect_or_none(alignment_range, motif_range)
      })
    })
    // For each range, search each motif pattern
    .flat_map(|range|
      motifs.iter().flat_map(move |motif| process_one_motif(name, translation, &range, motif))
    )
    .collect_vec()
}

fn process_one_motif(
  name: &str,
  translation: &CdsTranslation,
  range: &AaRefRange,
  motif: &str,
) -> Vec<Result<AaMotif, Report>> {
  let re = Regex::new(motif)
    .wrap_err_with(|| eyre!("When compiling motif RegEx '{}'", motif))
    .unwrap();

  let seq = from_aa_seq(&translation.seq[range.to_std()]);

  re.captures_iter(&seq)
    .filter_map(|captures| {
      // NOTE: .get(0) retrieves the full match (for the entire regex)
      captures.get(0).map(|capture| {
        Ok(AaMotif {
          name: name.to_owned(),
          cds: translation.name.clone(),
          position: range.begin + capture.start() as isize,
          seq: capture.as_str().to_owned(),
        })
      })
    })
    .collect_vec()
}

// Wrapper for `struct AaMotif` which disregards `.seq` during comparison.
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, PartialOrd)]
pub struct AaMotifWithoutSeq(pub AaMotif);

impl From<AaMotif> for AaMotifWithoutSeq {
  fn from(aa_motif: AaMotif) -> Self {
    Self(aa_motif)
  }
}

impl Hash for AaMotifWithoutSeq {
  fn hash<H: Hasher>(&self, state: &mut H) {
    self.0.name.hash(state);
    self.0.cds.hash(state);
    self.0.position.hash(state);
    // NOTE: `.seq` is disregarded
  }
}

impl Eq for AaMotifWithoutSeq {}

impl PartialEq<Self> for AaMotifWithoutSeq {
  fn eq(&self, other: &Self) -> bool {
    (&self.0.name, &self.0.cds, &self.0.position).eq(&(&other.0.name, &other.0.cds, &other.0.position))
    // NOTE: `.seq` is disregarded
  }
}
