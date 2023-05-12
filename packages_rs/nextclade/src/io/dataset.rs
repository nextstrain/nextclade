use eyre::WrapErr;
use semver::Version;
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::str::FromStr;

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCompatibilityRange {
  pub min: Option<String>,
  pub max: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DatasetCompatibility {
  pub nextclade_cli: DatasetCompatibilityRange,
  pub nextclade_web: DatasetCompatibilityRange,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DatasetAttributeValue {
  pub is_default: bool,
  pub value: String,
  pub value_friendly: Option<String>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DatasetAttributes {
  pub name: DatasetAttributeValue,
  pub reference: DatasetAttributeValue,
  pub tag: DatasetAttributeValue,

  #[serde(flatten)]
  pub rest_attrs: BTreeMap<String, DatasetAttributeValue>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DatasetParams {
  pub default_gene: Option<String>,
  pub gene_order_preference: Option<Vec<String>>,
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct Dataset {
  pub enabled: bool,
  pub attributes: DatasetAttributes,
  pub comment: String,
  pub compatibility: DatasetCompatibility,
  pub files: BTreeMap<String, String>,
  pub params: Option<DatasetParams>,
  pub zip_bundle: String,
}

impl Dataset {
  #[inline]
  pub const fn is_latest(&self) -> bool {
    self.attributes.tag.is_default
  }

  pub fn is_compatible(&self, cli_version: &str) -> bool {
    let this_version = Version::parse(cli_version)
      .wrap_err_with(|| format!("Unable to parse version: '{cli_version}'"))
      .unwrap();

    let DatasetCompatibilityRange { min, max } = &self.compatibility.nextclade_cli;

    let mut compatible = true;
    if let Some(min) = min {
      let min_version = Version::parse(min)
        .wrap_err_with(|| format!("Unable to parse dataset min version: '{min}'"))
        .unwrap();
      compatible = compatible && (this_version >= min_version);
    }
    if let Some(max) = max {
      let max_version = Version::parse(max)
        .wrap_err_with(|| format!("Unable to parse dataset max version: '{max}'"))
        .unwrap();
      compatible = compatible && (this_version < max_version);
    }
    compatible
  }
}

#[derive(Clone, Serialize, Deserialize, schemars::JsonSchema, Debug)]
#[serde(rename_all = "camelCase")]
pub struct DatasetsIndexJson {
  pub schema: String,
  pub datasets: Vec<Dataset>,
}
