use crate::io::aa::Aa;
use std::collections::HashMap;

pub struct Peptide {
  pub gene_name: String,
  pub seq: Vec<Aa>,
}

pub type PeptideMap = HashMap<String, Peptide>;
