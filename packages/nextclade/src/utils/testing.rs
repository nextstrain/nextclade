//! Test-only assertion helpers: `approx` floating-point comparison with `pretty_assertions` diffs on
//! failure, and an error-message assertion. Compiled only under `#[cfg(test)]` because they depend on
//! the `approx` and `pretty_assertions` dev-dependencies.

/// Replace newlines with NEL (U+0085) so multi-line `Debug` output stays on one line in the
/// `pretty_assertions` diff instead of being split across diff rows.
pub fn format_newlines(s: impl AsRef<str>) -> String {
  s.as_ref().replace('\n', "\u{0085}")
}

/// `approx::ulps_eq!` assertion that renders a `pretty_assertions` diff of the two values on failure.
///
/// Prefer this over bare `approx::assert_ulps_eq!` for readable failures. Prefer ulps over epsilon for
/// magnitude-independent comparison; pass `max_ulps = N`.
#[macro_export]
macro_rules! pretty_assert_ulps_eq {
  ($lhs:expr, $rhs:expr $(, $opt:ident = $val:expr)* $(,)?) => {{
    let lhs = &$lhs;
    let rhs = &$rhs;
    if !approx::ulps_eq!(lhs, rhs, $($opt = $val,)*) {
      pretty_assertions::assert_eq!(
        $crate::utils::testing::format_newlines(format!("{lhs:#?}")),
        $crate::utils::testing::format_newlines(format!("{rhs:#?}")),
      );
    }
  }};
}

/// `approx::abs_diff_eq!` assertion that renders a `pretty_assertions` diff of the two values on
/// failure. Pass `epsilon = 1e-N`.
#[macro_export]
macro_rules! pretty_assert_abs_diff_eq {
  ($lhs:expr, $rhs:expr $(, $opt:ident = $val:expr)* $(,)?) => {{
    let lhs = &$lhs;
    let rhs = &$rhs;
    if !approx::abs_diff_eq!(lhs, rhs, $($opt = $val,)*) {
      pretty_assertions::assert_eq!(
        $crate::utils::testing::format_newlines(format!("{lhs:#?}")),
        $crate::utils::testing::format_newlines(format!("{rhs:#?}")),
      );
    }
  }};
}

/// Assert that a `Result` is `Err` and its rendered report equals `$expected_message` exactly.
///
/// Uses [`crate::utils::error::report_to_string`] so the comparison is against the message chain
/// without location noise.
#[macro_export]
macro_rules! assert_error {
  ($result:expr, $expected_message:expr $(,)?) => {{
    let error = match $result {
      Ok(_) => panic!("expected Err, got Ok"),
      Err(e) => e,
    };
    let actual_message = $crate::utils::error::report_to_string(&error);
    pretty_assertions::assert_eq!(actual_message, $expected_message);
  }};
}
