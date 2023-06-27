use crate::wasm::analyze::{AnalysisInitialData, AnalysisInput, AnalysisResult, Nextclade, NextcladeParams};
use eyre::{Report, WrapErr};
use itertools::Itertools;
use nextclade::analyze::pcr_primers::PcrPrimer;
use nextclade::analyze::virus_properties::{AaMotifsDesc, PhenotypeAttrDesc, VirusProperties};
use nextclade::io::errors_csv::{errors_to_csv_string, ErrorsFromWeb};
use nextclade::io::fasta::{read_one_fasta_str, FastaReader, FastaRecord};
use nextclade::io::gene_map::GeneMap;
use nextclade::io::insertions_csv::insertions_to_csv_string;
use nextclade::io::json::{JsonPretty, json_parse, json_stringify};
use nextclade::io::nextclade_csv::{results_to_csv_string, CsvColumnConfig};
use nextclade::io::results_json::{results_to_json_string, results_to_ndjson_string};
use nextclade::qc::qc_config::QcConfig;
use nextclade::tree::tree::{AuspiceTree, CladeNodeAttrKeyDesc};
use nextclade::types::outputs::{NextcladeErrorOutputs, NextcladeOutputs};
use nextclade::utils::error::report_to_string;
use std::io::Read;
use std::str::FromStr;
use wasm_bindgen::prelude::*;

/// Converts Result's Err variant from eyre::Report to wasm_bindgen::JsError
fn jserr<T>(result: Result<T, Report>) -> Result<T, JsError> {
  result.map_err(|report| JsError::new(&report_to_string(&report)))
}

/// Nextclade WebAssembly module.
///
/// Encapsulates all the Nextclade Rust functionality required for Nextclade Web to operate.
#[wasm_bindgen]
pub struct NextcladeWasm {
  nextclade: Nextclade,
}

#[wasm_bindgen]
impl NextcladeWasm {
  #[wasm_bindgen(constructor)]
  pub fn new(params: &NextcladeParams) -> Result<NextcladeWasm, JsError> {
    let nextclade = jserr(Nextclade::new(params).wrap_err_with(|| "When initializing Nextclade runner"))?;
    Ok(Self { nextclade })
  }

  pub fn parse_query_sequences(qry_fasta_str: &str, callback: &js_sys::Function) -> Result<(), JsError> {
    let mut reader = jserr(FastaReader::from_str(qry_fasta_str).wrap_err_with(|| "When creating fasta reader"))?;

    loop {
      let mut record = FastaRecord::default();
      jserr(reader.read(&mut record).wrap_err_with(|| "When reading a fasta record"))?;
      if record.is_empty() {
        break;
      }

      let index = JsValue::from(record.index);
      let seq_name = JsValue::from(record.seq_name);
      let seq = JsValue::from(record.seq);

      callback
        .call3(&JsValue::null(), &index, &seq_name, &seq)
        .map_err(|err_val| JsError::new(&format!("{err_val:#?}")))?;
    }

    Ok(())
  }

  pub fn get_initial_data(&self) -> Result<AnalysisInitialData, JsError> {
    jserr(self.nextclade.get_initial_data())
  }

  /// Runs analysis on one sequence and returns its result. This runs in many webworkers concurrently.
  pub fn analyze(&mut self, input: &AnalysisInput) -> Result<AnalysisResult, JsError> {
    jserr(self.nextclade.run(input))
  }

  /// Takes ALL analysis results, runs tree placement and returns output tree.
  /// This should only run once, in one of the webworkers.
  pub fn get_output_tree(&mut self, nextclade_outputs_json_str: &str) -> Result<String, JsError> {
    let nextclade_outputs = jserr(NextcladeOutputs::many_from_str(nextclade_outputs_json_str))?;
    let tree = self.nextclade.get_output_tree(&nextclade_outputs);
    jserr(json_stringify(tree, JsonPretty(false)))
  }

  /// Checks that a string containing ref sequence in FASTA format is correct
  pub fn parse_ref_seq_fasta(ref_seq_str: &str) -> Result<String, JsError> {
    let record = jserr(read_one_fasta_str(ref_seq_str))?;
    jserr(json_stringify(&record, JsonPretty(false)))
  }

  /// Checks that a string containing Auspice tree in JSON format is correct
  pub fn validate_tree_json(tree_json_str: &str) -> Result<(), JsError> {
    jserr(AuspiceTree::from_str(tree_json_str))?;
    Ok(())
  }

  /// Checks that a string containing gene map in GFF format is correct
  pub fn parse_gene_map_gff(gene_map_gff_str: &str) -> Result<String, JsError> {
    let gene_map = jserr(GeneMap::from_str(gene_map_gff_str))?;
    jserr(json_stringify(&gene_map, JsonPretty(false)))
  }

  /// Checks that a string containing PCT primers in CSV format is correct
  pub fn validate_primers_csv(pcr_primers_csv_str: &str, ref_seq_str: &str) -> Result<(), JsError> {
    jserr(PcrPrimer::from_str(pcr_primers_csv_str, ref_seq_str))?;
    Ok(())
  }

  /// Checks that a string containing QC config in JSON format is correct
  pub fn validate_qc_config(qc_json_str: &str) -> Result<(), JsError> {
    jserr(QcConfig::from_str(qc_json_str))?;
    Ok(())
  }

  /// Checks that a string containing virus properties in JSON format is correct
  pub fn validate_virus_properties_json(virus_properties_json_str: &str) -> Result<(), JsError> {
    jserr(VirusProperties::from_str(virus_properties_json_str))?;
    Ok(())
  }

