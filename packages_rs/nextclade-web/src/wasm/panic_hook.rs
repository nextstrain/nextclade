use eyre::Report;
/// Adapted from https://github.com/rustwasm/console_error_panic_hook
use log;
use schemars::_private::NoSerialize;
use std::panic::{set_hook, PanicInfo};
use std::sync::Once;
use wasm_bindgen::prelude::wasm_bindgen;
use wasm_bindgen::{JsError, JsValue};
use web_sys::Event;

#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(js_namespace = console)]
  fn error(msg: String);

  type Error;

  #[wasm_bindgen(constructor)]
  fn new() -> Error;

  #[wasm_bindgen(structural, method, getter)]
  fn stack(error: &Error) -> String;
}

fn hook_impl(info: &PanicInfo) {
  let mut msg = info.to_string();

  // Add the error stack to our message.
  //
  // This ensures that even if the `console` implementation doesn't
  // include stacks for `console.error`, the stack is still available
  // for the user. Additionally, Firefox's console tries to clean up
  // stack traces, and ruins Rust symbols in the process
  // (https://bugzilla.mozilla.org/show_bug.cgi?id=1519569) but since
  // it only touches the logged message's associated stack, and not
  // the message's contents, by including the stack in the message
  // contents we make sure it is available to the user.
  msg.push_str("\n\nStack:\n\n");
  let e = Error::new();
  let stack = e.stack();
  msg.push_str(&stack);

  // Safari's devtools, on the other hand, _do_ mess with logged
  // messages' contents, so we attempt to break their heuristics for
  // doing that by appending some whitespace.
  // https://github.com/rustwasm/console_error_panic_hook/issues/7
  msg.push_str("\n\n");

  js_sys::eval(
    // language=javascript
    r#"
    'use strict';

    (function() {
       throw new Error('<<<<<<<<<<<<<<< HELLOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO >>>>>>>>>>>>>>>')
    })()
  "#,
  )
  .map_err(|err| {
    log::error!("js_sys::eval failed: {err:#?}");
  })
  .ok();

  send_error_event().unwrap();

  // Finally, log the panic with `console.error`!
  // log::error!("{}", &msg);
  // error(msg);

  // wasm_bindgen::throw_val(JsValue::from_str("Hello"));

  // wasm_bindgen::throw_val(JsValue::from(JsError::new(&msg)));

  // js_sys::Function::new_no_args("{\
  //
  // \
  // ");
  //
  // JsError::new("message")
}

fn send_error_event() -> Result<(), JsValue> {
  let global = js_sys::global();
  if global.is_null() {
    log::info!("{}", global.to_string());
  } else {
    log::info!("no global");
  }

  if let Some(window) = web_sys::window() {
    log::info!("window");
    if !window.dispatch_event(&Event::new("error")?)? {
      log::error!("Unable to dispatch error event");
    }
  } else {
    log::info!("no window");
  }
  Ok(())
}

/// A panic hook for use with
/// [`std::panic::set_hook`](https://doc.rust-lang.org/nightly/std/panic/fn.set_hook.html)
/// that logs panics into
/// [`console.error`](https://developer.mozilla.org/en-US/docs/Web/API/Console/error).
///
/// On non-wasm targets, prints the panic to `stderr`.
pub fn hook(info: &PanicInfo) {
  hook_impl(info);
}

/// Set the `console.error` panic hook the first time this is called. Subsequent
/// invocations do nothing.
#[inline]
pub fn set_once() {
  static SET_HOOK: Once = Once::new();
  SET_HOOK.call_once(|| {
    set_hook(Box::new(hook));
  });
}
