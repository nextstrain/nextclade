use crate::alphabet::letter::Letter;
use crate::coord::position::NucRefGlobalPosition;
use crate::io::parse_pos::parse_pos;
use crate::make_error;
use eyre::{Report, WrapErr};
use lazy_static::lazy_static;
use regex::Regex;
use serde::de::Error;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::cmp::Ordering;
use std::fmt::{Display, Formatter};
use std::str;
use std::str::FromStr;

const GENOTYPE_REGEX: &str = r"((?P<pos>\d{1,10})(?P<qry>[A-Z-]))";

/// Represents a mutation without reference character known
#[derive(Clone, Debug, Default, Eq, PartialEq, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Genotype<L: Letter<L>> {
  pub pos: NucRefGlobalPosition,
  pub qry: L,
}

impl<L: Letter<L>> Display for Genotype<L> {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}{}", self.pos + 1, self.qry)
  }
}

impl<'de, L> Deserialize<'de> for Genotype<L>
where
  L: Letter<L>,
{
  fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
    let s = String::deserialize(deserializer)?;
    Genotype::from_str(&s).map_err(Error::custom)
  }
}

impl<L> Serialize for Genotype<L>
where
  L: Letter<L>,
{
  fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
  where
    Ser: Serializer,
  {
    serializer.serialize_str(&self.to_string())
  }
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
          let pos = parse_pos(pos.as_str())?.into();
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
#[derive(Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct GenotypeLabeled<L: Letter<L>> {
  pub genotype: Genotype<L>,
  pub labels: Vec<String>,
}