  #[allow(clippy::needless_pass_by_value)]
  pub fn serialize_results_json(
    outputs_json_str: &str,
    errors_json_str: &str,
    clade_node_attrs_json_str: &str,
    phenotype_attrs_json_str: &str,
    nextclade_web_version: Option<String>,
  ) -> Result<String, JsError> {
    let outputs: Vec<NextcladeOutputs> = jserr(
      json_parse(outputs_json_str).wrap_err("When serializing results into JSON: When parsing outputs JSON internally"),
    )?;

    let errors: Vec<NextcladeErrorOutputs> = jserr(
      json_parse(errors_json_str).wrap_err("When serializing results into JSON: When parsing errors JSON internally"),
    )?;

    let clade_node_attrs: Vec<CladeNodeAttrKeyDesc> = jserr(
      json_parse(clade_node_attrs_json_str)
        .wrap_err("When serializing results JSON: When parsing clade node attrs JSON internally"),
    )?;

    let phenotype_attrs: Vec<PhenotypeAttrDesc> = jserr(
      json_parse(phenotype_attrs_json_str)
        .wrap_err("When serializing results JSON: When parsing phenotypes attr keys JSON internally"),
    )?;

    jserr(
      results_to_json_string(
        &outputs,
        &errors,
        &clade_node_attrs,
        &phenotype_attrs,
        &nextclade_web_version,
      )
      .wrap_err("When serializing results JSON"),
    )
  }

  pub fn serialize_results_ndjson(outputs_json_str: &str, errors_json_str: &str) -> Result<String, JsError> {
    let outputs: Vec<NextcladeOutputs> = jserr(
      json_parse(outputs_json_str)
        .wrap_err("When serializing results into NDJSON: When parsing outputs JSON internally"),
    )?;

    let errors: Vec<NextcladeErrorOutputs> = jserr(
      json_parse(errors_json_str).wrap_err("When serializing results into NDJSON: When parsing errors JSON internally"),
    )?;

    jserr(results_to_ndjson_string(&outputs, &errors))
  }

  pub fn serialize_results_csv(
    outputs_json_str: &str,
    errors_json_str: &str,
    clade_node_attrs_json_str: &str,
    phenotype_attrs_json_str: &str,
    aa_motifs_keys_json_str: &str,
    delimiter: char,
    csv_colum_config_json_str: &str,
  ) -> Result<String, JsError> {
    let outputs: Vec<NextcladeOutputs> = jserr(
      json_parse(outputs_json_str).wrap_err("When serializing results into CSV: When parsing outputs JSON internally"),
    )?;

    let errors: Vec<NextcladeErrorOutputs> = jserr(
      json_parse(errors_json_str).wrap_err("When serializing results into CSV: When parsing errors JSON internally"),
    )?;

    let clade_node_attrs: Vec<CladeNodeAttrKeyDesc> = jserr(
      json_parse(clade_node_attrs_json_str)
        .wrap_err("When serializing results into CSV: When parsing clade node attrs JSON internally"),
    )?;

    let phenotype_attrs: Vec<PhenotypeAttrDesc> = jserr(
      json_parse(phenotype_attrs_json_str)
        .wrap_err("When serializing results into CSV: When parsing phenotypes attr keys JSON internally"),
    )?;

    let aa_motifs_descs: Vec<AaMotifsDesc> = jserr(
      json_parse(aa_motifs_keys_json_str)
        .wrap_err("When serializing results into CSV: When parsing AA motifs keys JSON internally"),
    )?;

    let clade_node_attr_keys = clade_node_attrs.into_iter().map(|attr| attr.name).collect_vec();
    let phenotype_attr_keys = phenotype_attrs.into_iter().map(|attr| attr.name).collect_vec();
    let aa_motifs_keys = aa_motifs_descs.into_iter().map(|desc| desc.name).collect_vec();

    let csv_colum_config: CsvColumnConfig = jserr(
      json_parse(csv_colum_config_json_str)
        .wrap_err("When serializing results JSON: When parsing CSV column config JSON internally"),
    )?;

    jserr(results_to_csv_string(
      &outputs,
      &errors,
      &clade_node_attr_keys,
      &phenotype_attr_keys,
      &aa_motifs_keys,
      delimiter as u8,
      &csv_colum_config,
    ))
  }

  pub fn serialize_insertions_csv(outputs_json_str: &str, errors_json_str: &str) -> Result<String, JsError> {
    let outputs: Vec<NextcladeOutputs> = jserr(
      json_parse(outputs_json_str)
        .wrap_err("When serializing insertions into CSV: When parsing outputs JSON internally"),
    )?;

    let errors: Vec<NextcladeErrorOutputs> = jserr(
      json_parse(errors_json_str).wrap_err("When serializing results into CSV: When parsing errors JSON internally"),
    )?;

    jserr(insertions_to_csv_string(&outputs, &errors))
  }

  pub fn serialize_errors_csv(errors_json_str: &str) -> Result<String, JsError> {
    let errors: Vec<ErrorsFromWeb> = jserr(
      json_parse(errors_json_str).wrap_err("When serializing errors into CSV: When parsing outputs JSON internally"),
    )?;

    jserr(errors_to_csv_string(&errors))
  }
}

#[wasm_bindgen(start)]
pub fn main() {
  wasm_logger::init(wasm_logger::Config::default());
  console_error_panic_hook::set_once();
}
