use crate::wasm::jserr::jserr;
use chrono::Duration;
use eyre::WrapErr;
use nextclade::io::fasta::{FastaReader, FastaRecord};
use nextclade::io::json::json_parse;
use nextclade::sort::minimizer_index::MinimizerIndexJson;
use nextclade::sort::minimizer_search::{run_minimizer_search, MinimizerSearchRecord};
use nextclade::sort::params::NextcladeSeqSortParams;
use nextclade::utils::datetime::date_now;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::io::Read;
use std::str::FromStr;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
#[derive(Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeSeqAutodetectWasmParams {
  batch_interval_ms: i64,
  max_batch_size: usize,
}

impl Default for NextcladeSeqAutodetectWasmParams {
  fn default() -> Self {
    Self {
      batch_interval_ms: 500,
      max_batch_size: 100,
    }
  }
}

#[wasm_bindgen]
pub struct NextcladeSeqAutodetectWasm {
  minimizer_index: MinimizerIndexJson,
  search_params: NextcladeSeqSortParams,
  run_params: NextcladeSeqAutodetectWasmParams,
}

#[wasm_bindgen]
impl NextcladeSeqAutodetectWasm {
  pub fn new(minimizer_index_json_str: &str, params: &str) -> Result<NextcladeSeqAutodetectWasm, JsError> {
    let minimizer_index = jserr(MinimizerIndexJson::from_str(minimizer_index_json_str))?;
    Ok(Self {
      minimizer_index,
      search_params: NextcladeSeqSortParams::default(),
      run_params: jserr(json_parse(params))?,
    })
  }

  pub fn autodetect(&self, qry_fasta_str: &str, callback: &js_sys::Function) -> Result<(), JsError> {
    let mut reader = jserr(FastaReader::from_str(&qry_fasta_str).wrap_err_with(|| "When creating fasta reader"))?;

    let mut batch = vec![];
    let mut last_flush = date_now();

    loop {
      let mut fasta_record = FastaRecord::default();
      jserr(reader.read(&mut fasta_record).wrap_err("When reading a fasta record"))?;
      if fasta_record.is_empty() {
        break;
      }

      let result = jserr(
        run_minimizer_search(&fasta_record, &self.minimizer_index, &self.search_params).wrap_err_with(|| {
          format!(
            "When processing sequence #{} '{}'",
            fasta_record.index, fasta_record.seq_name
          )
        }),
      )?;

      batch.push(MinimizerSearchRecord { fasta_record, result });

      if (date_now() - last_flush >= Duration::milliseconds(self.run_params.batch_interval_ms))
        || batch.len() >= self.run_params.max_batch_size
      {
        let result_js = serde_wasm_bindgen::to_value(&batch)?;
        callback
          .call1(&JsValue::null(), &result_js)
          .map_err(|err_val| JsError::new(&format!("{err_val:#?}")))?;
        last_flush = date_now();
        batch.clear();
      }
    }

    let result_js = serde_wasm_bindgen::to_value(&batch)?;
    callback
      .call1(&JsValue::null(), &result_js)
      .map_err(|err_val| JsError::new(&format!("{err_val:#?}")))?;
    batch.clear();

    Ok(())
  }
}
