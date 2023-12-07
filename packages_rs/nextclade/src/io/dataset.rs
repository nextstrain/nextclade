use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use crate::o;
use crate::utils::any::AnyType;
use eyre::Report;
use itertools::Itertools;
use schemars::JsonSchema;
use semver::Version;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::BTreeMap;

const INDEX_JSON_SCHEMA_VERSION_FROM: &str = "3.0.0";
const INDEX_JSON_SCHEMA_VERSION_TO: &str = "3.0.0";

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetsIndexJson {
  pub collections: Vec<DatasetCollection>,

  pub schema_version: String,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub minimizer_index: Vec<MinimizerIndexVersion>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetsIndexJson {
  pub fn from_str(s: impl AsRef<str>) -> Result<Self, Report> {
    SchemaVersion::check_warn(
      &s,
      &SchemaVersionParams {
        name: "index.json",
        ver_from: Some(INDEX_JSON_SCHEMA_VERSION_FROM),
        ver_to: Some(INDEX_JSON_SCHEMA_VERSION_TO),
      },
    );
    json_parse(s)
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCollection {
  pub meta: DatasetCollectionMeta,

  pub datasets: Vec<Dataset>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Dataset {
  pub path: String,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub shortcuts: Vec<String>,

  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub attributes: BTreeMap<String, AnyType>,

  #[serde(default, skip_serializing_if = "DatasetMeta::is_default")]
  pub meta: DatasetMeta,

  pub files: DatasetFiles,

  #[serde(default, skip_serializing_if = "DatasetCapabilities::is_default")]
  pub capabilities: DatasetCapabilities,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub versions: Vec<DatasetVersion>,

  #[serde(default, skip_serializing_if = "DatasetVersion::is_empty")]
  pub version: DatasetVersion,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl Dataset {
  pub fn name(&self) -> Option<&str> {
    self.attributes.get("name").and_then(AnyType::as_str_maybe)
  }

  pub fn ref_name(&self) -> Option<&str> {
    self.attributes.get("reference name").and_then(AnyType::as_str_maybe)
  }

  pub fn ref_accession(&self) -> Option<&str> {
    self
      .attributes
      .get("reference accession")
      .and_then(AnyType::as_str_maybe)
  }

  pub fn deprecated(&self) -> bool {
    self
      .attributes
      .get("deprecated")
      .and_then(AnyType::as_bool_maybe)
      .unwrap_or(false)
  }

  pub fn experimental(&self) -> bool {
    self
      .attributes
      .get("experimental")
      .and_then(AnyType::as_bool_maybe)
      .unwrap_or(false)
  }

  pub fn official(&self) -> bool {
    self.path.starts_with("nextstrain/")
  }

  pub fn tag(&self) -> &str {
    &self.version.tag
  }

  pub fn root_path(&self) -> String {
    [&self.path, &self.version.tag].iter().join("/")
  }

  pub fn file_path(&self, filename: impl AsRef<str>) -> String {
    [&self.root_path(), filename.as_ref()].iter().join("/")
  }

  pub fn is_cli_compatible(&self, cli_version: &Version) -> bool {
    self
      .version
      .compatibility
      .as_ref()
      .map_or(true, |compat| compat.is_cli_compatible(cli_version))
  }

  pub fn is_latest(&self) -> bool {
    if self.version.tag == "unreleased" || self.version.tag == "latest" {
      return true;
    }
    self.versions.iter().sorted().next() == Some(&self.version)
  }

  pub fn is_tag(&self, tag: impl AsRef<str>) -> bool {
    let tag = tag.as_ref();
    self.version.tag == tag
      || (self.version.tag == "unreleased" && tag == "latest")
      || (self.version.tag == "latest" && tag == "unreleased")
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetVersion {
  pub tag: String,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub updated_at: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub compatibility: Option<DatasetCompatibility>,
}

impl Eq for DatasetVersion {}

impl PartialEq<Self> for DatasetVersion {
  fn eq(&self, other: &Self) -> bool {
    (self.tag).eq(&other.tag)
  }
}

impl Ord for DatasetVersion {
  fn cmp(&self, other: &Self) -> Ordering {
    (self.tag).cmp(&other.tag)
  }
}

impl PartialOrd<Self> for DatasetVersion {
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    (self.tag).partial_cmp(&other.tag)
  }
}

impl DatasetVersion {
  pub fn is_empty(&self) -> bool {
    self == &Self::default()
  }
}

impl Default for DatasetVersion {
  fn default() -> Self {
    Self {
      tag: o!("unreleased"),
      updated_at: None,
      compatibility: None,
    }
  }
}

#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCompatibility {
  #[serde(default, skip_serializing_if = "Option::is_none")]
  #[schemars(with = "String")]
  pub cli: Option<Version>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  #[schemars(with = "String")]
  pub web: Option<Version>,
}

impl DatasetCompatibility {
  pub fn is_cli_compatible(&self, cli_version: &Version) -> bool {
    self
      .cli
      .as_ref()
      .map_or(true, |min_cli_version| cli_version >= min_cli_version)
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCollectionMeta {
  pub id: String,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub title: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub maintainers: Vec<DatasetCollectionUrl>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub urls: Vec<DatasetCollectionUrl>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[allow(clippy::struct_excessive_bools)]
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCapabilities {
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub qc: Vec<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub primers: Option<bool>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetCapabilities {
  #[inline]
  pub fn is_default(&self) -> bool {
    self == &Self::default()
  }
}

#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetMeta {
  #[serde(rename = "source code", default, skip_serializing_if = "Option::is_none")]
  pub source_code: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub bugs: Option<String>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub authors: Vec<String>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetMeta {
  #[inline]
  pub fn is_default(&self) -> bool {
    self == &Self::default()
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetFiles {
  pub reference: String,

  pub pathogen_json: String,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub genome_annotation: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub tree_json: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub examples: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub readme: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub changelog: Option<String>,

  #[serde(flatten, default, skip_serializing_if = "BTreeMap::is_empty")]
  pub rest_files: BTreeMap<String, String>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCollectionUrl {
  pub name: String,

  pub url: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerIndexVersion {
  pub version: String,
  pub path: String,
  #[serde(flatten)]
  pub other: serde_json::Value,
}
