#![allow(deprecated)] // FIXME

use serde::{Deserialize, Serialize};
use std::fmt::Debug;
use wasm_bindgen::prelude::{JsError, JsValue};

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
