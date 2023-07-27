use crate::io::json::json_parse;
use crate::make_error;
use crate::utils::error::report_to_string;
use eyre::Report;
use log::warn;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SchemaVersion {
  pub schema_version: String,
}

pub struct SchemaVersionParams<'s> {
  pub name: &'s str,
  pub ver_from: Option<&'s str>,
  pub ver_to: Option<&'s str>,
}

impl SchemaVersion {
  /// Parse JSON file and check `schemaVersion` field against provided max version, and return an error if not compatible.
  pub fn check_err(
    json_str: &str,
    SchemaVersionParams { name, ver_from, ver_to }: &SchemaVersionParams,
  ) -> Result<SchemaVersion, Report> {
    let sv: SchemaVersion = json_parse(json_str)?;

    if let Some(ver_to) = ver_to {
      if sv.schema_version.as_str() > ver_to {
        return make_error!("The format version of '{}' file (schemaVersion={}) is newer than maximum version supported by this version of Nextclade (schemaVersion={}). This likely means that there are newer versions of Nextclade available which support this new format. In case of issues, please upgrade Nextclade to avoid incompatibility and to receive the latest features and bug fixes. Alternatively, you might try to use earlier versions of the dataset (not recommended).", name, sv.schema_version, ver_to);
      }
    }

    if let Some(ver_from) = ver_from {
      if sv.schema_version.as_str() < ver_from {
        return make_error!("The format version of '{}' file (schemaVersion={}) is older than minimum version supported by this version of Nextclade (schemaVersion={}). This likely means that this version of Nextclade will have problems reading and understanding this file. In case of issues, please upgrade the dataset to avoid incompatibility and to receive the latest features and bug fixes. Alternatively, you might try to use earlier versions of Nextclade (not recommended).", name, sv.schema_version, ver_from);
      }
    }

    Ok(sv)
  }

  /// Parse JSON file and check `schemaVersion` field against provided max version, and print a warning if not compatible.
  pub fn check_warn(json_str: &str, params: &SchemaVersionParams) {
    if let Err(report) = Self::check_err(json_str, params) {
      warn!("{}", report_to_string(&report));
    }
  }
}
