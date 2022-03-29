use crate::analyze::nuc_sub::NucSub;
use crate::io::letter::Letter;
use crate::make_error;
use eyre::Report;
use lazy_static::lazy_static;
use serde::{Deserialize, Serialize};
use std::str::FromStr;

#[derive(Clone, Debug, Serialize, Deserialize)]
pub struct NucDel {
  pub start: usize,
  pub length: usize,
}
