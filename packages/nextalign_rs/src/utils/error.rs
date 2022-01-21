use color_eyre::Report;

pub fn report_to_string(report: &Report) -> String {
  let strings: Vec<String> = report
    .chain()
    .into_iter()
    .map(std::string::ToString::to_string)
    .collect();
  strings.join(": ")
}

#[allow(unused_variables)]
pub fn report_to_string_debug_only(report: &Report) -> String {
  #[cfg(not(debug_assertions))]
  return "An unexpected error occurred. Please try again later.".to_owned();

  #[cfg(debug_assertions)]
  report_to_string(report)
}

#[macro_export(local_inner_macros)]
macro_rules! error {
  ($($arg:tt)*) => {
    {
      Err(eyre::eyre!(std::format!($($arg)*)))
    }
  };
}

pub use error;
