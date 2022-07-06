use crate::io::json::{json_stringify, json_write};
use crate::io::ndjson::NdjsonWriter;
use crate::tree::tree::CladeNodeAttrKeyDesc;
use crate::types::outputs::{NextcladeErrorOutputs, NextcladeOutputs};
use crate::utils::datetime::date_iso_now;
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ResultsJson {
  pub schema_version: String,

  pub nextclade_algo_version: String,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub nextclade_web_version: Option<String>,

  pub created_at: String,

  pub clade_node_attr_keys: Vec<CladeNodeAttrKeyDesc>,

  pub results: Vec<NextcladeOutputs>,

  pub errors: Vec<NextcladeErrorOutputs>,
}

impl ResultsJson {
  pub fn new(clade_node_attrs: &[CladeNodeAttrKeyDesc]) -> Self {
    const VERSION: &str = env!("CARGO_PKG_VERSION");

    Self {
      schema_version: "1.0.0".to_owned(),
      nextclade_algo_version: VERSION.to_owned(),
      nextclade_web_version: None,
      created_at: date_iso_now(),
      clade_node_attr_keys: Vec::<CladeNodeAttrKeyDesc>::from(clade_node_attrs),
      results: vec![],
      errors: vec![],
    }
  }

  pub fn from_outputs(
    outputs: &[NextcladeOutputs],
    clade_node_attrs: &[CladeNodeAttrKeyDesc],
    nextclade_web_version: &Option<String>,
  ) -> Self {
    let mut this = Self::new(clade_node_attrs);
    this.results = outputs.to_vec();
    this.nextclade_web_version = nextclade_web_version.clone();
    this
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

  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, message: &str) {
    self.result.errors.push(NextcladeErrorOutputs {
      index,
      seq_name: seq_name.to_owned(),
      message: message.to_owned(),
    });
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

pub fn results_to_json_string(
  outputs: &[NextcladeOutputs],
  clade_node_attrs: &[CladeNodeAttrKeyDesc],
  nextclade_web_version: &Option<String>,
) -> Result<String, Report> {
  let results_json = ResultsJson::from_outputs(outputs, clade_node_attrs, nextclade_web_version);
  json_stringify(&results_json)
}

pub fn results_to_ndjson_string(outputs: &[NextcladeOutputs]) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    let mut writer = NdjsonWriter::new(&mut buf)?;
    for output in outputs {
      writer.write(output)?;
    }
  }
  Ok(String::from_utf8(buf)?)
}
