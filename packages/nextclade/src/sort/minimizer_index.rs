use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use crate::make_error;
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

pub type MinimizerMap = BTreeMap<u64, Vec<usize>>;

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
    .map(|(k, v)| Ok((u64::from_str(&k)?, v)))
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

  /// Deprecated: prefer `expected_minimizer_hits`. Retained as the integer score denominator for older
  /// clients. For indexes that provide both fields it is the rounded `expected_minimizer_hits`; older
  /// indexes instead carry the literal count of stored minimizers.
  #[deprecated(note = "use `expected_minimizer_hits`; retained for backward compatibility with older indexes")]
  pub n_minimizers: i64,

  /// Exact fractional expected number of minimizer hits from a single reference. Preferred as the score
  /// denominator when present; absent in older indexes, which fall back to `n_minimizers`.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub expected_minimizer_hits: Option<f64>,

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

    let index: Self = json_parse(s).wrap_err("When parsing minimizer index")?;
    index.validate()?;
    Ok(index)
  }

  /// Reject a malformed minimizer index before it reaches scoring. The index is external data (fetched
  /// from a dataset server or supplied via `--input-minimizer-index-json`), so its numeric fields carry
  /// no type-level guarantees: a negative `k`/`cutoff` casts to a huge unsigned value, and a
  /// non-positive or non-finite denominator produces `inf`/`NaN` scores that silently win or vanish from
  /// dataset selection. Fail loudly instead.
  fn validate(&self) -> Result<(), Report> {
    if self.params.k <= 0 {
      return make_error!(
        "Minimizer index parameter `k` must be positive, but found {}",
        self.params.k
      );
    }
    if !(0 < self.params.cutoff && self.params.cutoff <= (1_i64 << 32)) {
      return make_error!(
        "Minimizer index parameter `cutoff` must be in (0, 2^32], but found {}",
        self.params.cutoff
      );
    }
    for reference in &self.references {
      if reference.length <= 0 {
        return make_error!(
          "Minimizer index reference '{}' has non-positive length {}",
          reference.name,
          reference.length
        );
      }
      #[allow(deprecated)] // reads the fallback denominator to validate it, same precedence as scoring
      let denominator = reference
        .expected_minimizer_hits
        .unwrap_or(reference.n_minimizers as f64);
      if !denominator.is_finite() || denominator <= 0.0 {
        return make_error!(
          "Minimizer index reference '{}' has a non-positive or non-finite score denominator ({denominator})",
          reference.name
        );
      }
    }
    Ok(())
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  // Minimal minimizer index JSON with one reference. `expected` is spliced verbatim (e.g.
  // `,"expectedMinimizerHits":436.4375` or empty) so both presence and absence can be tested.
  fn index_json(k: i64, cutoff: i64, length: i64, n_minimizers: i64, expected: &str) -> String {
    format!(
      r#"{{"schemaVersion":"3.0.0","version":"1","params":{{"k":{k},"cutoff":{cutoff}}},"references":[{{"length":{length},"name":"ds","nMinimizers":{n_minimizers}{expected}}}]}}"#
    )
  }

  #[test]
  fn test_minimizer_index_deserializes_expected_minimizer_hits() {
    let idx = MinimizerIndexJson::from_str(index_json(
      17,
      1 << 28,
      7000,
      436,
      r#","expectedMinimizerHits":436.4375"#,
    ))
    .unwrap();
    assert_eq!(Some(436.4375), idx.references[0].expected_minimizer_hits);
  }

  #[test]
  fn test_minimizer_index_absent_expected_minimizer_hits_deserializes_to_none() {
    let idx = MinimizerIndexJson::from_str(index_json(17, 1 << 28, 7000, 436, "")).unwrap();
    assert_eq!(None, idx.references[0].expected_minimizer_hits);
    // the camelCase key did not silently land in the flatten catch-all
    assert!(idx.references[0].other.get("expectedMinimizerHits").is_none());
  }

  #[test]
  fn test_minimizer_index_roundtrip_omits_none_expected_minimizer_hits() {
    let idx = MinimizerIndexJson::from_str(index_json(17, 1 << 28, 7000, 436, "")).unwrap();
    let serialized = serde_json::to_string(&idx).unwrap();
    assert!(!serialized.contains("expectedMinimizerHits"));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::valid(                 index_json(17, 1 << 28,  7000, 436, r#","expectedMinimizerHits":436.4375"#), true)]
  #[case::valid_int_fallback(    index_json(17, 1 << 28,  7000, 436, ""),                                     true)]
  #[case::negative_k(            index_json(-1, 1 << 28,  7000, 436, ""),                                     false)]
  #[case::zero_k(                index_json(0,  1 << 28,  7000, 436, ""),                                     false)]
  #[case::negative_cutoff(       index_json(17, -1,       7000, 436, ""),                                     false)]
  #[case::zero_cutoff(           index_json(17, 0,        7000, 436, ""),                                     false)]
  #[case::zero_length(           index_json(17, 1 << 28,  0,    436, ""),                                     false)]
  #[case::zero_denominator(      index_json(17, 1 << 28,  7000, 0,   ""),                                     false)]
  #[case::negative_expected(     index_json(17, 1 << 28,  7000, 436, r#","expectedMinimizerHits":-1.0"#),     false)]
  #[case::zero_expected(         index_json(17, 1 << 28,  7000, 436, r#","expectedMinimizerHits":0.0"#),      false)]
  #[trace]
  fn test_minimizer_index_validate(#[case] json: String, #[case] ok: bool) {
    assert_eq!(ok, MinimizerIndexJson::from_str(&json).is_ok(), "for: {json}");
  }

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
