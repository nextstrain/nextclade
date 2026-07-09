//! Test assertion helpers: `approx` float comparison with `pretty_assertions` diffs, and error
//! message assertion.

/// Replace newlines with NEL (U+0085) so multi-line `Debug` output stays on one line in the
/// `pretty_assertions` diff instead of being split across diff rows.
pub fn format_newlines(s: impl AsRef<str>) -> String {
  s.as_ref().replace('\n', "\u{0085}")
}

/// `approx::ulps_eq!` with `pretty_assertions` diff on failure. Pass `max_ulps = N`.
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

/// Assert `Result` is `Err` with the given message. Uses `report_to_string` (no location noise).
#[macro_export]
macro_rules! assert_error {
  ($result:expr, $expected_message:expr $(,)?) => {{
    let Err(error) = $result else {
      panic!("expected Err, got Ok");
    };
    let actual_message = $crate::utils::error::report_to_string(&error);
    pretty_assertions::assert_eq!(actual_message, $expected_message);
  }};
}
