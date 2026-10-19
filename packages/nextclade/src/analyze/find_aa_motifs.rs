use crate::alphabet::aa::from_aa_seq;
use crate::analyze::find_aa_motifs_changes::AaMotifsMap;
use crate::analyze::virus_properties::{AaMotifsDesc, CountAaMotifsCdsDesc};
use crate::coord::position::AaRefPosition;
use crate::coord::range::{AaRefRange, intersect_or_none};
use crate::translate::translate_genes::{CdsTranslation, Translation};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::hash::{Hash, Hasher};

/// Single regex match of a named amino acid motif in a translated CDS (e.g. glycosylation site, cleavage site).
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema, Ord, PartialOrd, Eq, PartialEq, Hash)]
#[serde(rename_all = "camelCase")]
pub struct AaMotif {
  /// Motif type name as defined in `aaMotifs` configuration
  pub name: String,
  /// Name of the coding sequence where this motif was found
  pub cds: String,
  /// 0-based codon position of the motif match start
  pub position: AaRefPosition,
  /// Matched amino acid sequence string
  pub seq: String,
}

impl From<AaMotifWithoutSeq> for AaMotif {
  fn from(aa_motif: AaMotifWithoutSeq) -> Self {
    aa_motif.0
  }
}

/// Compiled `aaMotifs` regular expressions of a dataset, prepared once and reused for every translation.
#[derive(Clone, Debug)]
pub struct AaMotifsSearch {
  entries: Vec<AaMotifsSearchEntry>,
}

/// One `aaMotifs` entry with its compiled regular expressions.
#[derive(Clone, Debug)]
struct AaMotifsSearchEntry {
  name: String,
  include_cdses: Vec<CountAaMotifsCdsDesc>,
  motifs: Vec<Regex>,
}

impl AaMotifsSearch {
  /// Compile the regular expressions of every `aaMotifs` entry.
  pub fn new(aa_motifs_descs: &[AaMotifsDesc]) -> Result<Self, Report> {
    let entries = aa_motifs_descs
      .iter()
      .map(AaMotifsSearchEntry::new)
      .collect::<Result<Vec<_>, Report>>()?;
    Ok(Self { entries })
  }
}

impl AaMotifsSearchEntry {
  fn new(aa_motifs_desc: &AaMotifsDesc) -> Result<Self, Report> {
    let AaMotifsDesc {
      name,
      motifs,
      include_cdses,
      ..
    } = aa_motifs_desc;

    let motifs = motifs
      .iter()
      .map(|motif| {
        Regex::new(motif)
          .wrap_err_with(|| format!("When compiling regular expression '{motif}' of 'aaMotifs' entry '{name}'"))
      })
      .collect::<Result<Vec<_>, Report>>()?;

    Ok(Self {
      name: name.clone(),
      include_cdses: include_cdses.clone(),
      motifs,
    })
  }
}

/// Find motifs in translated sequences, given a list of regexes (with restriction by gene and codon ranges)
/// This is useful for example to find Fly glycosylation spots.
pub fn find_aa_motifs(aa_motifs_search: &AaMotifsSearch, translation: &Translation) -> AaMotifsMap {
  // Find motifs
  let motifs = aa_motifs_search
    .entries
    .iter()
    .flat_map(|entry| process_one_aa_motifs_entry(entry, translation));

  // Group motifs by name
  motifs
    .chunk_by(|motif| motif.name.clone())
    .into_iter()
    .map(|(name, motifs)| (name, motifs.collect_vec()))
    .collect()
}

fn process_one_aa_motifs_entry(entry: &AaMotifsSearchEntry, translation: &Translation) -> Vec<AaMotif> {
  let AaMotifsSearchEntry {
    name,
    motifs,
    include_cdses: include_genes,
  } = entry;

  // If no genes specified, process all genes
  let include_genes = if include_genes.is_empty() {
    Cow::Owned(
      translation
        .cdses()
        .map(|translation| CountAaMotifsCdsDesc {
          cds: translation.name.clone(),
          ranges: vec![],
        })
        .collect_vec(),
    )
  } else {
    Cow::Borrowed(include_genes)
  };

  include_genes
    .iter()
    .flat_map(|CountAaMotifsCdsDesc { cds, ranges }| {
      translation
        .cdses()
        .filter(|CdsTranslation { name, .. }| name == cds)
        .flat_map(|translation| process_one_translation(translation, name, motifs, ranges))
        .collect_vec()
    })
    .collect_vec()
}

fn process_one_translation(
  translation: &CdsTranslation,
  name: &str,
  motifs: &[Regex],
  ranges: &[AaRefRange],
) -> Vec<AaMotif> {
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

fn process_one_motif(name: &str, translation: &CdsTranslation, range: &AaRefRange, motif: &Regex) -> Vec<AaMotif> {
  let seq = from_aa_seq(&translation.seq[range.to_std()]);

  motif
    .captures_iter(&seq)
    .filter_map(|captures| {
      // NOTE: .get(0) retrieves the full match (for the entire regex)
      captures.get(0).map(|capture| AaMotif {
        name: name.to_owned(),
        cds: translation.name.clone(),
        position: range.begin + capture.start() as isize,
        seq: capture.as_str().to_owned(),
      })
    })
    .collect_vec()
}

/// Wrapper for `AaMotif` that excludes the `seq` field from equality and hashing, for position-only set comparisons.
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
