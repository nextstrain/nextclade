use crate::align::params::AlignPairwiseParamsOptional;
use crate::alphabet::aa::Aa;
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_changes_find_for_cds::AaChangesParamsOptional;
use crate::analyze::aa_sub::AaGenotype;
use crate::coord::position::AaRefPosition;
use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::AaRefRange;
use crate::gene::genotype::Genotype;
use crate::io::dataset::{DatasetCompatibility, DatasetFiles, DatasetMeta, DatasetVersion};
use crate::io::fs::read_file_to_string;
use crate::io::json::json_parse;
use crate::io::schema_version::{SchemaVersion, SchemaVersionParams};
use crate::qc::qc_config::QcConfig;
use crate::run::params_general::NextcladeGeneralParamsOptional;
use crate::tree::params::TreeBuilderParamsOptional;
use crate::utils::any::AnyType;
use crate::{o, vec_of_owned};
use eyre::{Report, WrapErr};
use maplit::btreemap;
use ordered_float::OrderedFloat;
use schemars;
use semver::Version;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use validator::Validate;

const PATHOGEN_JSON_SCHEMA_VERSION_FROM: &str = "3.0.0";
const PATHOGEN_JSON_SCHEMA_VERSION_TO: &str = "3.0.0";

/// Pathogen metadata attributes with recognized keys and extensibility
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
pub struct PathogenAttributes {
  /// Human-readable dataset name
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub name: Option<String>,

  /// Name of the reference sequence
  #[serde(rename = "reference name", default, skip_serializing_if = "Option::is_none")]
  pub reference_name: Option<String>,

  /// Accession number of the reference sequence
  #[serde(rename = "reference accession", default, skip_serializing_if = "Option::is_none")]
  pub reference_accession: Option<String>,

  /// Additional custom attributes
  #[serde(flatten)]
  pub other: BTreeMap<String, AnyType>,
}

impl PathogenAttributes {
  pub fn is_default(&self) -> bool {
    self == &Self::default()
  }
}

/// pathogen.json dataset file. Contains external configuration and data specific for a particular pathogen.
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(title = "PathogenJson", example = "VirusProperties::example")]
pub struct VirusProperties {
  /// Schema version for this pathogen.json file. Currently "3.0.0".
  pub schema_version: String,

  /// Dataset attributes: name, reference info, status flags (deprecated, experimental)
  #[serde(default, skip_serializing_if = "PathogenAttributes::is_default")]
  pub attributes: PathogenAttributes,

  /// Short aliases for the dataset name, used in CLI and URL parameters (e.g. "sars-cov-2", "rsv_a").
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub shortcuts: Vec<String>,

  /// Dataset metadata such as official name, creation timestamp, and update history.
  #[serde(default, skip_serializing_if = "DatasetMeta::is_default")]
  pub meta: DatasetMeta,

  /// Filenames of other dataset input files (reference FASTA, genome annotation, tree, examples).
  #[serde(default, skip_serializing_if = "DatasetFiles::is_default")]
  pub files: DatasetFiles,

  /// CDS shown by default in the Nextclade Web sequence view (e.g. "S", "HA1").
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub default_cds: Option<String>,

  /// Preferred display order of CDS names in the Nextclade Web dropdown.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub cds_order_preference: Vec<String>,

  /// Mapping from nucleotide and amino acid mutations to human-readable labels (e.g. clade-defining mutations).
  #[serde(default)]
  pub mut_labels: LabelledMutationsConfig,

  /// Quality control rule configuration. If absent, no QC checks are performed.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub qc: Option<QcConfig>,

  /// General analysis parameters (e.g. includeReference, inOrder, replaceUnknown).
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub general_params: Option<NextcladeGeneralParamsOptional>,

  /// Pairwise alignment algorithm parameters (gap penalties, seed matching, band width).
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub alignment_params: Option<AlignPairwiseParamsOptional>,

  /// Phylogenetic tree builder parameters (greedy refinement, masked mutation weight).
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub tree_builder_params: Option<TreeBuilderParamsOptional>,

