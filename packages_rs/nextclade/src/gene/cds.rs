use crate::gene::gene::GeneStrand;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Cds {
  pub name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub attributes: MultiMap<String, String>,
}
