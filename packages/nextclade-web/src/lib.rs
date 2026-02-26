use crate::wasm::jserr::install_panic_hook;
use log::Level;
use wasm_bindgen::prelude::wasm_bindgen;

#[wasm_bindgen(start)]
pub fn main() {
  wasm_logger::init(wasm_logger::Config::new(Level::Info));
  install_panic_hook();
}

mod wasm;
