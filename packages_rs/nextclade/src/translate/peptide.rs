use crate::io::aa::Aa;
use std::collections::BTreeMap;

pub struct Peptide {
  pub gene_name: String,
  pub seq: Vec<Aa>,
}

pub type PeptideMap = BTreeMap<String, Peptide>;
