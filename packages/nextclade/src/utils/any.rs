#![allow(non_snake_case, clippy::missing_const_for_fn)]
use crate::make_error;
use eyre::{Report, eyre};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fmt::{Display, Formatter};
use std::str::FromStr;

/// Any type that can be represented in JSON
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(transparent)]
pub struct AnyType(pub Value);

#[allow(clippy::map_err_ignore)]
impl Display for AnyType {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    write!(f, "{}", self.0)
  }
}

impl AnyType {
  pub fn String(s: String) -> Self {
    AnyType(Value::String(s))
  }

  pub fn Int(i: isize) -> Self {
    AnyType(Value::Number((i as i64).into()))
  }

  pub fn Float(f: f64) -> Self {
    AnyType(Value::Number(
      serde_json::Number::from_f64(f).unwrap_or_else(|| 0.into()),
    ))
  }

  pub fn Bool(b: bool) -> Self {
    AnyType(Value::Bool(b))
  }

  pub fn Array(arr: Vec<AnyType>) -> Self {
    AnyType(Value::Array(arr.into_iter().map(|a| a.0).collect()))
  }

  pub fn Object(obj: BTreeMap<String, AnyType>) -> Self {
    AnyType(Value::Object(obj.into_iter().map(|(k, v)| (k, v.0)).collect()))
  }

  pub const fn Null() -> Self {
    AnyType(Value::Null)
  }

  // Existing methods
  pub fn as_str_maybe(&self) -> Option<&str> {
    self.0.as_str()
  }

  pub fn as_int_maybe(&self) -> Option<isize> {
    self.0.as_i64().map(|x| x as isize)
  }

  pub fn as_float_maybe(&self) -> Option<f64> {
    self.0.as_f64()
  }

  pub fn as_bool_maybe(&self) -> Option<bool> {
    self.0.as_bool()
  }

  pub fn as_str(&self) -> Result<&str, Report> {
    self.as_str_maybe().ok_or_else(|| eyre!("Cannot parse value as str"))
  }

  pub fn as_int(&self) -> Result<isize, Report> {
    self.as_int_maybe().ok_or_else(|| eyre!("Cannot parse value as int"))
  }

  pub fn as_float(&self) -> Result<f64, Report> {
    self
      .as_float_maybe()
      .ok_or_else(|| eyre!("Cannot parse value as float"))
  }

  pub fn as_bool(&self) -> Result<bool, Report> {
    self.as_bool_maybe().ok_or_else(|| eyre!("Cannot parse value as bool"))
  }
}

impl FromStr for AnyType {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let value: Value = match serde_json::from_str(s) {
      Ok(v) => v,
      Err(err) => return make_error!("Failed to parse JSON: {err}"),
    };

    Ok(AnyType(value))
  }
}
