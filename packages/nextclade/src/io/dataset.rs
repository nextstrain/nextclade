use crate::analyze::virus_properties::DatasetMaintenance;
use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use crate::utils::any::AnyType;
use crate::{make_internal_error, o, vec_of_owned};
use eyre::Report;
use itertools::{Itertools, chain};
use schemars::JsonSchema;
use semver::Version;
use serde::{Deserialize, Serialize};
use std::cmp::Ordering;
use std::collections::BTreeMap;
use std::ops::{Deref, DerefMut};

/// Dataset metadata attributes with recognized keys and extensibility
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
pub struct DatasetAttributes {
  /// Human-readable dataset name
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub name: Option<String>,

  /// Name of the reference sequence
  #[serde(rename = "reference name", default, skip_serializing_if = "Option::is_none")]
  pub reference_name: Option<String>,

  /// Accession number of the reference sequence
  #[serde(rename = "reference accession", default, skip_serializing_if = "Option::is_none")]
  pub reference_accession: Option<String>,

  /// If true, dataset is deprecated and excluded from listings by default.
  /// Authors mark a dataset as deprecated to indicate it will no longer be updated or supported.
  /// Use `--include-deprecated` CLI flag to show deprecated datasets.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub deprecated: Option<bool>,

  /// If true, dataset is experimental and excluded with `--no-experimental` CLI flag.
  /// Authors mark a dataset as experimental when development is still in progress,
  /// or if the dataset is incomplete or of lower quality than usual. Use at own risk.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub experimental: Option<bool>,

  /// Additional custom attributes
  #[serde(flatten)]
  pub other: BTreeMap<String, AnyType>,
}

impl DatasetAttributes {
  pub fn is_default(&self) -> bool {
    self == &Self::default()
  }

  /// Iterate over all attributes as (key, value) pairs for display
  pub fn iter(&self) -> impl Iterator<Item = (&str, String)> {
    let typed = [
      self.name.as_ref().map(|v| ("name", v.clone())),
      self.reference_name.as_ref().map(|v| ("reference name", v.clone())),
      self.reference_accession.as_ref().map(|v| ("reference accession", v.clone())),
      self.deprecated.map(|v| ("deprecated", v.to_string())),
      self.experimental.map(|v| ("experimental", v.to_string())),
    ]
    .into_iter()
    .flatten();

    let other = self.other.iter().map(|(k, v)| (k.as_str(), v.to_string()));

    chain!(typed, other)
  }
}

const INDEX_JSON_SCHEMA_VERSION_FROM: &str = "3.0.0";
const INDEX_JSON_SCHEMA_VERSION_TO: &str = "3.0.0";

