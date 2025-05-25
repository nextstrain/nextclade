use log::Level;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen(start)]
pub fn main() {
  wasm_logger::init(wasm_logger::Config::new(Level::Info));
  console_error_panic_hook::set_once();
}

mod wasm;
