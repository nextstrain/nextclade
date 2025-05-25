use crate::wasm::jserr::jserr;
use eyre::{Report, WrapErr};
use itertools::Itertools;
use nextclade::analyze::virus_properties::{AaMotifsDesc, PhenotypeAttrDesc};
use nextclade::io::csv::{CsvVecWriter, VecWriter};
use nextclade::io::fasta::{read_one_fasta_from_str, FastaReader, FastaRecord};
use nextclade::io::genbank_tbl::results_to_tbl_string;
use nextclade::io::gff3_writer::results_to_gff_string;
use nextclade::io::json::{json_parse, json_stringify, JsonPretty};
use nextclade::io::nextclade_csv::results_to_csv_string;
use nextclade::io::nextclade_csv_column_config::CsvColumnConfig;
use nextclade::io::results_json::{results_to_json_string, results_to_ndjson_string};
use nextclade::io::xlsx::{book_save_to_buffer, results_to_excel_sheet, sanitize_sheet_name};
use nextclade::run::nextclade_wasm::{
  AnalysisInitialData, Nextclade, NextcladeParams, NextcladeParamsRaw, NextcladeResult,
};
use nextclade::run::params::NextcladeInputParamsOptional;
use nextclade::tree::tree::{AuspiceRefNodesDesc, CladeNodeAttrKeyDesc};
use nextclade::types::outputs::{NextcladeErrorOutputs, NextcladeOutputs};
use nextclade::utils::encode::base64_encode;
use nextclade::utils::error::report_to_string;
use nextclade::{make_internal_report, o};
use rust_xlsxwriter::{Workbook, Worksheet};
use std::collections::BTreeMap;
use wasm_bindgen::prelude::*;

/// Nextclade WebAssembly module.
///
/// Encapsulates all the Nextclade Rust functionality required for Nextclade Web to operate.
#[wasm_bindgen]
pub struct NextcladeWasm {
  nextclades: BTreeMap<String, Nextclade>,
}

#[wasm_bindgen]
impl NextcladeWasm {
  pub fn new(params: &str) -> Result<NextcladeWasm, JsError> {
    let params_raw: NextcladeParamsRaw =
      jserr(json_parse(params).wrap_err_with(|| "When parsing Nextclade params JSON"))?;

    let inputs: Vec<NextcladeParams> =
      jserr(NextcladeParams::from_raw(params_raw).wrap_err_with(|| "When parsing raw Nextclade params"))?;

    // FIXME: pass params from the frontend
    let params = NextcladeInputParamsOptional::default();

    let nextclades = jserr(
      inputs
        .into_iter()
        .map(|inputs| {
          let dataset_name = inputs.dataset_name.clone();
          let nextclade = Nextclade::new(inputs, vec![], &params)
            .wrap_err_with(|| format!("When initializing Nextclade runner for {dataset_name}"))?;
          Ok((dataset_name, nextclade))
        })
        .collect::<Result<BTreeMap<String, Nextclade>, Report>>(),
    )?;

    Ok(Self { nextclades })
  }

  fn get_nextclade_for_dataset(&self, dataset_name: &str) -> Result<&Nextclade, JsError> {
    jserr(
      self
        .nextclades
        .get(dataset_name)
        .ok_or_else(|| make_internal_report!("Nextclade instance is not found for dataset '{dataset_name}'")),
    )
  }

  fn get_mut_nextclade_for_dataset(&mut self, dataset_name: &str) -> Result<&mut Nextclade, JsError> {
    jserr(
      self
        .nextclades
        .get_mut(dataset_name)
        .ok_or_else(|| make_internal_report!("Nextclade instance is not found for dataset '{dataset_name}'")),
    )
  }

