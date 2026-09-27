//! Test-only assertion helpers. Compiled only under `#[cfg(test)]`.

/// Assert that a `Result` is `Err` and that its full error chain, as formatted by `report_to_string`, equals the
/// expected message.
#[macro_export]
macro_rules! assert_error {
  ($result:expr, $expected_message:expr $(,)?) => {{
    let Err(error) = $result else {
      panic!("expected Err, got Ok")
    };
    let actual_message = $crate::utils::error::report_to_string(&error);
    pretty_assertions::assert_eq!(actual_message, $expected_message);
  }};
}
