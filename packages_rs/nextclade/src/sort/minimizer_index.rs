use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use eyre::Report;
use schemars::JsonSchema;
use serde::ser::SerializeMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::BTreeMap;
use std::str::FromStr;

pub const MINIMIZER_INDEX_SCHEMA_VERSION_FROM: &str = "3.0.0";
pub const MINIMIZER_INDEX_SCHEMA_VERSION_TO: &str = "3.0.0";
pub const MINIMIZER_INDEX_ALGO_VERSION: &str = "1";

/// Contains external configuration and data specific for a particular pathogen
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerIndexJson {
  #[serde(rename = "schemaVersion")]
  pub schema_version: String,

  pub version: String,

  pub params: MinimizerParams,

  #[schemars(with = "BTreeMap<String, String>")]
  #[serde(serialize_with = "serde_serialize_minimizers")]
  #[serde(deserialize_with = "serde_deserialize_minimizers")]
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub minimizers: BTreeMap<usize, String>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub references: Vec<MinimizerIndexRefInfo>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub normalization: Vec<f64>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// Serde serializer for Letter sequences
pub fn serde_serialize_minimizers<S: Serializer>(
  minimizers: &BTreeMap<usize, String>,
  s: S,
) -> Result<S::Ok, S::Error> {
  let mut map = s.serialize_map(Some(minimizers.len()))?;
  for (k, v) in minimizers {
    map.serialize_entry(&k.to_string(), &v.to_string())?;
  }
  map.end()
}

/// Serde deserializer for Letter sequences
pub fn serde_deserialize_minimizers<'de, D: Deserializer<'de>>(
  deserializer: D,
) -> Result<BTreeMap<usize, String>, D::Error> {
  let map = BTreeMap::<String, String>::deserialize(deserializer)?;

  let res = map
    .into_iter()
    .map(|(k, v)| Ok((usize::from_str(&k)?, v)))
    .collect::<Result<BTreeMap<usize, String>, Report>>()
    .unwrap();

  Ok(res)
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerParams {
  pub k: i64,

  pub cutoff: i64,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerIndexRefInfo {
  pub length: i64,
  pub name: String,
  pub n_minimizers: i64,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl MinimizerIndexJson {
  pub fn from_str(s: impl AsRef<str>) -> Result<Self, Report> {
    let s = s.as_ref();

    SchemaVersion::check_warn(
      s,
      &SchemaVersionParams {
        name: "minimizer_index.json",
        ver_from: Some(MINIMIZER_INDEX_SCHEMA_VERSION_FROM),
        ver_to: Some(MINIMIZER_INDEX_SCHEMA_VERSION_TO),
      },
    );

    json_parse(s)
  }
}
