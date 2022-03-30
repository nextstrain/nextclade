use crate::cli::nextalign_loop::NextalignOutputs;
use crate::cli::nextclade_loop::NextcladeOutputs;
use crate::io::json::json_write;
use crate::tree::tree::CladeNodeAttrKeyDesc;
use crate::utils::datetime::timestamp_now;
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::process::Output;

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultsJson {
  pub schema_version: String,
  pub nextclade_version: String,
  pub timestamp: u64,
  pub clade_node_attrs: Vec<CladeNodeAttrKeyDesc>,
  pub results: Vec<NextcladeOutputs>,
}

impl ResultsJson {
  pub fn new(clade_node_attrs: &[CladeNodeAttrKeyDesc]) -> Self {
    const VERSION: &str = env!("CARGO_PKG_VERSION");

    Self {
      schema_version: "1.0.0".to_owned(),
      nextclade_version: VERSION.to_owned(),
      timestamp: timestamp_now() as u64,
      clade_node_attrs: Vec::<CladeNodeAttrKeyDesc>::from(clade_node_attrs),
      results: vec![],
    }
  }
}

pub struct ResultsJsonWriter {
  filepath: PathBuf,
  result: ResultsJson,
}

impl ResultsJsonWriter {
  pub fn new(filepath: impl AsRef<Path>, clade_node_attrs: &[CladeNodeAttrKeyDesc]) -> Result<Self, Report> {
    Ok(Self {
      filepath: filepath.as_ref().to_owned(),
      result: ResultsJson::new(clade_node_attrs),
    })
  }

  pub fn write(&mut self, entry: NextcladeOutputs) {
    self.result.results.push(entry);
  }

  pub fn finish(&self) -> Result<(), Report> {
    json_write(&self.filepath, &self.result)
  }
}

impl Drop for ResultsJsonWriter {
  #[allow(unused_must_use)]
  fn drop(&mut self) {
    self.finish();
  }
}
