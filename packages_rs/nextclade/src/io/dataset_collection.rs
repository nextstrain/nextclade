use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;

const COLLECTION_JSON_SCHEMA_VERSION_FROM: &str = "3.0.0";
const COLLECTION_JSON_SCHEMA_VERSION_TO: &str = "3.0.0";

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCollection {
  pub meta: DatasetCollectionMeta,

  pub datasets: Vec<DatasetInfo>,

  pub updated_at: String,

  pub schema_version: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetCollection {
  pub fn from_str(s: impl AsRef<str>) {
    SchemaVersion::check_warn(
      s,
      &SchemaVersionParams {
        name: "collection.json",
        ver_from: Some(COLLECTION_JSON_SCHEMA_VERSION_FROM),
        ver_to: Some(COLLECTION_JSON_SCHEMA_VERSION_TO),
      },
    );
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetInfo {
  pub path: String,

  pub url: String,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub deprecated: Option<bool>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub enabled: Option<bool>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub experimental: Option<bool>,

  pub attributes: DatasetAttributes,

  pub capabilities: DatasetCapabilities,

  pub updated_at: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
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
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub examples: Option<bool>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub genome_annotation: Option<bool>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub tree: Option<bool>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub qc: Vec<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub primers: Option<bool>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetAttributeValue {
  pub value: String,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub value_friendly: Option<String>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetAttributes {
  pub name: DatasetAttributeValue,

  pub reference: DatasetAttributeValue,

  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  #[serde(flatten)]
  extra: BTreeMap<String, DatasetAttributeValue>,

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
