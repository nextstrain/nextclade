use eyre::Report;
use nextclade::utils::error::report_to_string;
use wasm_bindgen::JsError;

/// Converts Result's Err variant from eyre::Report to wasm_bindgen::JsError
pub fn jserr<T>(result: Result<T, Report>) -> Result<T, JsError> {
  result.map_err(|report| JsError::new(&report_to_string(&report)))
}
