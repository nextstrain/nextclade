use crate::gene::genotype::Genotype;
use crate::io::letter::Letter;
use crate::io::nuc::{from_nuc, Nuc};
use crate::io::parse_pos::parse_pos;
use crate::make_error;
use crate::utils::range::NucRefGlobalPosition;
use eyre::{Report, WrapErr};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::str::FromStr;

const NUC_MUT_REGEX: &str = r"((?P<ref>[A-Z-])(?P<pos>\d{1,10})(?P<qry>[A-Z-]))";

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Hash)]
pub struct NucSub {
  #[serde(rename = "refNuc")]
  pub reff: Nuc,
  pub pos: NucRefGlobalPosition,

  #[serde(rename = "queryNuc")]
  pub qry: Nuc,
}

impl NucSub {
  /// Checks whether this substitution is a deletion (substitution of letter `Gap`)
  pub fn is_del(&self) -> bool {
    self.qry.is_gap()
  }

  pub const fn genotype(&self) -> Genotype<Nuc> {
    Genotype {
      pos: self.pos,
      qry: self.qry,
    }
  }
}

impl FromStr for NucSub {
  type Err = Report;

  /// Parses nucleotide substitution from string. Expects IUPAC notation commonly used in bioinformatics.
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    lazy_static! {
      static ref RE: Regex = Regex::new(NUC_MUT_REGEX)
        .wrap_err_with(|| format!("When compiling regular expression '{NUC_MUT_REGEX}'"))
        .unwrap();
    }

    if let Some(captures) = RE.captures(s) {
      return match (captures.name("ref"), captures.name("pos"), captures.name("qry")) {
        (Some(reff), Some(pos), Some(qry)) => {
          let reff = Nuc::from_string(reff.as_str())?;
          let pos = parse_pos(pos.as_str())?.into();
          let qry = Nuc::from_string(qry.as_str())?;
          Ok(Self { reff, pos, qry })
        }
        _ => make_error!("Unable to parse nucleotide mutation: '{s}'"),
      };
    }
    make_error!("Unable to parse nucleotide mutation: '{s}'")
  }
}

impl ToString for NucSub {
  fn to_string(&self) -> String {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    format!("{}{}{}", from_nuc(self.reff), self.pos + 1, from_nuc(self.qry))
  }
}

/// Order substitutions by position, then ref character, then query character
impl Ord for NucSub {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.reff, self.qry).cmp(&(other.pos, other.reff, other.qry))
  }
}

impl PartialOrd for NucSub {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NucSubLabeled {
  #[serde(rename = "substitution")]
  pub sub: NucSub,
  pub labels: Vec<String>,
}
