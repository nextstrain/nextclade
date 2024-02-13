use crate::alphabet::nuc::{from_nuc_seq, to_nuc_seq, Nuc};
use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::NucRefGlobalRange;
use crate::gene::genotype::Genotype;
use crate::io::csv::parse_csv;
use crate::io::fs::read_file_to_string;
use crate::make_error;
use crate::translate::complement::reverse_complement_in_place;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::warn;
use regex::Regex;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PcrPrimerCsvRow {
  #[serde(rename = "Country (Institute)")]
  pub source: String,

  #[serde(rename = "Target")]
  pub target: String,

  #[serde(rename = "Oligonucleotide")]
  pub name: String,

  #[serde(rename = "Sequence")]
  pub primer_oligonuc: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PcrPrimer {
  pub source: String,
  pub target: String,
  pub name: String,
  pub root_oligonuc: String,
  pub primer_oligonuc: String,
  pub range: NucRefGlobalRange,
  #[serde(rename = "nonACGTs")]
  pub non_acgts: Vec<Genotype<Nuc>>,
}

impl PcrPrimer {
  pub fn from_str(s: &str, ref_seq_str: &str) -> Result<Vec<Self>, Report> {
    let raw: Vec<PcrPrimerCsvRow> = parse_csv(s)?;
    raw
      .into_iter()
      .map(|raw_primer| convert_pcr_primer(raw_primer, ref_seq_str))
      .collect::<Result<Vec<Self>, Report>>()
  }

  pub fn from_path(filepath: impl AsRef<Path>, ref_seq_str: &str) -> Result<Vec<Self>, Report> {
    let filepath = filepath.as_ref();

    let data =
      read_file_to_string(filepath).wrap_err_with(|| format!("When reading PCR primers file {filepath:#?}"))?;

    Self::from_str(&data, ref_seq_str).wrap_err_with(|| format!("When parsing PCR primers file {filepath:#?}"))
  }
}

pub fn convert_pcr_primer(raw: PcrPrimerCsvRow, ref_seq_str: &str) -> Result<PcrPrimer, Report> {
  let PcrPrimerCsvRow {
    source,
    target,
    name,
    primer_oligonuc,
  } = raw;

  let mut primer_oligonuc = to_nuc_seq(&primer_oligonuc)?;

  // If this is a reverse primer, we need to reverse-complement it before attempting to match with root sequence
  if name.ends_with("_R") {
    reverse_complement_in_place(&mut primer_oligonuc);
  }

  let mut root_oligonuc = find_primer_in_ref_seq(&primer_oligonuc, ref_seq_str);
  if root_oligonuc.is_none() {
    // If nothing found, reverse-complement the primer and retry search
    reverse_complement_in_place(&mut primer_oligonuc);
    root_oligonuc = find_primer_in_ref_seq(&primer_oligonuc, ref_seq_str);
  }

  match root_oligonuc {
    None => {
      make_error!(
        "PCR primer not found in reference sequence: name: '{}', source: '{}', oligonuc: '{}'. \
        This might mean that the list of primers is not compatible with the root sequence used.",
        name,
        source,
        from_nuc_seq(&primer_oligonuc)
      )
    }
    Some((begin, root_oligonuc)) => {
      let range = NucRefGlobalRange::from_usize(begin, begin + root_oligonuc.len());

      let non_acgts = find_non_acgt(&primer_oligonuc);

      Ok(PcrPrimer {
        source,
        target,
        name,
        root_oligonuc: from_nuc_seq(&root_oligonuc),
        primer_oligonuc: from_nuc_seq(&primer_oligonuc),
        range,
        non_acgts,
      })
    }
  }
}

/// Finds PCR primer oligonucleotide fragment in reference sequence. Returns position of the begin of the fragment
/// in the reference sequence and the corresponding fragment of reference sequence.
pub fn find_primer_in_ref_seq(primer_oligonuc: &[Nuc], ref_seq_str: &str) -> Option<(usize, Vec<Nuc>)> {
  // Remove all non-ACGTN from the primer
  let primer_oligonuc_sanitized = from_nuc_seq(primer_oligonuc)
    .chars()
    .map(|nuc| if is_acgt_char(nuc) { nuc } else { '.' })
    .collect::<String>();

  match Regex::new(&primer_oligonuc_sanitized) {
    Err(report) => {
      warn!(
        "When compiling regular expression for PCR primer search: '{}': {}",
        primer_oligonuc_sanitized,
        report.to_string()
      );
      None
    }
    Ok(primer_regex) => {
      if let Some(captures) = primer_regex.captures(ref_seq_str) {
        captures
          .get(0)
          .map(|capture| (capture.start(), to_nuc_seq(capture.as_str()).unwrap()))
      } else {
        None
      }
    }
  }
}

pub const fn is_acgt_char(c: char) -> bool {
  matches!(c.to_ascii_uppercase(), 'A' | 'C' | 'G' | 'T')
}

pub fn find_non_acgt(seq: &[Nuc]) -> Vec<Genotype<Nuc>> {
  seq
    .iter()
    .enumerate()
    .filter_map(|(pos, nuc)| {
      (!nuc.is_acgt()).then_some(Genotype {
        pos: NucRefGlobalPosition::from(pos),
        qry: *nuc,
      })
    })
    .collect_vec()
}
