#![allow(clippy::use_self)]

use eyre::Report;
use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use typescript_definitions::{TypeScriptify, TypeScriptifyTrait, TypescriptDefinition};
use wasm_bindgen::prelude::{wasm_bindgen, JsError, JsValue};

pub fn serialize_js_value<T, U>(value: &T) -> Result<U, JsError>
where
  T: Serialize + Debug,
  U: From<JsValue>,
{
  JsValue::from_serde::<T>(value)
    // We want a concrete struct type `U` as output
    .map(U::from)
    // In case of error we throw a JS exception
    .map_err(|report| {
    let message = report.to_string();
    let type_name = std::any::type_name::<T>();
    JsError::new(&format!(
      "{message:}.\nWhen serializing '{type_name:}' into 'JsValue'.\nThe input value was:\n  {value:#?}"
    ))
  })
}

pub fn deserialize_js_value<T>(value: &JsValue) -> Result<T, JsError>
where
  T: for<'de> Deserialize<'de> + Debug,
{
  value.into_serde::<T>().map_err(|report| {
    let message = report.to_string();
    let type_name = std::any::type_name::<T>();
    JsError::new(&format!(
      "{message:}.\nWhen deserializing 'JsValue' into '{type_name:}'.\nThe input value was:\n  {value:#?}"
    ))
  })
}

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
