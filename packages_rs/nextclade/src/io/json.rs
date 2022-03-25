use eyre::{Report, WrapErr};
use serde::Deserialize;

pub fn parse_json<T: for<'de> Deserialize<'de>>(s: &str) -> Result<T, Report> {
  let json = serde_json::from_str::<T>(s).wrap_err("When parsing JSON")?;
  Ok(json)
}
