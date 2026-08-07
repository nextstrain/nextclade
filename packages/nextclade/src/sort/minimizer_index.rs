use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use eyre::{Report, WrapErr};
use log::warn;
use schemars::JsonSchema;
use semver::Version;
use serde::ser::SerializeMap;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::collections::BTreeMap;
use std::path::Path;
use std::str::FromStr;

const MINIMIZER_INDEX_SCHEMA_VERSION_FROM: Version = Version::new(3, 0, 0);
const MINIMIZER_INDEX_SCHEMA_VERSION_TO: Version = Version::new(3, 0, 0);
pub const MINIMIZER_INDEX_ALGO_VERSION: u64 = 1;

pub type MinimizerMap = BTreeMap<u32, Vec<usize>>;

/// Contains external configuration and data specific for a particular pathogen
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerIndexJson {
  #[serde(rename = "$schema", default = "MinimizerIndexJson::default_schema")]
  #[schemars(skip)]
  pub schema: String,

  #[serde(rename = "schemaVersion")]
  pub schema_version: String,

  pub version: String,

  pub params: MinimizerIndexParams,

  #[schemars(with = "BTreeMap<String, Vec<usize>>")]
  #[serde(serialize_with = "serde_serialize_minimizers")]
  #[serde(deserialize_with = "serde_deserialize_minimizers")]
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub minimizers: MinimizerMap,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub references: Vec<MinimizerIndexRefInfo>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub normalization: Vec<f64>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

pub fn serde_serialize_minimizers<S: Serializer>(minimizers: &MinimizerMap, s: S) -> Result<S::Ok, S::Error> {
  let mut map = s.serialize_map(Some(minimizers.len()))?;
  for (k, v) in minimizers {
    map.serialize_entry(&k.to_string(), &v)?;
  }
  map.end()
}

pub fn serde_deserialize_minimizers<'de, D: Deserializer<'de>>(deserializer: D) -> Result<MinimizerMap, D::Error> {
  let map = BTreeMap::<String, Vec<usize>>::deserialize(deserializer)?;

  let res = map
    .into_iter()
    .map(|(k, v)| Ok((u32::from_str(&k)?, v)))
    .collect::<Result<MinimizerMap, Report>>()
    .map_err(serde::de::Error::custom)?;

  Ok(res)
}

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerIndexParams {
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

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct VersionCheck {
  pub version: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

pub fn check_algo_version(version: &str) -> Result<bool, Report> {
  let data_version = u64::from_str(version).wrap_err_with(|| format!("Invalid minimizer index version: {version}"))?;
  Ok(data_version > MINIMIZER_INDEX_ALGO_VERSION)
}

impl MinimizerIndexJson {
  fn default_schema() -> String {
    "https://raw.githubusercontent.com/nextstrain/nextclade/refs/heads/release/packages/nextclade-schemas/internal-minimizer-index-json.schema.json".to_owned()
  }

  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let data = read_file_to_string(filepath)
      .wrap_err_with(|| format!("When reading minimizer index file: {}", filepath.display()))?;
    Self::from_str(data)
  }

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

    let VersionCheck { version, .. } = json_parse(s)?;
    if check_algo_version(&version)? {
      warn!(
        "Version of the minimizer index data ({version}) is greater than maximum supported by this version of Nextclade ({MINIMIZER_INDEX_ALGO_VERSION}). This may lead to errors or incorrect results. Please try to update your version of Nextclade and/or contact dataset maintainers for more details."
      );
    }

    json_parse(s).wrap_err("When parsing minimizer index")
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::equal(           "1",  false)]
  #[case::below(           "0",  false)]
  #[case::above(           "2",  true)]
  #[case::multi_digit(     "10", true)]
  #[case::large(           "99", true)]
  #[trace]
  fn test_minimizer_index_check_algo_version(#[case] version: &str, #[case] expect_above_max: bool) {
    let result = check_algo_version(version).unwrap();
    assert_eq!(expect_above_max, result, "version={version}");
  }

  #[test]
  fn test_minimizer_index_check_algo_version_rejects_non_numeric() {
    drop(check_algo_version("abc").unwrap_err());
  }

  #[test]
  fn test_minimizer_index_multi_digit_not_lexicographic() {
    // "10" < "2" lexicographically, but 10 > 2 numerically.
    // With MINIMIZER_INDEX_ALGO_VERSION = "1", version "10" must be detected as above max.
    assert!(check_algo_version("10").unwrap());
  }
}
