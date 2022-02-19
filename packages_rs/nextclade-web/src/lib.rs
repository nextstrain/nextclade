use wasm_bindgen::prelude::*;

use nextclade::analyze::analyze::{AnalysisInput, AnalysisResult, Nextclade, NextcladeParams};
use nextclade::utils::error::report_to_string;

#[global_allocator]
static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

#[wasm_bindgen]
pub struct NextcladeWasm {
  nextclade: Nextclade,
}

#[wasm_bindgen]
impl NextcladeWasm {
  #[wasm_bindgen(constructor)]
  pub fn new(params: &NextcladeParams) -> Self {
    wasm_logger::init(wasm_logger::Config::default());
    console_error_panic_hook::set_once();

    log::debug!("NextcladeWasm::new");

    Self {
      nextclade: Nextclade::new(params),
    }
  }

  pub fn run(&mut self, input: &AnalysisInput) -> Result<AnalysisResult, JsError> {
    log::debug!("NextcladeWasm::run(), input:\n{input:#?}");

    self
      .nextclade
      .run(input)
      .map_err(|report| JsError::new(&report_to_string(&report)))
  }
}