  /// Parameters for amino acid change detection and grouping.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub aa_changes_params: Option<AaChangesParamsOptional>,

  /// Phenotype scoring configuration (e.g. ACE2 binding, immune escape) with per-position coefficients.
  pub phenotype_data: Option<Vec<PhenotypeData>>,

  /// Amino acid motif detection rules (e.g. glycosylation sites, cleavage sites).
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub aa_motifs: Vec<AaMotifsDesc>,

  /// Available dataset versions. Populated from the dataset index, not from pathogen.json directly.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub versions: Vec<DatasetVersion>,

  /// Current version of this dataset.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub version: Option<DatasetVersion>,

  /// Minimum Nextclade CLI and Web versions required to use this dataset.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub compatibility: Option<DatasetCompatibility>,

  /// Contact and documentation URLs for dataset maintainers.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub maintenance: Option<DatasetMaintenance>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// Contact and documentation URLs for dataset maintenance
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct DatasetMaintenance {
  /// URLs for the project or organization website.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub website: Vec<String>,

  /// URLs for dataset documentation and usage guides.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub documentation: Vec<String>,

  /// URLs for the source code repositories used to build the dataset.
  #[serde(rename = "source code", default, skip_serializing_if = "Vec::is_empty")]
  pub source_code: Vec<String>,

  /// URLs for reporting bugs and requesting features related to the dataset.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub issues: Vec<String>,

  /// Names of organizations responsible for maintaining the dataset.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub organizations: Vec<String>,

  /// Names and contact information of dataset authors.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub authors: Vec<String>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// Associates a genotype (pos, nuc) to a list of labels
pub type LabelMap<L> = BTreeMap<Genotype<L>, Vec<String>>;

/// Associates a genotype (pos, nuc) to a list of labels
pub type NucLabelMap = LabelMap<Nuc>;

/// Associates an AA genotype (cds, pos, aa) to a list of labels
pub type AaLabelMap = BTreeMap<AaGenotype, Vec<String>>;

/// Mapping from specific mutations to human-readable labels (e.g. clade-defining or drug-resistance mutations).
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "LabelledMutationsConfig::example")]
pub struct LabelledMutationsConfig {
  /// Nucleotide mutation labels: maps each nucleotide genotype (position + query nucleotide) to a list of label strings.
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub nuc_mut_label_map: BTreeMap<Genotype<Nuc>, Vec<String>>,
  /// Amino acid mutation labels: maps each amino acid genotype (CDS + position + query amino acid) to a list of label strings.
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub aa_mut_label_map: AaLabelMap,
  #[serde(flatten)]
  pub other: serde_json::Value,
}

impl LabelledMutationsConfig {
  pub fn example() -> Self {
    let mut nuc_mut_label_map = BTreeMap::new();
    // Example influenza HA mutations
    nuc_mut_label_map.insert(
      Genotype {
        pos: NucRefGlobalPosition::from(158),
        qry: Nuc::A,
      },
      vec_of_owned!["T160K"],
    );
    nuc_mut_label_map.insert(
      Genotype {
        pos: NucRefGlobalPosition::from(459),
        qry: Nuc::T,
      },
      vec_of_owned!["N155H"],
    );

    Self {
      nuc_mut_label_map,
      aa_mut_label_map: BTreeMap::new(),
      other: serde_json::Value::Null,
    }
  }
}

/// Clades to exclude from phenotype scoring (e.g. outgroup clades with unreliable mutation calls).
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeDataIgnore {
  /// List of clade names to ignore when computing phenotype scores.
  #[serde(default)]
  pub clades: Vec<String>,
}

/// Coefficient for a phenotype data entry. Can be a single value for all amino acids at a position, or a mapping from amino acids to their specific values.
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(untagged)]
pub enum PhenotypeCoeff {
  ByPosition(OrderedFloat<f64>),
  ByPositionAndAa(BTreeMap<String, OrderedFloat<f64>>),
  #[serde(skip)]
  #[schemars(skip)]
  Other(serde_json::Value),
}

