use eyre::Report;
use nextclade::utils::error::report_to_string;
use std::panic::PanicHookInfo;
use std::sync::Once;
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
/// file location, panic reason, and JS stack trace, making errors actionable for users and
/// developers.
///
/// Uses `console_error_panic_hook` for console logging with stack traces and browser
/// workarounds (Firefox stack mangling, Safari message manipulation), then throws a JS
/// error via `throw_str()` to replace wasm-bindgen's generic error.
///
/// # Memory Leak Note
///
/// This hook uses `wasm_bindgen::throw_str()` which does not run Rust destructors. This is
/// acceptable because:
/// - WASM defaults to `panic=abort` which doesn't run destructors anyway
/// - Panic state means WASM instance is compromised and will be destroyed
/// - WASM linear memory is freed when the instance is garbage collected
/// - Nextclade workers destroy the WASM instance after any panic
///
/// The memory "leak" is bounded by the WASM instance lifetime and cleaned up on instance
/// destruction.
///
/// # Idempotency
///
/// This function uses `std::sync::Once` internally, so multiple calls are safe and only the
/// first call installs the hook.
pub fn install_panic_hook() {
  static SET_HOOK: Once = Once::new();
  SET_HOOK.call_once(|| {
    std::panic::set_hook(Box::new(custom_panic_hook));
  });
}

fn custom_panic_hook(info: &PanicHookInfo<'_>) {
  // Log to console with full stack trace and browser workarounds.
  // Handles: JS stack capture, Firefox stack mangling, Safari message manipulation.
  console_error_panic_hook::hook(info);

  // Throw a proper JS Error object with the panic message.
  // This replaces wasm-bindgen's generic "null pointer passed to rust" error.
  // The Error object gets .message, .stack, and .name properties automatically.
  //
  // Note: throw_val() does not run destructors, but this is acceptable in panic context
  // because WASM instance state is already compromised and will be destroyed.
  wasm_bindgen::throw_val(JsError::new(&info.to_string()).into());
}
