use derive_more::Display;
use eyre::{eyre, Report};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Display, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum AnyType {
  String(String),
  Int(isize),
  Float(f64),
  Bool(bool),
  Other(serde_json::Value),
}

impl AnyType {
  pub fn as_str_maybe(&self) -> Option<&str> {
    match &self {
      AnyType::String(x) => Some(x),
      _ => None,
    }
  }

  pub const fn as_int_maybe(&self) -> Option<isize> {
    match &self {
      AnyType::Int(x) => Some(*x),
      _ => None,
    }
  }

  pub const fn as_float_maybe(&self) -> Option<f64> {
    match &self {
      AnyType::Float(x) => Some(*x),
      _ => None,
    }
  }

  pub const fn as_bool_maybe(&self) -> Option<bool> {
    match &self {
      AnyType::Bool(x) => Some(*x),
      _ => None,
    }
  }

  pub fn as_str(&self) -> Result<&str, Report> {
    self.as_str_maybe().ok_or(eyre!("Cannot parse value as str"))
  }

  pub fn as_int(&self) -> Result<isize, Report> {
    self.as_int_maybe().ok_or(eyre!("Cannot parse value as int"))
  }

  pub fn as_float(&self) -> Result<f64, Report> {
    self.as_float_maybe().ok_or(eyre!("Cannot parse value as float"))
  }

  pub fn as_bool(&self) -> Result<bool, Report> {
    self.as_bool_maybe().ok_or(eyre!("Cannot parse value as bool"))
  }
}
