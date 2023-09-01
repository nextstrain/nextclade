use crate::io::fasta::FastaRecord;
use eyre::Report;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct MinimizerSearchResult {
  #[serde(rename = "schemaVersion")]
  pub schema_version: String,

  pub version: String,
}

pub fn run_minimizer_search(fasta_record: &FastaRecord) -> Result<MinimizerSearchResult, Report> {
  Ok(MinimizerSearchResult {
    schema_version: "".to_owned(),
    version: "".to_owned(),
  })
}
