use crate::wasm::jserr::jserr;
use eyre::WrapErr;
use nextclade::io::fasta::{FastaReader, FastaRecord};
use nextclade::io::json::{json_stringify, JsonPretty};
use nextclade::sort::minimizer_index::MinimizerIndexJson;
use nextclade::sort::minimizer_search::{run_minimizer_search, MinimizerSearchRecord};
use nextclade::sort::params::NextcladeSeqSortParams;
use std::io::Read;
use std::str::FromStr;
use wasm_bindgen::prelude::*;

#[wasm_bindgen]
pub struct NextcladeSeqAutodetectWasm {
  minimizer_index: MinimizerIndexJson,
  search_params: NextcladeSeqSortParams,
}

#[wasm_bindgen]
impl NextcladeSeqAutodetectWasm {
  pub fn new(minimizer_index_json_str: &str) -> Result<NextcladeSeqAutodetectWasm, JsError> {
    let minimizer_index = jserr(MinimizerIndexJson::from_str(minimizer_index_json_str))?;
    Ok(Self {
      minimizer_index,
      search_params: NextcladeSeqSortParams::default(),
    })
  }

  pub fn autodetect(&self, qry_fasta_str: &str, callback: &js_sys::Function) -> Result<(), JsError> {
    let mut reader = jserr(FastaReader::from_str(&qry_fasta_str).wrap_err_with(|| "When creating fasta reader"))?;

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

      let result_json = jserr(json_stringify(
        &MinimizerSearchRecord { fasta_record, result },
        JsonPretty(false),
      ))?;

      callback
        .call1(&JsValue::null(), &JsValue::from_str(&result_json))
        .map_err(|err_val| JsError::new(&format!("{err_val:#?}")))?;
    }

    Ok(())
  }
}
