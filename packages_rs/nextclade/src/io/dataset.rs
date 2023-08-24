use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use eyre::Report;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

const COLLECTION_JSON_SCHEMA_VERSION_FROM: &str = "3.0.0";
const COLLECTION_JSON_SCHEMA_VERSION_TO: &str = "3.0.0";

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetsIndexJson {
  pub meta: DatasetCollectionMeta,

  pub datasets: Vec<Dataset>,

  pub updated_at: String,

  pub schema_version: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetsIndexJson {
  pub fn from_str(s: impl AsRef<str>) -> Result<Self, Report> {
    SchemaVersion::check_warn(
      &s,
      &SchemaVersionParams {
        name: "collection.json",
        ver_from: Some(COLLECTION_JSON_SCHEMA_VERSION_FROM),
        ver_to: Some(COLLECTION_JSON_SCHEMA_VERSION_TO),
      },
    );
    json_parse(s)
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Dataset {
  pub schema_version: String,

  pub path: String,

  pub url: String,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub deprecated: Option<bool>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub enabled: Option<bool>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub experimental: Option<bool>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub community: Option<bool>,

  pub attributes: DatasetAttributes,

  pub files: DatasetFiles,

  pub capabilities: DatasetCapabilities,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub versions: Vec<String>,

  pub updated_at: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl Dataset {
  pub fn is_compatible(&self, _nextclade_version: &str) -> bool {
    self.schema_version.as_str() >= COLLECTION_JSON_SCHEMA_VERSION_FROM
      && self.schema_version.as_str() <= COLLECTION_JSON_SCHEMA_VERSION_TO
  }

  pub fn is_deprecated(&self) -> bool {
    self.experimental.unwrap_or(false)
  }

  pub fn is_enabled(&self) -> bool {
    self.enabled.unwrap_or(false)
  }

  pub fn is_experimental(&self) -> bool {
    self.experimental.unwrap_or(false)
  }

  pub fn is_community(&self) -> bool {
    self.community.unwrap_or(false)
  }

  pub const fn is_latest(&self) -> bool {
    // FIXME: versioning no longer works this way
    true
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
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCapabilities {
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub qc: Vec<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub primers: Option<bool>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetFiles {
  pub reference: String,

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
  pub rest_files: BTreeMap<String, DatasetAttributeValue>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetAttributeValue {
  pub value: String,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub value_friendly: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub is_default: Option<bool>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetAttributeValue {
  pub fn is_default(&self) -> bool {
    self.is_default.unwrap_or(false)
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetAttributes {
  pub name: DatasetAttributeValue,

  pub reference: DatasetAttributeValue,

  #[serde(flatten, default, skip_serializing_if = "BTreeMap::is_empty")]
  pub rest_attrs: BTreeMap<String, DatasetAttributeValue>,

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
