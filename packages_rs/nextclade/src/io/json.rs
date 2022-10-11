use crate::io::file::create_file;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::path::Path;

pub fn json_parse<T: for<'de> Deserialize<'de>>(s: &str) -> Result<T, Report> {
  let mut de = serde_json::Deserializer::from_str(s);
  de.disable_recursion_limit();
  let de = serde_stacker::Deserializer::new(&mut de);
  let obj = T::deserialize(de).wrap_err("When parsing JSON")?;
  Ok(obj)
}

pub fn json_parse_bytes<T: for<'de> Deserialize<'de>>(bytes: &[u8]) -> Result<T, Report> {
  let mut de = serde_json::Deserializer::from_slice(bytes);
  de.disable_recursion_limit();
  let de = serde_stacker::Deserializer::new(&mut de);
  let obj = T::deserialize(de).wrap_err("When parsing JSON")?;
  Ok(obj)
}

pub fn json_stringify<T: Serialize>(obj: &T) -> Result<String, Report> {
  serde_json::to_string_pretty(obj).wrap_err("When converting an entry to JSON string")
}

pub fn json_write<T: Serialize>(filepath: impl AsRef<Path>, obj: &T) -> Result<(), Report> {
  let filepath = filepath.as_ref();
  let file = create_file(filepath)?;
  serde_json::to_writer_pretty(file, &obj).wrap_err("When writing JSON to file: {filepath:#?}")
}
