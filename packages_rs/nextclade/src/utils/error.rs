use color_eyre::Report;
use eyre::eyre;

pub fn report_to_string(report: &Report) -> String {
  let strings: Vec<String> = report
    .chain()
    .into_iter()
    .map(std::string::ToString::to_string)
    .collect();
  strings.join(": ")
}

pub fn to_eyre_error<T, E: Into<eyre::Error>>(val_or_err: Result<T, E>) -> Result<T, Report> {
  val_or_err.map_err(|report| eyre!(report))
}

pub fn report_to_string_debug_only(report: &Report) -> String {
  #[cfg(not(debug_assertions))]
  return "An unexpected error occurred. Please try again later.".to_owned();

  #[cfg(debug_assertions)]
  report_to_string(report)
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
      let msg = std::format!("{msg_external}. This is an internal error. Please report it to developers.");
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
      let msg = std::format!("{msg_external}. This is an internal error. Please report it to developers.");
      eyre::eyre!(msg)
    }
  };
}

pub use make_internal_report;
