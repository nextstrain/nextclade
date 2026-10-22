use color_eyre::Report;
use eyre::eyre;
use itertools::Itertools;
use std::str::FromStr;

pub fn report_to_string(report: &Report) -> String {
  let strings: Vec<String> = report.chain().map(ToString::to_string).collect();
  strings.join(": ")
}

pub fn to_eyre_error<T, E: Into<eyre::Error>>(val_or_err: Result<T, E>) -> Result<T, Report> {
  val_or_err.map_err(|report| eyre!(report))
}

pub fn from_eyre_error<T, E: FromStr>(val_or_err: Result<T, Report>) -> Result<T, E> {
  val_or_err.map_err(|report| E::from_str(&report_to_string(&report)).ok().unwrap())
}

/// Return success when there are no errors, the error when there is one, and an error that lists all errors when
/// there are several
pub fn join_errors(errors: impl IntoIterator<Item = Report>) -> Result<(), Report> {
  let mut errors = errors.into_iter().collect_vec();
  if errors.len() <= 1 {
    return errors.pop().map_or(Ok(()), Err);
  }
  let list = errors
    .iter()
    .map(|error| format!("  - {}", report_to_string(error)))
    .join("\n");
  Err(eyre!("{} errors occurred:\n{list}", errors.len()))
}

/// Preserves only the Result::Ok values in a given collection
pub fn keep_ok<T, E>(results: &[Result<T, E>]) -> impl Iterator<Item = &T> {
  results.iter().filter_map(|res| res.as_ref().ok())
}

#[macro_export(local_inner_macros)]
macro_rules! make_error {
  ($($arg:tt)*) => {
    {
      Err(eyre::eyre!(std::format!($($arg)*)))
    }
  };
}

pub use make_error;

#[macro_export(local_inner_macros)]
macro_rules! make_internal_error {
  ($($arg:tt)*) => {
    {
      let msg_external = std::format!($($arg)*);
      let msg = std::format!("{msg_external}. This is an internal error. Please report it to developers");
      Err(eyre::eyre!(msg))
    }
  };
}

pub use make_internal_error;

#[macro_export(local_inner_macros)]
macro_rules! make_internal_report {
  ($($arg:tt)*) => {
    {
      let msg_external = std::format!($($arg)*);
      let msg = std::format!("{msg_external}. This is an internal error. Please report it to developers");
      eyre::eyre!(msg)
    }
  };
}

pub use make_internal_report;
