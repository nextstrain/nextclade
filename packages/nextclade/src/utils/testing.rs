//! Test-only assertion helpers. Compiled only under `#[cfg(test)]`.

/// Assert that a `Result` is `Err` and that its full error chain, as formatted by `report_to_string`, equals the
/// expected message. On `Ok`, report the value.
#[macro_export]
macro_rules! assert_error {
  ($result:expr, $expected_message:expr $(,)?) => {{
    match $result {
      Ok(value) => panic!("expected Err, got Ok: {value:#?}"),
      Err(error) => {
        pretty_assertions::assert_eq!($expected_message, $crate::utils::error::report_to_string(&error));
      }
    }
  }};
}
