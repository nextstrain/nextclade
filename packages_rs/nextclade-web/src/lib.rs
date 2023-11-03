use crate::wasm::panic_hook;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen(start)]
pub fn main() {
  wasm_logger::init(wasm_logger::Config::default());
  panic_hook::set_once();
}

mod wasm;
