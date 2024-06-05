use crate::alphabet::aa::{from_aa, Aa};
use crate::alphabet::letter::Letter;
use crate::analyze::aa_change_with_context::AaChangeWithContext;
use crate::analyze::aa_del::AaDel;
use crate::analyze::abstract_mutation::{AbstractMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::coord::position::AaRefPosition;
use crate::coord::range::AaRefRange;
use crate::io::parse_pos::parse_pos;
use crate::make_error;
use eyre::{Report, WrapErr};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::str::FromStr;

/// Represents aminoacid substitution
#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Hash, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaSub {
  pub cds_name: String,
  pub pos: AaRefPosition,
  pub ref_aa: Aa,
  pub qry_aa: Aa,
}

impl AbstractMutation<AaRefPosition, Aa> for AaSub {
  fn clone_with(&self, params: MutParams<AaRefPosition, Aa>) -> Self {
    Self {
      cds_name: self.cds_name.clone(),
      pos: params.pos,
      ref_aa: params.ref_letter,
      qry_aa: params.qry_letter,
    }
  }
}

impl QryLetter<Aa> for AaSub {
  fn qry_letter(&self) -> Aa {
    self.qry_aa
  }
}

impl RefLetter<Aa> for AaSub {
  fn ref_letter(&self) -> Aa {
    self.ref_aa
  }
}

impl Pos<AaRefPosition> for AaSub {
  fn pos(&self) -> AaRefPosition {
    self.pos
  }
}

impl AaSub {
  /// Checks whether this substitution is a deletion (substitution of letter `Gap`)
  pub fn is_del(&self) -> bool {
    self.qry_aa.is_gap()
  }

  pub fn from_str_and_gene(mut_str: impl AsRef<str>, cds_name: impl AsRef<str>) -> Result<Self, Report> {
    Self::from_str(&format!("{}:{}", cds_name.as_ref(), mut_str.as_ref()))
  }

  pub fn to_string_without_gene(&self) -> String {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    format!("{}{}{}", from_aa(self.ref_aa), self.pos + 1, from_aa(self.qry_aa))
  }

  #[must_use]
  pub fn invert(&self) -> Self {
    Self {
      cds_name: self.cds_name.clone(),
      ref_aa: self.qry_aa,
      pos: self.pos,
      qry_aa: self.ref_aa,
    }
  }
}

impl Display for AaSub {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    // NOTE: by convention, in bioinformatics, amino acids are numbered starting from 1, however our arrays are 0-based
    write!(
      f,
      "{}:{}{}{}",
      self.cds_name,
      from_aa(self.ref_aa),
      self.pos + 1,
      from_aa(self.qry_aa)
    )
  }
}

const AA_MUT_REGEX: &str = r"((?P<cds>.*?):(?P<ref>[A-Z-*])(?P<pos>\d{1,10})(?P<qry>[A-Z-*]))";

impl FromStr for AaSub {
  type Err = Report;

  /// Parses aminoacid substitution from string. Expects IUPAC notation commonly used in bioinformatics.
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    lazy_static! {
      static ref RE: Regex = Regex::new(AA_MUT_REGEX)
        .wrap_err_with(|| format!("When compiling regular expression '{AA_MUT_REGEX}'"))
        .unwrap();
    }

    if let Some(captures) = RE.captures(s) {
      return match (
        captures.name("cds"),
        captures.name("ref"),
        captures.name("pos"),
        captures.name("qry"),
      ) {
        (Some(cds_name), Some(reff), Some(pos), Some(qry)) => {
          let cds_name = cds_name.as_str().to_owned();
          let ref_aa = Aa::from_string(reff.as_str())?;
          let pos = parse_pos(pos.as_str())?.into();
          let qry_aa = Aa::from_string(qry.as_str())?;
          Ok(Self {
            cds_name,
            pos,
            ref_aa,
            qry_aa,
          })
        }
        _ => make_error!("Unable to parse amino acid substitution: '{s}'"),
      };
    }
    make_error!("Unable to parse amino acid substitution: '{s}'")
  }
}

impl From<&AaDel> for AaSub {
  fn from(del: &AaDel) -> Self {
    Self {
      cds_name: del.cds_name.clone(),
      ref_aa: del.ref_aa,
      pos: del.pos,
      qry_aa: Aa::Gap,
    }
  }
}

impl From<&AaChangeWithContext> for AaSub {
  fn from(change: &AaChangeWithContext) -> Self {
    Self {
      cds_name: change.cds_name.clone(),
      pos: change.pos,
      ref_aa: change.ref_aa,
      qry_aa: change.qry_aa,
    }
  }
}

/// Check whether a given pair if reference and query aminoacids constitute a mutation or deletion
pub fn is_aa_mutated_or_deleted(ref_aa: Aa, qry_aa: Aa) -> bool {
  // NOTE: We chose to ignore mutations to `X`.
  qry_aa != ref_aa && qry_aa != Aa::X
}

/// Check whether a given codon position corresponds to a sequenced aminoacid
pub fn is_codon_sequenced(aa_alignment_ranges: &[AaRefRange], codon: AaRefPosition) -> bool {
  aa_alignment_ranges
    .iter()
    .any(|aa_alignment_range| aa_alignment_range.contains(codon))
}
