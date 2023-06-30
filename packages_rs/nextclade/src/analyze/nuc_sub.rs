use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::{from_nuc, Nuc};
use crate::analyze::nuc_del::NucDel;
use crate::coord::position::NucRefGlobalPosition;
use crate::gene::genotype::Genotype;
use crate::io::parse_pos::parse_pos;
use crate::make_error;
use eyre::{Report, WrapErr};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};
use std::str::FromStr;

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema, Hash)]
#[serde(rename_all = "camelCase")]
pub struct NucSub {
  pub pos: NucRefGlobalPosition,
  pub ref_nuc: Nuc,
  pub qry_nuc: Nuc,
}

impl NucSub {
  /// Checks whether this substitution is a deletion (substitution of letter `Gap`)
  pub fn is_del(&self) -> bool {
    self.qry_nuc.is_gap()
  }

  pub const fn genotype(&self) -> Genotype<Nuc> {
    Genotype {
      pos: self.pos,
      qry: self.qry_nuc,
    }
  }

  #[must_use]
  pub fn invert(&self) -> Self {
    Self {
      ref_nuc: self.qry_nuc,
      pos: self.pos,
      qry_nuc: self.ref_nuc,
    }
  }
}

impl Display for NucSub {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    // NOTE: by convention, in bioinformatics, nucleotides are numbered starting from 1, however our arrays are 0-based
    write!(
      f,
      "{}{}{}",
      from_nuc(self.ref_nuc),
      self.pos + 1,
      from_nuc(self.qry_nuc)
    )
  }
}

const NUC_MUT_REGEX: &str = r"((?P<ref>[A-Z-])(?P<pos>\d{1,10})(?P<qry>[A-Z-]))";

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
          Ok(Self {
            ref_nuc: reff,
            pos,
            qry_nuc: qry,
          })
        }
        _ => make_error!("Unable to parse nucleotide mutation: '{s}'"),
      };
    }
    make_error!("Unable to parse nucleotide mutation: '{s}'")
  }
}

impl From<&NucDel> for NucSub {
  fn from(del: &NucDel) -> Self {
    Self {
      pos: del.pos,
      ref_nuc: del.ref_nuc,
      qry_nuc: Nuc::Gap,
    }
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Ord, PartialOrd, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NucSubLabeled {
  pub substitution: NucSub,
  pub labels: Vec<String>,
}