  pub fn parse_query_sequences(qry_fasta_str: &str, callback: &js_sys::Function) -> Result<(), JsError> {
    let mut reader = jserr(FastaReader::from_str(&qry_fasta_str).wrap_err_with(|| "When creating fasta reader"))?;

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

  pub fn get_initial_data(&self, dataset_name: &str) -> Result<String, JsError> {
    let initial_data = self.get_nextclade_for_dataset(dataset_name)?.get_initial_data();
    jserr(json_stringify(&initial_data, JsonPretty(false)))
  }

  /// Runs analysis on one sequence and returns its result. This runs in many webworkers concurrently.
  pub fn analyze(& self, dataset_name: &str, input: &str) -> Result<String, JsError> {
    let input: FastaRecord = jserr(json_parse(input).wrap_err("When parsing FASTA record JSON"))?;

    let nextclade = jserr(
      self
        .nextclades
        .get(dataset_name)
        .ok_or_else(|| make_internal_report!("Nextclade instance is not found for dataset '{dataset_name}'")),
    )?;

    let result = jserr(match nextclade.run(&input) {
      Ok(result) => Ok(NextcladeResult {
        index: input.index,
        seq_name: input.seq_name.clone(),
        result: Some(result),
        error: None,
      }),
      Err(err) => Ok(NextcladeResult {
        index: input.index,
        seq_name: input.seq_name.clone(),
        result: None,
        error: Some(report_to_string(&err)),
      }),
    })?;

    jserr(json_stringify(&result, JsonPretty(false)))
  }

  /// Takes ALL analysis results, runs tree placement and returns output tree.
  /// This should only run once, in one of the webworkers.
  pub fn get_output_trees(&mut self, dataset_name: &str, nextclade_outputs_json_str: &str) -> Result<String, JsError> {
    let nextclade_outputs = jserr(NextcladeOutputs::many_from_str(nextclade_outputs_json_str))?;
    let trees = jserr(
      self
        .get_mut_nextclade_for_dataset(dataset_name)?
        .get_output_trees(nextclade_outputs),
    )?;
    jserr(json_stringify(&trees, JsonPretty(false)))
  }

  /// Checks that a string containing ref sequence in FASTA format is correct
  pub fn parse_ref_seq_fasta(ref_seq_str: &str) -> Result<String, JsError> {
    let record = jserr(read_one_fasta_from_str(ref_seq_str))?;
    jserr(json_stringify(&record, JsonPretty(false)))
  }

  #[allow(clippy::needless_pass_by_value)]
  pub fn serialize_results_json(
    outputs_json_str: &str,
    errors_json_str: &str,
    clade_node_attrs_json_str: &str,
    phenotype_attrs_json_str: &str,
    ref_nodes_json_str: &str,
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

    let ref_nodes: AuspiceRefNodesDesc = jserr(
      json_parse(ref_nodes_json_str).wrap_err("When serializing results JSON: When parsing ref nodes JSON internally"),
    )?;

    jserr(
      results_to_json_string(
        &outputs,
        &errors,
        &clade_node_attrs,
        &phenotype_attrs,
        &ref_nodes,
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

  pub fn serialize_results_gff(outputs_json_str: &str) -> Result<String, JsError> {
    let outputs: Vec<NextcladeOutputs> = jserr(
      json_parse(outputs_json_str).wrap_err("When serializing results into GFF: When parsing outputs JSON internally"),
    )?;
    jserr(results_to_gff_string(&outputs))
  }

  pub fn serialize_results_tbl(outputs_json_str: &str) -> Result<String, JsError> {
    let outputs: Vec<NextcladeOutputs> = jserr(
      json_parse(outputs_json_str).wrap_err("When serializing results into GFF: When parsing outputs JSON internally"),
    )?;
    jserr(results_to_tbl_string(&outputs))
  }

  pub fn serialize_results_csv(
    outputs_json_str: &str,
    errors_json_str: &str,
    clade_node_attrs_json_str: &str,
    phenotype_attrs_json_str: &str,
    ref_nodes_json_str: &str,
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

    let clade_node_attr_descs: Vec<CladeNodeAttrKeyDesc> = jserr(
      json_parse(clade_node_attrs_json_str)
        .wrap_err("When serializing results into CSV: When parsing clade node attrs JSON internally"),
    )?;

    let phenotype_attrs: Vec<PhenotypeAttrDesc> = jserr(
      json_parse(phenotype_attrs_json_str)
        .wrap_err("When serializing results into CSV: When parsing phenotypes attr keys JSON internally"),
    )?;

    let ref_nodes: AuspiceRefNodesDesc = jserr(
      json_parse(ref_nodes_json_str)
        .wrap_err("When serializing results into CSV: When parsing ref nodes JSON internally"),
    )?;

    let aa_motifs_descs: Vec<AaMotifsDesc> = jserr(
      json_parse(aa_motifs_keys_json_str)
        .wrap_err("When serializing results into CSV: When parsing AA motifs keys JSON internally"),
    )?;

    let phenotype_attr_keys = phenotype_attrs.into_iter().map(|attr| attr.name).collect_vec();
    let aa_motifs_keys = aa_motifs_descs.into_iter().map(|desc| desc.name).collect_vec();

    let csv_colum_config: CsvColumnConfig = jserr(
      json_parse(csv_colum_config_json_str)
        .wrap_err("When serializing results JSON: When parsing CSV column config JSON internally"),
    )?;

    jserr(results_to_csv_string(
      &outputs,
      &errors,
      &clade_node_attr_descs,
      &phenotype_attr_keys,
      &ref_nodes,
      &aa_motifs_keys,
      delimiter as u8,
      &csv_colum_config,
    ))
  }

  pub fn serialize_results_excel(
    outputs_json_str: &str,
    errors_json_str: &str,
    all_initial_data: &str,
    csv_colum_config_json_str: &str,
    dataset_name_to_seq_indices_str: &str,
    seq_indices_without_dataset_suggestions_str: &str,
  ) -> Result<String, JsError> {
    let outputs: Vec<NextcladeOutputs> = jserr(
      json_parse(outputs_json_str)
        .wrap_err("When serializing results into Excel: When parsing outputs JSON internally"),
    )?;

    let errors: Vec<NextcladeErrorOutputs> = jserr(
      json_parse(errors_json_str).wrap_err("When serializing results into Excel: When parsing errors JSON internally"),
    )?;

    let all_initial_data: BTreeMap<String, AnalysisInitialData> = jserr(
      json_parse(all_initial_data)
        .wrap_err("When serializing results into Excel: When parsing initial data JSON internally"),
    )?;

    let column_config: CsvColumnConfig = jserr(
      json_parse(csv_colum_config_json_str)
        .wrap_err("When serializing results into Excel: When parsing Excel column config JSON internally"),
    )?;

    let dataset_name_to_seq_indices: BTreeMap<String, Vec<usize>> =
      jserr(json_parse(dataset_name_to_seq_indices_str).wrap_err(
        "When serializing results into Excel: When parsing `dataset_name_to_seq_indices_str` JSON internally",
      ))?;

    let seq_indices_without_dataset_suggestions: Vec<usize> =
      jserr(json_parse(seq_indices_without_dataset_suggestions_str).wrap_err(
        "When serializing results into Excel: When parsing `seq_indices_without_dataset_suggestions_str` JSON internally",
      ))?;

    let sheets = jserr(
      all_initial_data
        .iter()
        .map(|(dataset_name, initial_data)| -> Result<_, Report> {
          let seq_indices = dataset_name_to_seq_indices
            .get(dataset_name)
            .cloned()
            .unwrap_or_default();

          let outputs = outputs
            .iter()
            .filter(|output| seq_indices.contains(&output.index))
            .cloned()
            .collect_vec();

          let errors = errors
            .iter()
            .filter(|error| seq_indices.contains(&error.index))
            .cloned()
            .collect_vec();

          let mut sheet = results_to_excel_sheet(&outputs, &errors, initial_data, &column_config)?;
          sheet.set_name(sanitize_sheet_name(dataset_name))?;
          Ok(sheet)
        })
        .collect::<Result<Vec<_>, Report>>(),
    )?;

    let mut book = Workbook::new();
    for sheet in sheets {
      book.push_worksheet(sheet);
    }

    // Add a sheet for "unclassified" sequences
    if !seq_indices_without_dataset_suggestions.is_empty() {
      let mut sheet = Worksheet::new();
      sheet.set_name("unclassified")?;
      sheet.write_string(0, 0, "index")?;
      sheet.write_string(0, 1, "seqName")?;
      for (irow, seq_index) in seq_indices_without_dataset_suggestions.iter().enumerate() {
        let seq_name = errors
          .iter()
          .find_map(|error| (error.index == *seq_index).then_some(error.seq_name.clone()));

        sheet.write_string((irow + 1) as u32, 0, seq_index.to_string())?;

        if let Some(seq_name) = seq_name {
          sheet.write_string((irow + 1) as u32, 1, seq_name)?;
        }
      }
      book.push_worksheet(sheet);
    }

    let buf = jserr(book_save_to_buffer(&mut book))?;

    Ok(base64_encode(&buf))
  }

  pub fn serialize_unknown_csv(
    errors_json_str: &str,
    seq_indices_without_dataset_suggestions_str: &str,
    delimiter: char,
  ) -> Result<String, JsError> {
    let errors: Vec<NextcladeErrorOutputs> = jserr(
      json_parse(errors_json_str).wrap_err("When serializing results into Excel: When parsing errors JSON internally"),
    )?;

    let seq_indices_without_dataset_suggestions: Vec<usize> =
      jserr(json_parse(seq_indices_without_dataset_suggestions_str).wrap_err(
        "When serializing results into Excel: When parsing `seq_indices_without_dataset_suggestions_str` JSON internally",
      ))?;

    let errors = errors
      .iter()
      .filter(|error| seq_indices_without_dataset_suggestions.contains(&error.index))
      .map(|error| (error.index, error.seq_name.clone()))
      .collect_vec();

    let mut buf = Vec::<u8>::new();

    {
      let headers = vec![o!("index"), o!("seqName")];
      let mut csv_writer = jserr(CsvVecWriter::new(&mut buf, delimiter as u8, &headers))?;
      for (index, seq_name) in errors {
        jserr(csv_writer.write(vec![index.to_string(), seq_name]))?;
      }
    }

    Ok(String::from_utf8(buf)?)
  }
}