impl PhenotypeCoeff {
  pub fn get_coeff(&self, aa: Aa) -> f64 {
    match self {
      PhenotypeCoeff::ByPosition(coeff) => Some(coeff.0),
      PhenotypeCoeff::ByPositionAndAa(aa_coeff_map) => aa_coeff_map
        .get(&aa.to_string())
        .or_else(|| aa_coeff_map.get("default"))
        .map(|c| c.0),
      PhenotypeCoeff::Other(_) => None,
    }
    .unwrap_or(0.0)
    .to_owned()
  }
}

/// A single entry in the phenotype data
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "PhenotypeDataEntry::example")]
pub struct PhenotypeDataEntry {
  /// Identifier for this data entry (e.g. "binding", "escape").
  pub name: String,
  /// Relative weight of this entry when combining multiple entries into a final phenotype score.
  pub weight: OrderedFloat<f64>,
  /// Per-position coefficients mapping amino acid reference positions to their contribution to the score.
  pub locations: BTreeMap<AaRefPosition, PhenotypeCoeff>,
}

impl PhenotypeDataEntry {
  pub fn example() -> Self {
    Self {
      name: o!("receptor_binding"),
      weight: OrderedFloat(1.0),
      locations: btreemap! {
        AaRefPosition::from(145) => PhenotypeCoeff::ByPosition(OrderedFloat(0.4)),
        AaRefPosition::from(155) => PhenotypeCoeff::ByPositionAndAa(btreemap! {
          o!("H") => OrderedFloat(1.2),
          o!("N") => OrderedFloat(0.8),
          o!("default") => OrderedFloat(0.0),
        }),
        AaRefPosition::from(226) => PhenotypeCoeff::ByPosition(OrderedFloat(0.6)),
      },
    }
  }

  pub fn get_coeff(&self, pos: AaRefPosition, aa: Aa) -> f64 {
    self.locations.get(&pos).map_or(0.0, |location| location.get_coeff(aa))
  }
}

/// Describes a phenotype, such as receptor binding, immune escape, etc.
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "PhenotypeData::example")]
pub struct PhenotypeData {
  /// Machine-readable identifier for this phenotype (e.g. "ace2_binding", "immune_escape").
  pub name: String,
  /// Human-readable display name (e.g. "ACE2 Binding", "Immune Escape").
  pub name_friendly: String,
  /// Free-text description of what this phenotype measures.
  pub description: String,
  /// CDS on which this phenotype is evaluated (e.g. "S", "HA1").
  pub cds: String,
  /// Amino acid range within the CDS where phenotype-relevant mutations are considered.
  pub aa_range: AaRefRange,
  /// Clades to exclude from phenotype scoring.
  #[serde(default)]
  pub ignore: PhenotypeDataIgnore,
  /// Per-position coefficient tables for computing the phenotype score.
  pub data: Vec<PhenotypeDataEntry>,
}

impl PhenotypeData {
  pub fn example() -> Self {
    Self {
      name: o!("receptor_binding"),
      name_friendly: o!("Receptor Binding"),
      description: o!("Predicts receptor binding specificity and affinity"),
      cds: o!("HA1"),
      aa_range: AaRefRange::new(AaRefPosition::from(120), AaRefPosition::from(260)),
      ignore: PhenotypeDataIgnore {
        clades: vec_of_owned!["3C.2A", "3C.3A"],
      },
      data: vec![PhenotypeDataEntry::example()],
    }
  }
}

/// Description of a phenotype attribute
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeAttrDesc {
  /// Machine-readable identifier for this phenotype attribute.
  pub name: String,
  /// Human-readable display name shown in the UI.
  pub name_friendly: String,
  /// Free-text description of this phenotype attribute.
  pub description: String,
}

