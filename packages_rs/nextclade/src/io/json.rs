use crate::io::fs::ensure_dir;
use eyre::{Report, WrapErr};
use serde::ser::{SerializeSeq, Serializer};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

pub fn json_parse<T: for<'de> Deserialize<'de>>(s: &str) -> Result<T, Report> {
  let obj = serde_json::from_str::<T>(s).wrap_err("When parsing JSON")?;
  Ok(obj)
}

pub fn json_stringify<T: Serialize>(obj: &T) -> Result<String, Report> {
  serde_json::to_string_pretty(obj).wrap_err("When converting an entry to JSON string")
}

pub fn json_write<T: Serialize>(filepath: impl AsRef<Path>, obj: &T) -> Result<(), Report> {
  const BUF_SIZE: usize = 2 * 1024 * 1024;

  let filepath = filepath.as_ref().to_owned();

  ensure_dir(&filepath)?;

  let file = File::create(&filepath).wrap_err_with(|| format!("When writing file: {filepath:#?}"))?;
  let buf_writer = BufWriter::with_capacity(BUF_SIZE, file);

  serde_json::to_writer_pretty(buf_writer, &obj).wrap_err("When writing JSON to file: {filepath:#?}")
}
