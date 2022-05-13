use crate::wasm::analyze::{AnalysisInitialData, AnalysisInput, AnalysisResult, Nextclade, NextcladeParams};
use eyre::{Report, WrapErr};
use nextclade::analyze::pcr_primers::PcrPrimer;
use nextclade::analyze::virus_properties::VirusProperties;
use nextclade::io::fasta::{read_one_fasta_str, FastaReader, FastaRecord};
use nextclade::io::gff3::read_gff3_str;
use nextclade::io::json::json_stringify;
use nextclade::qc::qc_config::QcConfig;
use nextclade::tree::tree::AuspiceTree;
use nextclade::types::outputs::NextcladeOutputs;
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
    let nextclade = jserr(Nextclade::new(params))?;
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
    jserr(json_stringify(tree))
  }

  /// Checks that a string containing ref sequence in FASTA format is correct
  pub fn parse_ref_seq_fasta(ref_seq_str: &str) -> Result<String, JsError> {
    let record = jserr(read_one_fasta_str(ref_seq_str))?;
    jserr(json_stringify(&record))
  }

  /// Checks that a string containing Auspice tree in JSON format is correct
  pub fn validate_tree_json(tree_json_str: &str) -> Result<(), JsError> {
    jserr(AuspiceTree::from_str(tree_json_str))?;
    Ok(())
  }

  /// Checks that a string containing gene map in GFF format is correct
  pub fn parse_gene_map_gff(gene_map_gff_str: &str) -> Result<String, JsError> {
    let gene_map = jserr(read_gff3_str(gene_map_gff_str))?;
    jserr(json_stringify(&gene_map))
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
}

#[wasm_bindgen(start)]
pub fn main() {
  wasm_logger::init(wasm_logger::Config::default());
  console_error_panic_hook::set_once();
}
