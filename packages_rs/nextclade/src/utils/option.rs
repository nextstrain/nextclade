/// Retrieves value from an `Option` or returns an internal error.
/// To be used on `Option` which we know is `Some` on runtime.
#[macro_export(local_inner_macros)]
macro_rules! option_get_some {
  ($x:ident) => {{
    $x.ok_or_else(|| {
      crate::make_internal_report!(
        "Expected `Some` value, found `None`, in `Option` variable `{}`",
        std::stringify!($x)
      )
    })
  }};
}

pub use option_get_some;
