use wasm_bindgen::prelude::*;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
extern "C" {
  fn alert(s: &str);
}

#[wasm_bindgen]
pub fn greet() {
  wasm_logger::init(wasm_logger::Config::default());
  console_error_panic_hook::set_once();

  log::debug!("Hello");

  // alert("Hello!");
}
