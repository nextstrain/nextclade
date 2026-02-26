use eyre::Report;
use nextclade::utils::error::report_to_string;
use std::panic::{Location, PanicHookInfo};
use std::sync::Once;
use wasm_bindgen::prelude::wasm_bindgen;
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
/// This hook intercepts the panic and throws a JS error with the actual message, formatted as
/// an internal error with file location and JS stack trace.
///
/// # Memory Leak Note
///
/// This hook uses `wasm_bindgen::throw_val()` which does not run Rust destructors. This is
/// acceptable because:
/// - WASM defaults to `panic=abort` which doesn't run destructors anyway
/// - Panic state means WASM instance is compromised and will be destroyed
/// - WASM linear memory is freed when the instance is garbage collected
/// - Nextclade workers destroy the WASM instance after any panic
///
/// # Idempotency
///
/// This function uses `std::sync::Once` internally, so multiple calls are safe and only the
/// first call installs the hook.
pub fn install_panic_hook() {
  static SET_HOOK: Once = Once::new();
  SET_HOOK.call_once(|| {
    std::panic::set_hook(Box::new(panic_hook));
  });
}

fn panic_hook(info: &PanicHookInfo<'_>) {
  let payload = info.payload_as_str().unwrap_or("Unknown panic");
  let location = info.location().map(Location::to_string);

  // Format matching ErrorInternal from src/helpers/ErrorInternal.ts
  let user_message = match location {
    Some(loc) => format!(
      "Internal Error: {payload}. This is an internal issue, likely due to a programming mistake. Please report it to developers!\n\nLocation: {loc}"
    ),
    None => format!(
      "Internal Error: {payload}. This is an internal issue, likely due to a programming mistake. Please report it to developers!"
    ),
  };

  // Build console message with JS stack trace.
  // Stack is included in message body because:
  // - Some browsers don't attach stacks to console.error
  // - Firefox mangles Rust symbols in stack traces (Mozilla bug 1519569)
  // Trailing whitespace breaks Safari's devtools heuristics that mangle logged messages.
  // See: https://github.com/rustwasm/console_error_panic_hook/issues/7
  let js_stack = Error::new().stack();
  let console_message = format!("{user_message}\n\nStack:\n\n{js_stack}\n\n");

  // Log to console with full details
  error(console_message);

  // Throw JS Error with custom name for identification.
  // Note: throw_val() does not run destructors, but acceptable in panic context.
  let js_error = Error::new_with_message(&user_message);
  js_error.set_name("ErrorInternalWasm");
  wasm_bindgen::throw_val(js_error.into());
}

// JS bindings for panic hook (vendored from console_error_panic_hook)
#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  fn error(msg: String);

  type Error;

  #[wasm_bindgen(constructor)]
  fn new() -> Error;

  #[wasm_bindgen(constructor)]
  fn new_with_message(message: &str) -> Error;

  #[wasm_bindgen(structural, method, getter)]
  fn stack(error: &Error) -> String;

  #[wasm_bindgen(structural, method, setter)]
  fn set_name(error: &Error, name: &str);
}
