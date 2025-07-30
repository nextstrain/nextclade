use crate::io::json::{json_stringify, JsonPretty};
use crate::make_error;
use eyre::{eyre, Report};
use ordered_float::OrderedFloat;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::BTreeMap;
use std::fmt::{Display, Formatter};
use std::str::FromStr;

/// Any type that can be represented in JSON
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum AnyType {
  #[schemars(title = "string")]
  String(String),
  #[schemars(title = "int")]
  Int(isize),
  #[schemars(title = "float")]
  Float(OrderedFloat<f64>),
  #[schemars(title = "bool")]
  Bool(bool),
  #[schemars(title = "array")]
  Array(Vec<AnyType>),
  #[schemars(title = "object")]
  Object(BTreeMap<String, AnyType>),
  #[schemars(title = "null")]
  Null,
}

#[allow(clippy::map_err_ignore)]
impl Display for AnyType {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    let s = match self {
      AnyType::String(x) => x.clone(),
      AnyType::Int(x) => x.to_string(),
      AnyType::Float(x) => x.to_string(),
      AnyType::Bool(x) => x.to_string(),
      AnyType::Array(x) => json_stringify(&x, JsonPretty(false)).map_err(|_| std::fmt::Error)?,
      AnyType::Object(x) => json_stringify(&x, JsonPretty(false)).map_err(|_| std::fmt::Error)?,
      AnyType::Null => "null".to_owned(),
    };
    write!(f, "{s}")
  }
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
      AnyType::Float(x) => Some(x.0),
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

impl FromStr for AnyType {
  type Err = Report;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    let value: Value = match serde_json::from_str(s) {
      Ok(v) => v,
      Err(err) => return make_error!("Failed to parse JSON: {err}"),
    };

    match value {
      Value::String(s) => Ok(AnyType::String(s)),
      Value::Number(n) => {
        if let Some(int_val) = n.as_i64() {
          Ok(AnyType::Int(int_val as isize))
        } else {
          Ok(AnyType::Float(OrderedFloat(n.as_f64().unwrap())))
        }
      }
      Value::Bool(b) => Ok(AnyType::Bool(b)),
      Value::Array(arr) => {
        let mut parsed_array = Vec::new();
        for val in arr {
          parsed_array.push(AnyType::from_str(&val.to_string())?);
        }
        Ok(AnyType::Array(parsed_array))
      }
      Value::Object(obj) => {
        let mut parsed_object = BTreeMap::new();
        for (key, val) in obj {
          parsed_object.insert(key, AnyType::from_str(&val.to_string())?);
        }
        Ok(AnyType::Object(parsed_object))
      }
      Value::Null => Ok(AnyType::Null),
    }
  }
}
