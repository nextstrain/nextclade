use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use crate::utils::any::AnyType;
use crate::{make_internal_error, o};
use eyre::Report;
use itertools::{chain, Itertools};
use schemars::JsonSchema;
use semver::Version;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::BTreeMap;
use std::ops::{Deref, DerefMut};

const INDEX_JSON_SCHEMA_VERSION_FROM: &str = "3.0.0";
const INDEX_JSON_SCHEMA_VERSION_TO: &str = "3.0.0";

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetsIndexJson {
  #[serde(rename = "$schema", default = "DatasetsIndexJson::default_schema")]
  #[schemars(skip)]
  pub schema: String,

  pub collections: Vec<DatasetCollection>,

  pub schema_version: String,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub minimizer_index: Vec<MinimizerIndexVersion>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetsIndexJson {
  fn default_schema() -> String {
    "https://raw.githubusercontent.com/nextstrain/nextclade/refs/heads/release/packages/nextclade-schemas/internal-index-json.schema.json".to_owned()
  }

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
  #[serde(rename = "$schema", default = "DatasetCollection::default_schema")]
  #[schemars(skip)]
  pub schema: String,

  pub meta: DatasetCollectionMeta,

  pub datasets: Vec<Dataset>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetCollection {
  fn default_schema() -> String {
    "https://raw.githubusercontent.com/nextstrain/nextclade/refs/heads/release/packages/nextclade-schemas/internal-dataset-collection-json.schema.json".to_owned()
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[schemars(title = "DatasetList")]
pub struct DatasetListJson(pub Vec<Dataset>);

impl Deref for DatasetListJson {
  type Target = Vec<Dataset>;

  fn deref(&self) -> &Self::Target {
    &self.0
  }
}

impl DerefMut for DatasetListJson {
  fn deref_mut(&mut self) -> &mut Self::Target {
    &mut self.0
  }
}

impl From<Vec<Dataset>> for DatasetListJson {
  fn from(datasets: Vec<Dataset>) -> Self {
    Self(datasets)
  }
}

impl FromIterator<Dataset> for DatasetListJson {
  fn from_iter<T: IntoIterator<Item = Dataset>>(iter: T) -> Self {
    Self(iter.into_iter().collect())
  }
}

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Dataset {
  #[serde(rename = "$schema", default = "Dataset::default_schema")]
  #[schemars(skip)]
  pub schema: String,

  pub path: String,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub shortcuts: Vec<String>,

  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub attributes: BTreeMap<String, AnyType>,

  #[serde(default, skip_serializing_if = "DatasetMeta::is_default")]
  pub meta: DatasetMeta,

  #[serde(default, skip_serializing_if = "DatasetFiles::is_default")]
  pub files: DatasetFiles,

  #[serde(default, skip_serializing_if = "DatasetCapabilities::is_default")]
  pub capabilities: DatasetCapabilities,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub versions: Vec<DatasetVersion>,

  #[serde(default, skip_serializing_if = "DatasetVersion::is_empty")]
  pub version: DatasetVersion,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub r#type: Option<DatasetType>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl Dataset {
  fn default_schema() -> String {
    "https://raw.githubusercontent.com/nextstrain/nextclade/refs/heads/release/packages/nextclade-schemas/internal-dataset-json.schema.json".to_owned()
  }

  pub fn name(&self) -> Option<&str> {
    self.attributes.get("name").and_then(AnyType::as_str_maybe)
  }

  pub fn shortcuts(&self) -> impl Iterator<Item = &str> {
    self.shortcuts.iter().map(String::as_str)
  }

  pub fn path_and_shortcuts(&self) -> impl Iterator<Item = &str> {
    chain!([self.path.as_str()], self.shortcuts())
  }

  pub fn search_strings(&self) -> impl Iterator<Item = &str> {
    let names = [
      Some(self.path.as_str()),
      self.name(),
      self.ref_name(),
      self.ref_accession(),
    ]
    .into_iter()
    .flatten();

    let shortcuts = self.shortcuts.iter().map(String::as_str);

    chain!(names, shortcuts)
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

  pub fn tag_latest(&self) -> &str {
    &self.version.tag
  }

  pub fn tags(&self) -> impl Iterator<Item = &str> {
    self.versions.iter().map(|ver| ver.tag.as_str())
  }

  pub fn resolve_tag(&self, tag: Option<&impl AsRef<str>>) -> String {
    match tag.map(AsRef::as_ref) {
      None | Some("latest") => &self.version.tag,
      Some(tag) => tag,
    }
    .to_owned()
  }

  pub fn file_path(&self, filename: impl AsRef<str>, tag: Option<&String>) -> String {
    [&self.path, &self.resolve_tag(tag), filename.as_ref()].iter().join("/")
  }

  pub fn file_path_latest(&self, filename: impl AsRef<str>) -> String {
    [&self.path, self.tag_latest(), filename.as_ref()].iter().join("/")
  }

  pub fn zip_path(&self, tag: Option<&String>) -> String {
    self.file_path("dataset.zip", tag)
  }

  pub fn is_cli_compatible(&self, cli_version: &Version, tag: impl AsRef<str>) -> Result<bool, Report> {
    let version = self.versions.iter().find(|version| version.tag == tag.as_ref());

    let version = match version {
      None => make_internal_error!("Dataset version tag is expected, but not found: '{}'", tag.as_ref()),
      Some(version) => Ok(version),
    }?;

    let is_compatible = match &version.compatibility {
      None => true,
      Some(compatibility) => compatibility.is_cli_compatible(cli_version),
    };

    Ok(is_compatible)
  }

  pub fn has_tag(&self, tag: impl AsRef<str>) -> bool {
    let tag = tag.as_ref();
    self.versions.iter().any(|version| {
      version.tag == tag
        || (version.tag == "unreleased" && tag == "latest")
        || (version.tag == "latest" && tag == "unreleased")
    })
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
    Some(self.cmp(other))
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
      .is_none_or(|min_cli_version| cli_version >= min_cli_version)
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

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub color: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub icon: Option<String>,

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
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub clades: Option<usize>,

  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub custom_clades: BTreeMap<String, usize>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub qc: Vec<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub primers: Option<bool>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub other: Vec<String>,

  #[serde(flatten)]
  pub rest: serde_json::Value,
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

#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetFiles {
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub reference: Option<String>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub pathogen_json: Option<String>,

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

impl DatasetFiles {
  #[inline]
  pub fn is_default(&self) -> bool {
    self == &Self::default()
  }
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

#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub enum DatasetType {
  Directory,
  AuspiceJson,
  Other,
}