/// Top-level dataset index file (index.json). Contains all dataset collections served by a dataset server.
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetsIndexJson {
  #[serde(rename = "$schema", default = "DatasetsIndexJson::default_schema")]
  #[schemars(skip)]
  pub schema: String,

  /// Dataset collections available on this server
  pub collections: Vec<DatasetCollection>,

  /// Schema version for this index file format
  pub schema_version: String,

  /// Minimizer index versions available for dataset auto-detection
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

/// A named group of datasets from a single maintainer (e.g. "nextstrain", "community").
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCollection {
  #[serde(rename = "$schema", default = "DatasetCollection::default_schema")]
  #[schemars(skip)]
  pub schema: String,

  /// Collection metadata: identifier, display name, maintainer contact information
  pub meta: DatasetCollectionMeta,

  /// Datasets belonging to this collection
  pub datasets: Vec<Dataset>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl DatasetCollection {
  fn default_schema() -> String {
    "https://raw.githubusercontent.com/nextstrain/nextclade/refs/heads/release/packages/nextclade-schemas/internal-dataset-collection-json.schema.json".to_owned()
  }
}

/// Flat list of datasets returned by the `dataset list` CLI command.
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

/// A single Nextclade dataset providing reference data and configuration for one pathogen.
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[schemars(example = "Dataset::example")]
#[serde(rename_all = "camelCase")]
pub struct Dataset {
  #[serde(rename = "$schema", default = "Dataset::default_schema")]
  #[schemars(skip)]
  pub schema: String,

  /// Unique path-like identifier (e.g. "nextstrain/sars-cov-2/wuhan-hu-1/orfs")
  pub path: String,

  /// Short alias names for this dataset (e.g. "sars-cov-2", "rsv_a")
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub shortcuts: Vec<String>,

  /// Dataset attributes: name, reference info, status flags
  #[serde(default, skip_serializing_if = "DatasetAttributes::is_default")]
  pub attributes: DatasetAttributes,

  /// Dataset-level metadata: source code URL, bug tracker, authors
  #[serde(default, skip_serializing_if = "DatasetMeta::is_default")]
  pub meta: DatasetMeta,

  /// Filenames of dataset components (reference, annotation, tree, etc.)
  #[serde(default, skip_serializing_if = "DatasetFiles::is_default")]
  pub files: DatasetFiles,

  /// Advertised analysis capabilities: clade counts, QC rules, primer support
  #[serde(default, skip_serializing_if = "DatasetCapabilities::is_default")]
  pub capabilities: DatasetCapabilities,

  /// All available tagged releases, ordered newest-first
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub versions: Vec<DatasetVersion>,

  /// The latest (default) version of this dataset
  #[serde(default, skip_serializing_if = "DatasetVersion::is_empty")]
  pub version: DatasetVersion,

  /// Whether the dataset is a directory-based dataset or an Auspice JSON
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub r#type: Option<DatasetType>,

  /// Maintainer and support information for this dataset
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub maintenance: Option<DatasetMaintenance>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl Dataset {
  fn default_schema() -> String {
    "https://raw.githubusercontent.com/nextstrain/nextclade/refs/heads/release/packages/nextclade-schemas/internal-dataset-json.schema.json".to_owned()
  }

  pub fn name(&self) -> Option<&str> {
    self.attributes.name.as_deref()
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
    self.attributes.reference_name.as_deref()
  }

  pub fn ref_accession(&self) -> Option<&str> {
    self.attributes.reference_accession.as_deref()
  }

  pub fn deprecated(&self) -> bool {
    self.attributes.deprecated.unwrap_or(false)
  }

  pub fn experimental(&self) -> bool {
    self.attributes.experimental.unwrap_or(false)
  }

  pub fn is_community(&self) -> bool {
    self.path.starts_with("community/")
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

  pub fn example() -> Self {
    Self {
      schema: Self::default_schema(),
      path: o!("nextstrain/rsv/a/EPI_ISL_412866"),
      shortcuts: vec_of_owned!["rsv_a", "nextstrain/rsv/a"],
      attributes: BTreeMap::from([
        (o!("name"), AnyType::String(o!("RSV-A"))),
        (o!("reference accession"), AnyType::String(o!("EPI_ISL_412866"))),
        (o!("reference name"), AnyType::String(o!("hRSV/A/England/397/2017"))),
      ]),
      meta: DatasetMeta::default(),
      files: DatasetFiles::example(),
      capabilities: DatasetCapabilities::default(),
      versions: vec![DatasetVersion::example()],
      version: DatasetVersion::example(),
      r#type: None,
      maintenance: None,
      other: serde_json::Value::default(),
    }
  }
}

/// A tagged release of a dataset, identified by a timestamp tag.
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[schemars(example = "DatasetVersion::example")]
#[serde(rename_all = "camelCase")]
pub struct DatasetVersion {
  /// Version identifier in timestamp format (e.g. "2026-01-06--14-59-32Z")
  pub tag: String,

  /// ISO 8601 timestamp of when this version was published
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub updated_at: Option<String>,

  /// Minimum CLI/web versions required to use this dataset version
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

  pub fn example() -> Self {
    Self {
      tag: o!("2026-01-06--14-59-32Z"),
      updated_at: Some(o!("2026-01-06T14:59:32Z")),
      compatibility: Some(DatasetCompatibility {
        cli: Some(Version::new(3, 0, 0)),
        web: Some(Version::new(3, 0, 0)),
      }),
    }
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

/// Minimum application versions required to use a dataset version.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCompatibility {
  /// Minimum Nextclade CLI semver version (e.g. "3.0.0-alpha.0")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  #[schemars(with = "String")]
  pub cli: Option<Version>,

  /// Minimum Nextclade Web semver version (e.g. "3.0.0-alpha.0")
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

/// Metadata describing a dataset collection: identity, branding, and maintainer information.
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCollectionMeta {
  /// Unique identifier for this collection (e.g. "nextstrain")
  pub id: String,

  /// Human-readable display name (e.g. "Nextstrain")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub title: Option<String>,

  /// Short description of the collection and its maintainer
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub description: Option<String>,

  /// Brand color for UI display (CSS hex, e.g. "#9067b5")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub color: Option<String>,

  /// Path to the collection icon image
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub icon: Option<String>,

  /// People or organizations maintaining this collection
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub maintainers: Vec<DatasetCollectionUrl>,

  /// Related URLs: source repository, contact page, documentation
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub urls: Vec<DatasetCollectionUrl>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// Analysis features supported by a dataset, used for UI display and filtering.
#[allow(clippy::struct_excessive_bools)]
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCapabilities {
  /// Number of distinct clade values defined in the reference tree
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub clades: Option<usize>,

  /// Additional clade classification systems and their value counts (e.g. "Nextclade_pango": 4731)
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub custom_clades: BTreeMap<String, usize>,

  /// QC rule names enabled for this dataset (e.g. "missingData", "privateMutations")
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub qc: Vec<String>,

  /// Whether PCR primer mutation detection is available
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub primers: Option<bool>,

  /// Other capabilities not covered above (e.g. "phenotypeData", "mutLabels")
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

/// Dataset-level metadata: authorship and project links.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetMeta {
  /// URL to the dataset source code repository
  #[serde(rename = "source code", default, skip_serializing_if = "Option::is_none")]
  pub source_code: Option<String>,

  /// URL to the bug tracker or issue page
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub bugs: Option<String>,

  /// List of dataset authors or maintainers
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

/// Filenames of dataset components, relative to the dataset version directory.
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, JsonSchema)]
#[schemars(example = "DatasetFiles::example")]
#[serde(rename_all = "camelCase")]
pub struct DatasetFiles {
  /// Reference sequence FASTA file (e.g. "reference.fasta")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub reference: Option<String>,

  /// Pathogen configuration file (e.g. "pathogen.json")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub pathogen_json: Option<String>,

  /// Genome annotation in GFF3 format (e.g. "genome_annotation.gff3")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub genome_annotation: Option<String>,

  /// Reference phylogenetic tree in Auspice JSON format (e.g. "tree.json")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub tree_json: Option<String>,

  /// Example query sequences for testing (e.g. "sequences.fasta")
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub examples: Option<String>,

  /// Dataset README documentation file
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub readme: Option<String>,

  /// Dataset changelog file
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub changelog: Option<String>,

  /// Additional dataset-specific files not covered by named fields
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

  pub fn example() -> Self {
    Self {
      reference: Some(o!("reference.fasta")),
      pathogen_json: Some(o!("pathogen.json")),
      genome_annotation: Some(o!("genome_annotation.gff3")),
      tree_json: Some(o!("tree.json")),
      examples: Some(o!("sequences.fasta")),
      readme: Some(o!("README.md")),
      changelog: Some(o!("CHANGELOG.md")),
      rest_files: BTreeMap::new(),
      other: serde_json::Value::default(),
    }
  }
}

/// A named URL entry used for maintainer contacts and related links.
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCollectionUrl {
  /// Label describing this URL (e.g. "source", "contact")
  pub name: String,

  /// The URL
  pub url: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// A versioned minimizer index used for automatic dataset detection from query sequences.
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerIndexVersion {
  /// Minimizer index format version
  pub version: String,

  /// Path to the minimizer index file relative to the server root
  pub path: String,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// How dataset content is structured.
#[derive(Clone, Debug, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub enum DatasetType {
  /// Standard dataset with individual files in a directory
  Directory,
  /// Single Auspice JSON file used as both tree and dataset
  AuspiceJson,
  /// Other dataset format
  Other,
}
