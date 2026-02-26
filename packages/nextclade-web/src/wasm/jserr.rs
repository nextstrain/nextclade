use eyre::Report;
use nextclade::utils::error::report_to_string;
use std::panic::PanicHookInfo;
use wasm_bindgen::{JsError, JsValue};

/// Converts Result's Err variant from eyre::Report to wasm_bindgen::JsError
pub fn jserr<T>(result: Result<T, Report>) -> Result<T, JsError> {
  result.map_err(|report| JsError::new(&report_to_string(&report)))
}

/// Converts Result's Err variant from eyre::Report to wasm_bindgen::JsError
pub fn jserr2<T>(result: Result<T, JsValue>) -> Result<T, JsError> {
  result.map_err(|err_val| JsError::new(&format!("{err_val:#?}")))
}

/// Installs a custom panic hook that throws JS errors with the actual panic message.
///
/// When Rust panics in WASM, wasm-bindgen throws a generic "null pointer passed to rust" error.
/// This hook intercepts the panic and throws a JS error with the actual message, including
/// file location and panic reason, making errors actionable for users and developers.
pub fn install_panic_hook() {
  std::panic::set_hook(Box::new(custom_panic_hook));
}

fn custom_panic_hook(info: &PanicHookInfo<'_>) {
  let message = format_panic_info(info);

  // Log to console for debugging
  web_sys::console::error_1(&message.clone().into());

  // Throw a JS error with the actual panic message.
  // This replaces wasm-bindgen's generic "null pointer passed to rust" error.
  wasm_bindgen::throw_str(&message);
}

fn format_panic_info(info: &PanicHookInfo<'_>) -> String {
  let payload = info
    .payload()
    .downcast_ref::<&str>()
    .map(|s| (*s).to_owned())
    .or_else(|| info.payload().downcast_ref::<String>().cloned())
    .unwrap_or_else(|| "Unknown panic".to_owned());

  let location = info.location().map_or_else(
    || "unknown location".to_owned(),
    |loc| format!("{}:{}:{}", loc.file(), loc.line(), loc.column()),
  );

  format!("Rust panic at {location}: {payload}")
}
