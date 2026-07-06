use crate::io::json::json_parse;
use crate::make_error;
use crate::utils::error::report_to_string;
use eyre::Report;
use log::warn;
use semver::Version;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaVersion {
  #[serde(with = "semver_string")]
  pub schema_version: Version,
}

pub struct SchemaVersionParams {
  pub name: &'static str,
  pub ver_from: Option<Version>,
  pub ver_to: Option<Version>,
}

mod semver_string {
  use semver::Version;
  use serde::{Deserialize, Deserializer, Serializer};

  pub fn serialize<S: Serializer>(version: &Version, serializer: S) -> Result<S::Ok, S::Error> {
    serializer.serialize_str(&version.to_string())
  }

  pub fn deserialize<'de, D: Deserializer<'de>>(deserializer: D) -> Result<Version, D::Error> {
    let s = String::deserialize(deserializer)?;
    Version::parse(&s).map_err(serde::de::Error::custom)
  }
}

impl SchemaVersion {
  /// Parse JSON file and check `schemaVersion` field against provided max version, and return an error if not compatible.
  pub fn check_err(
    json_str: impl AsRef<str>,
    SchemaVersionParams { name, ver_from, ver_to }: &SchemaVersionParams,
  ) -> Result<SchemaVersion, Report> {
    let sv: SchemaVersion = json_parse(json_str)?;

    if let Some(ver_to) = ver_to {
      if sv.schema_version > *ver_to {
        return make_error!(
          "The format version of '{}' file (schemaVersion={}) is newer than maximum version supported by this version of Nextclade (schemaVersion={}). This likely means that there are newer versions of Nextclade available which support this new format. In case of issues, please upgrade Nextclade to avoid incompatibility and to receive the latest features and bug fixes. Alternatively, you might try to use earlier versions of the dataset (not recommended).",
          name,
          sv.schema_version,
          ver_to
        );
      }
    }

    if let Some(ver_from) = ver_from {
      if sv.schema_version < *ver_from {
        return make_error!(
          "The format version of '{}' file (schemaVersion={}) is older than minimum version supported by this version of Nextclade (schemaVersion={}). This likely means that this version of Nextclade will have problems reading and understanding this file. In case of issues, please upgrade the dataset to avoid incompatibility and to receive the latest features and bug fixes. Alternatively, you might try to use earlier versions of Nextclade (not recommended).",
          name,
          sv.schema_version,
          ver_from
        );
      }
    }

    Ok(sv)
  }

  /// Parse JSON file and check `schemaVersion` field against provided max version, and print a warning if not compatible.
  pub fn check_warn(json_str: impl AsRef<str>, params: &SchemaVersionParams) {
    if let Err(report) = Self::check_err(json_str, params) {
      warn!("{}", report_to_string(&report));
    }
  }
}

#[cfg(test)]
mod tests {
  use super::*;
  use rstest::rstest;

  fn json_with_version(ver: &str) -> String {
    format!(r#"{{"schemaVersion": "{ver}"}}"#)
  }

  fn params(name: &'static str, ver_from: Option<Version>, ver_to: Option<Version>) -> SchemaVersionParams {
    SchemaVersionParams { name, ver_from, ver_to }
  }

  fn ver(s: &str) -> Version {
    Version::parse(s).unwrap()
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::equal_to_max(          "3.0.0",  Some("3.0.0"),  true)]
  #[case::below_max(             "2.9.0",  Some("3.0.0"),  true)]
  #[case::above_max(             "4.0.0",  Some("3.0.0"),  false)]
  #[case::multi_digit_below_max( "3.9.0",  Some("3.10.0"), true)]
  #[case::multi_digit_above_max( "3.10.0", Some("3.9.0"),  false)]
  #[case::no_max(                "99.0.0", None,           true)]
  #[trace]
  fn test_schema_version_check_err_upper_bound(
    #[case] version: &str,
    #[case] ver_to: Option<&str>,
    #[case] expect_ok: bool,
  ) {
    let json = json_with_version(version);
    let p = params("test.json", None, ver_to.map(ver));
    let result = SchemaVersion::check_err(&json, &p);
    assert_eq!(expect_ok, result.is_ok(), "version={version}, ver_to={ver_to:?}, result={result:?}");
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::equal_to_min(          "3.0.0",  Some("3.0.0"),  true)]
  #[case::above_min(             "4.0.0",  Some("3.0.0"),  true)]
  #[case::below_min(             "2.0.0",  Some("3.0.0"),  false)]
  #[case::multi_digit_above_min( "3.10.0", Some("3.9.0"),  true)]
  #[case::multi_digit_below_min( "3.9.0",  Some("3.10.0"), false)]
  #[case::no_min(                "0.0.1",  None,           true)]
  #[trace]
  fn test_schema_version_check_err_lower_bound(
    #[case] version: &str,
    #[case] ver_from: Option<&str>,
    #[case] expect_ok: bool,
  ) {
    let json = json_with_version(version);
    let p = params("test.json", ver_from.map(ver), None);
    let result = SchemaVersion::check_err(&json, &p);
    assert_eq!(expect_ok, result.is_ok(), "version={version}, ver_from={ver_from:?}, result={result:?}");
  }
}
