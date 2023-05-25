use crate::io::file::create_file_or_stdout;
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::Path;

pub fn yaml_parse<T: for<'de> Deserialize<'de>>(s: &str) -> Result<T, Report> {
  let result = serde_yaml::from_str(s)?;
  Ok(result)
}

pub fn yaml_stringify<T: Serialize>(obj: &T) -> Result<String, Report> {
  serde_yaml::to_string(obj).wrap_err("When converting an entry to yaml string")
}

pub fn yaml_write_impl<W: Write, T: Serialize>(writer: W, obj: &T) -> Result<(), Report> {
  serde_yaml::to_writer(writer, &obj).wrap_err("When writing yaml")
}

pub fn yaml_write<T: Serialize>(filepath: impl AsRef<Path>, obj: &T) -> Result<(), Report> {
  let filepath = filepath.as_ref();
  let file = create_file_or_stdout(filepath)?;
  yaml_write_impl(file, &obj).wrap_err("When writing yaml to file: {filepath:#?}")
}
