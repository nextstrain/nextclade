use crate::io::aa::{from_aa, Aa};
use crate::io::letter::Letter;
use crate::io::parse_pos::parse_pos;
use crate::make_error;
use crate::utils::range::AaRefPosition;
use eyre::{Report, WrapErr};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::str::FromStr;

const AA_MUT_REGEX: &str = r"((?P<ref>[A-Z-*])(?P<pos>\d{1,10})(?P<qry>[A-Z-*]))";

/// Represents aminoacid substitution in a simple way (without gene name and surrounding context)
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
pub struct AaSubMinimal {
  #[serde(rename = "refAA")]
  pub reff: Aa,

  #[serde(rename = "codon")]
  pub pos: AaRefPosition,

  #[serde(rename = "queryAA")]
  pub qry: Aa,
}

impl AaSubMinimal {
  /// Checks whether this substitution is a deletion (substitution of letter `Gap`)
  pub fn is_del(&self) -> bool {
    self.qry.is_gap()
  }

  pub fn to_string_without_gene(&self) -> String {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    format!("{}{}{}", from_aa(self.reff), self.pos + 1, from_aa(self.qry))
  }
}

impl FromStr for AaSubMinimal {
  type Err = Report;

  /// Parses aminoacid substitution from string. Expects IUPAC notation commonly used in bioinformatics.
  fn from_str(s: &str) -> Result<Self, Self::Err> {
    lazy_static! {
      static ref RE: Regex = Regex::new(AA_MUT_REGEX)
        .wrap_err_with(|| format!("When compiling regular expression '{AA_MUT_REGEX}'"))
        .unwrap();
    }

    if let Some(captures) = RE.captures(s) {
      return match (captures.name("ref"), captures.name("pos"), captures.name("qry")) {
        (Some(reff), Some(pos), Some(qry)) => {
          let reff = Aa::from_string(reff.as_str())?;
          let pos = parse_pos(pos.as_str())?.into();
          let qry = Aa::from_string(qry.as_str())?;
          Ok(Self { reff, pos, qry })
        }
        _ => make_error!("Unable to parse genotype: '{s}'"),
      };
    }
    make_error!("Unable to parse genotype: '{s}'")
  }
}

/// Order substitutions by position, then ref character, then query character
impl Ord for AaSubMinimal {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.reff, self.qry).cmp(&(other.pos, other.reff, other.qry))
  }
}

impl PartialOrd for AaSubMinimal {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}
