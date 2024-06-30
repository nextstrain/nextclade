use crate::analyze::virus_properties::PhenotypeAttrDesc;
use crate::io::json::{json_stringify, json_write, JsonPretty};
use crate::io::ndjson::NdjsonWriter;
use crate::tree::tree::{AuspiceRefNodesDesc, CladeNodeAttrKeyDesc};
use crate::types::outputs::{
  combine_outputs_and_errors_sorted, NextcladeErrorOutputs, NextcladeOutputOrError, NextcladeOutputs,
};
use crate::utils::datetime::date_iso_now;
use crate::utils::info::this_package_version_str;
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct ResultsJson {
  pub schema_version: String,

  pub nextclade_algo_version: String,

  #[serde(skip_serializing_if = "Option::is_none")]
  pub nextclade_web_version: Option<String>,

  pub created_at: String,

  pub clade_node_attr_keys: Vec<CladeNodeAttrKeyDesc>,

  pub phenotype_attr_keys: Vec<PhenotypeAttrDesc>,

  pub ref_nodes: AuspiceRefNodesDesc,

  pub results: Vec<NextcladeOutputs>,

  pub errors: Vec<NextcladeErrorOutputs>,
}

impl ResultsJson {
  pub fn new(
    clade_node_attrs: &[CladeNodeAttrKeyDesc],
    phenotype_attr_keys: &[PhenotypeAttrDesc],
    ref_nodes: &AuspiceRefNodesDesc,
  ) -> Self {
    Self {
      schema_version: "3.0.0".to_owned(),
      nextclade_algo_version: this_package_version_str().to_owned(),
      nextclade_web_version: None,
      created_at: date_iso_now(),
      clade_node_attr_keys: clade_node_attrs.to_vec(),
      phenotype_attr_keys: phenotype_attr_keys.to_vec(),
      ref_nodes: ref_nodes.to_owned(),
      results: vec![],
      errors: vec![],
    }
  }

  pub fn from_outputs(
    outputs: &[NextcladeOutputs],
    errors: &[NextcladeErrorOutputs],
    clade_node_attrs: &[CladeNodeAttrKeyDesc],
    phenotype_attr_keys: &[PhenotypeAttrDesc],
    ref_nodes: &AuspiceRefNodesDesc,
    nextclade_web_version: &Option<String>,
  ) -> Self {
    let mut this = Self::new(clade_node_attrs, phenotype_attr_keys, ref_nodes);
    this.results = outputs.to_vec();
    this.errors = errors.to_vec();
    this.nextclade_web_version = nextclade_web_version.clone();
    this
  }
}

pub struct ResultsJsonWriter {
  filepath: PathBuf,
  result: ResultsJson,
}

impl ResultsJsonWriter {
  pub fn new(
    filepath: impl AsRef<Path>,
    clade_node_attrs: &[CladeNodeAttrKeyDesc],
    phenotype_attr_keys: &[PhenotypeAttrDesc],
    ref_nodes: &AuspiceRefNodesDesc,
  ) -> Result<Self, Report> {
    Ok(Self {
      filepath: filepath.as_ref().to_owned(),
      result: ResultsJson::new(clade_node_attrs, phenotype_attr_keys, ref_nodes),
    })
  }

  pub fn write(&mut self, entry: NextcladeOutputs) {
    self.result.results.push(entry);
  }

  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &[String]) {
    self.result.errors.push(NextcladeErrorOutputs {
      index,
      seq_name: seq_name.to_owned(),
      errors: errors.to_vec(),
    });
  }

  pub fn finish(&self) -> Result<(), Report> {
    json_write(&self.filepath, &self.result, JsonPretty(true))
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
  errors: &[NextcladeErrorOutputs],
  clade_node_attrs: &[CladeNodeAttrKeyDesc],
  phenotype_attr_keys: &[PhenotypeAttrDesc],
  ref_nodes: &AuspiceRefNodesDesc,
  nextclade_web_version: &Option<String>,
) -> Result<String, Report> {
  let results_json = ResultsJson::from_outputs(
    outputs,
    errors,
    clade_node_attrs,
    phenotype_attr_keys,
    ref_nodes,
    nextclade_web_version,
  );
  json_stringify(&results_json, JsonPretty(false))
}

pub fn results_to_ndjson_string(
  outputs: &[NextcladeOutputs],
  errors: &[NextcladeErrorOutputs],
) -> Result<String, Report> {
  let mut buf = Vec::<u8>::new();
  {
    let mut writer = NdjsonWriter::new(&mut buf)?;

    let output_or_errors = combine_outputs_and_errors_sorted(outputs, errors);

    for (_, output_or_error) in output_or_errors {
      match output_or_error {
        NextcladeOutputOrError::Outputs(output) => writer.write(&output),
        NextcladeOutputOrError::Error(error) => writer.write_nuc_error(error.index, &error.seq_name, &error.errors),
      }?;
    }
  }
  Ok(String::from_utf8(buf)?)
}
