#![allow(clippy::use_self)]

use crate::wasm::js_value::{deserialize_js_value, serialize_js_value};
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use typescript_definitions::TypescriptDefinition;
use wasm_bindgen::prelude::{wasm_bindgen, JsError};

// Plain old Javascript Objects (POJO) to ensure type safety in `JsValue` serialization.
// They are convenient to use in constructors of complex types.
#[wasm_bindgen]
extern "C" {
  #[wasm_bindgen(typescript_type = "NextcladeParamsPojo")]
  pub type NextcladeParamsPojo;

  #[wasm_bindgen(typescript_type = "AnalysisInputPojo")]
  pub type AnalysisInputPojo;

  #[wasm_bindgen(typescript_type = "AnalysisResultPojo")]
  pub type AnalysisResultPojo;
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct NextcladeParams {
  pub foo: i32,
}

#[wasm_bindgen]
impl NextcladeParams {
  pub fn from_js(params: &NextcladeParamsPojo) -> Result<NextcladeParams, JsError> {
    deserialize_js_value::<NextcladeParams>(params)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct AnalysisInput {
  #[wasm_bindgen(getter_with_clone)]
  pub bar: String,
}

#[wasm_bindgen]
impl AnalysisInput {
  pub fn from_js(input: &AnalysisInputPojo) -> Result<AnalysisInput, JsError> {
    deserialize_js_value::<AnalysisInput>(input)
  }
}

#[wasm_bindgen]
#[derive(Clone, Serialize, Deserialize, TypescriptDefinition, Debug)]
pub struct AnalysisResult {
  pub foo: i32,

  #[wasm_bindgen(getter_with_clone)]
  pub bar: String,
}

#[wasm_bindgen]
impl AnalysisResult {
  pub fn to_js(&self) -> Result<AnalysisResultPojo, JsError> {
    serialize_js_value::<AnalysisResult, AnalysisResultPojo>(self)
  }
}

pub struct Nextclade {
  foo: i32,
}

impl Nextclade {
  pub fn new(params: &NextcladeParams) -> Self {
    Self { foo: params.foo }
  }

  pub fn run(&mut self, input: &AnalysisInput) -> Result<AnalysisResult, Report> {
    Ok(AnalysisResult {
      foo: self.foo,
      bar: input.bar.clone(),
    })
  }
}
