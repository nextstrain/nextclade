use crate::io::file::create_file_or_stdout;
use crate::io::yaml::yaml_write;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use serde_json::{de::Read, Deserializer};
use std::io::Write;
use std::path::Path;

/// Check whether a serde value serializes to null.
///
/// This is useful to skip a generic struct field even if we don't know the exact type
///
/// Usage: add attribute `#[serde(skip_serializing_if = "is_json_value_null")]` to a struct field you want to skip
pub fn is_json_value_null<T: Serialize>(t: &T) -> bool {
  serde_json::to_value(t).unwrap_or(serde_json::Value::Null).is_null()
}

/// Mitigates recursion limit error when parsing large JSONs
/// See https://github.com/serde-rs/json/issues/334
pub fn deserialize_without_recursion_limit<'de, R: Read<'de>, T: Deserialize<'de>>(
  de: &mut Deserializer<R>,
) -> Result<T, Report> {
  de.disable_recursion_limit();
  let de = serde_stacker::Deserializer::new(de);
  let obj = T::deserialize(de).wrap_err("When parsing JSON")?;
  Ok(obj)
}

pub fn json_parse<T: for<'de> Deserialize<'de>>(s: impl AsRef<str>) -> Result<T, Report> {
  let mut de = Deserializer::from_str(s.as_ref());
  deserialize_without_recursion_limit(&mut de)
}

pub fn json_parse_bytes<T: for<'de> Deserialize<'de>>(bytes: &[u8]) -> Result<T, Report> {
  let mut de = Deserializer::from_slice(bytes);
  deserialize_without_recursion_limit(&mut de)
}

#[derive(Clone, Copy, Debug)]
pub struct JsonPretty(pub bool);

pub fn json_stringify<T: Serialize>(obj: &T, pretty: JsonPretty) -> Result<String, Report> {
  if pretty.0 {
    serde_json::to_string_pretty(obj)
  } else {
    serde_json::to_string(obj)
  }
  .wrap_err("When converting an entry to JSON string")
}

pub fn json_write_impl<W: Write, T: Serialize>(writer: W, obj: &T, pretty: JsonPretty) -> Result<(), Report> {
  if pretty.0 {
    serde_json::to_writer_pretty(writer, &obj)
  } else {
    serde_json::to_writer(writer, &obj)
  }
  .wrap_err("When writing JSON")
}

pub fn json_write<T: Serialize>(filepath: impl AsRef<Path>, obj: &T, pretty: JsonPretty) -> Result<(), Report> {
  let filepath = filepath.as_ref();
  let file = create_file_or_stdout(filepath)?;
  json_write_impl(file, &obj, pretty).wrap_err("When writing JSON to file: {filepath:#?}")
}

pub fn json_or_yaml_write<T: Serialize>(filepath: impl AsRef<Path>, obj: &T) -> Result<(), Report> {
  let filepath = filepath.as_ref();
  let filepath_str = filepath.to_string_lossy();
  if filepath_str.ends_with("yaml") || filepath_str.ends_with("yml") {
    yaml_write(filepath, &obj)
  } else {
    json_write(filepath, &obj, JsonPretty(true))
  }
}
