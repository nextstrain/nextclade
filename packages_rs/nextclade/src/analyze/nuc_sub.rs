use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::io::parse_pos::parse_pos;
use crate::make_error;
use eyre::{Report, WrapErr};
use lazy_static::lazy_static;
use regex::Regex;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

const NUC_MUT_REGEX: &str = r"((?P<ref>[A-Z-])(?P<pos>\d{1,10})(?P<qry>[A-Z-]))";

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NucSub {
  #[serde(rename = "ref")]
  pub reff: Nuc,
  pub pos: usize,
  pub qry: Nuc,
}

impl NucSub {
  /// Checks whether this substitution is a deletion (substitution of letter `Gap`)
  pub fn is_del(&self) -> bool {
    self.qry.is_gap()
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
          let pos = parse_pos(pos.as_str())?;
          let qry = Nuc::from_string(qry.as_str())?;
          Ok(Self { reff, pos, qry })
        }
        _ => make_error!("Unable to parse genotype: '{s}'"),
      };
    }
    make_error!("Unable to parse genotype: '{s}'")
  }
}
