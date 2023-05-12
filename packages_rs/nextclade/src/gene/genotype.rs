use crate::io::letter::Letter;
use crate::io::parse_pos::parse_pos;
use crate::make_error;
use eyre::{Report, WrapErr};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::str::FromStr;

const GENOTYPE_REGEX: &str = r"((?P<pos>\d{1,10})(?P<qry>[A-Z-]))";

/// Represents a mutation without reference character known
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Genotype<L: Letter<L>> {
  pub pos: usize,
  pub qry: L,
}

impl<L: Letter<L>> FromStr for Genotype<L> {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    lazy_static! {
      static ref RE: Regex = Regex::new(GENOTYPE_REGEX)
        .wrap_err_with(|| format!("When compiling regular expression '{GENOTYPE_REGEX}'"))
        .unwrap();
    }

    if let Some(captures) = RE.captures(s) {
      return match (captures.name("pos"), captures.name("qry")) {
        (Some(pos), Some(qry)) => {
          let pos = parse_pos(pos.as_str())?;
          let qry = L::from_string(qry.as_str())?;
          Ok(Self { pos, qry })
        }
        _ => make_error!("Unable to parse genotype: '{s}'"),
      };
    }
    make_error!("Unable to parse genotype: '{s}'")
  }
}

/// Order genotypes by position, then query character
impl<L: Letter<L>> Ord for Genotype<L> {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.pos, self.qry).cmp(&(other.pos, other.qry))
  }
}

impl<L: Letter<L>> PartialOrd for Genotype<L> {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    Some(self.cmp(other))
  }
}

/// Maps a list of labels to a mutation
#[derive(Debug, Default, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GenotypeLabeled<L: Letter<L>> {
  pub genotype: Genotype<L>,
  pub labels: Vec<String>,
}
