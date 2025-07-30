use crate::align::params::AlignPairwiseParamsOptional;
use crate::alphabet::aa::Aa;
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_changes_find_for_cds::AaChangesParamsOptional;
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
use semver::Version;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::path::Path;
use validator::Validate;

const PATHOGEN_JSON_SCHEMA_VERSION_FROM: &str = "3.0.0";
const PATHOGEN_JSON_SCHEMA_VERSION_TO: &str = "3.0.0";

/// pathogen.json dataset file. Contains external configuration and data specific for a particular pathogen.
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(title = "PathogenJson", example = "VirusProperties::example")]
pub struct VirusProperties {
  pub schema_version: String,

  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub attributes: BTreeMap<String, AnyType>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub shortcuts: Vec<String>,

  #[serde(default, skip_serializing_if = "DatasetMeta::is_default")]
  pub meta: DatasetMeta,

  #[serde(default, skip_serializing_if = "DatasetFiles::is_default")]
  pub files: DatasetFiles,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub default_cds: Option<String>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub cds_order_preference: Vec<String>,

  #[serde(default)]
  pub mut_labels: LabelledMutationsConfig,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub qc: Option<QcConfig>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub general_params: Option<NextcladeGeneralParamsOptional>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub alignment_params: Option<AlignPairwiseParamsOptional>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub tree_builder_params: Option<TreeBuilderParamsOptional>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub aa_changes_params: Option<AaChangesParamsOptional>,

  pub phenotype_data: Option<Vec<PhenotypeData>>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub aa_motifs: Vec<AaMotifsDesc>,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub versions: Vec<DatasetVersion>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub version: Option<DatasetVersion>,

  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub compatibility: Option<DatasetCompatibility>,

  #[serde(flatten)]
  pub other: serde_json::Value,
}

/// Associates a genotype (pos, nuc) to a list of labels
pub type LabelMap<L> = BTreeMap<Genotype<L>, Vec<String>>;

/// Associates a genotype (pos, nuc) to a list of labels
pub type NucLabelMap = LabelMap<Nuc>;

/// Information about  mutations and their labels
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema, Validate)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "LabelledMutationsConfig::example")]
pub struct LabelledMutationsConfig {
  #[serde(default, skip_serializing_if = "BTreeMap::is_empty")]
  pub nuc_mut_label_map: BTreeMap<Genotype<Nuc>, Vec<String>>,
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
      other: serde_json::Value::Null,
    }
  }
}

#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeDataIgnore {
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
  pub name: String,
  pub weight: OrderedFloat<f64>,
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
  pub name: String,
  pub name_friendly: String,
  pub description: String,
  pub cds: String,
  pub aa_range: AaRefRange,
  #[serde(default)]
  pub ignore: PhenotypeDataIgnore,
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

/// Describes a single attribute of a phenotype
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct PhenotypeAttrDesc {
  pub name: String,
  pub name_friendly: String,
  pub description: String,
}

/// Describes motifs in amino acid sequences, such as glycosylation sites, disulfide bonds, etc.
#[derive(Clone, Default, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[schemars(example = "AaMotifsDesc::example")]
pub struct AaMotifsDesc {
  pub name: String,
  pub name_short: String,
  pub name_friendly: String,
  pub description: String,
  pub motifs: Vec<String>,

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
  pub cds: String,

  #[serde(default, skip_serializing_if = "Vec::is_empty")]
  pub ranges: Vec<AaRefRange>,
}

impl VirusProperties {
  pub fn example() -> Self {
    Self {
      schema_version: o!("3.0.0"),
      attributes: btreemap! {
        o!("name") => AnyType::String(o!("Influenza A H3N2 HA")),
        o!("segment") => AnyType::String(o!("ha")),
        o!("reference accession") => AnyType::String(o!("CY163680")),
        o!("reference name") => AnyType::String(o!("A/Wisconsin/67/2005-egg")),
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
      other: serde_json::Value::Null,
    }
  }

  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let data =
      read_file_to_string(filepath).wrap_err_with(|| format!("When reading pathogen.json file: {filepath:#?}"))?;
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
      .map_or(true, |compat| compat.is_cli_compatible(current_cli_version))
  }
}