/// Describes motifs in amino acid sequences, such as glycosylation sites, disulfide bonds, etc.
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "AaMotifsDesc::example")]
pub struct AaMotifsDesc {
  /// Machine-readable identifier for this motif type (e.g. "glycosylation").
  pub name: String,
  /// Abbreviated name for compact display (e.g. "Glyc.").
  pub name_short: String,
  /// Human-readable display name (e.g. "Glycosylation").
  pub name_friendly: String,
  /// Free-text description of what the motif represents.
  pub description: String,
  /// Regular expressions defining the amino acid motifs to detect (e.g. "N[^P][ST]" for N-linked glycosylation).
  pub motifs: Vec<String>,

  /// CDS regions in which to search for motifs. If empty, all CDSes are searched.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub include_cdses: Vec<CountAaMotifsCdsDesc>,
}

impl AaMotifsDesc {
  pub fn example() -> Self {
    Self {
      name: o!("glycosylation"),
      name_short: o!("Glyc."),
      name_friendly: o!("Glycosylation"),
      description: o!("N-linked glycosylation motifs (N-X-S/T with X any amino acid other than P)"),
      motifs: vec_of_owned!["N[^P][ST]"],
      include_cdses: vec![
        CountAaMotifsCdsDesc {
          cds: o!("HA1"),
          ranges: vec![],
        },
        CountAaMotifsCdsDesc {
          cds: o!("HA2"),
          ranges: vec![AaRefRange::new(AaRefPosition::from(0), AaRefPosition::from(186))],
        },
      ],
    }
  }
}

/// Describes a range of amino acids in a CDS for counting motifs
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CountAaMotifsCdsDesc {
  /// Name of the CDS to search for motifs (e.g. "HA1", "HA2").
  pub cds: String,

  /// Amino acid ranges within the CDS to restrict the search. If empty, the entire CDS is searched.
  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub ranges: Vec<AaRefRange>,
}

impl VirusProperties {
  pub fn example() -> Self {
    Self {
      schema_version: o!("3.0.0"),
      attributes: PathogenAttributes {
        name: Some(o!("Influenza A H3N2 HA")),
        reference_name: Some(o!("A/Wisconsin/67/2005-egg")),
        reference_accession: Some(o!("CY163680")),
        other: btreemap! {
          o!("segment") => AnyType::String(o!("ha")),
        },
      },
      shortcuts: vec_of_owned!["flu_h3n2_ha_broad", "nextstrain/flu/h3n2/ha/wisconsin-67-2005"],
      meta: DatasetMeta::default(),
      files: DatasetFiles::default(),
      default_cds: Some(o!("HA1")),
      cds_order_preference: vec_of_owned!["HA1", "HA2"],
      mut_labels: LabelledMutationsConfig::example(),
      qc: Some(QcConfig::example()),
      general_params: None,
      alignment_params: None,
      tree_builder_params: None,
      aa_changes_params: None,
      phenotype_data: Some(vec![PhenotypeData::example()]),
      aa_motifs: vec![AaMotifsDesc::example()],
      versions: vec![],
      version: None,
      compatibility: None,
      maintenance: None,
      other: serde_json::Value::Null,
    }
  }

  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let data = read_file_to_string(filepath)
      .wrap_err_with(|| format!("When reading pathogen.json file: {}", filepath.display()))?;
    Self::from_str(&data)
  }

  pub fn from_str(s: &impl AsRef<str>) -> Result<Self, Report> {
    SchemaVersion::check_warn(
      s,
      &SchemaVersionParams {
        name: "pathogen.json",
        ver_from: Some(PATHOGEN_JSON_SCHEMA_VERSION_FROM),
        ver_to: Some(PATHOGEN_JSON_SCHEMA_VERSION_TO),
      },
    );

    json_parse::<VirusProperties>(s).wrap_err("When parsing pathogen.json file")
  }

  pub fn is_cli_compatible(&self, current_cli_version: &Version) -> bool {
    self
      .compatibility
      .as_ref()
      .is_none_or(|compat| compat.is_cli_compatible(current_cli_version))
  }
}
