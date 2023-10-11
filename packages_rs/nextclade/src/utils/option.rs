/// Retrieves value from an `Option` or returns an internal error.
/// To be used on `Option` which we know is `Some` on runtime.
#[macro_export]
macro_rules! option_get_some {
  ($x:ident) => {{
    $x.ok_or_else(|| {
      nextclade::make_internal_report!(
        "Expected `Some` value, found `None`, in `Option` variable `{}`",
        std::stringify!($x)
      )
    })
  }};
}

pub use option_get_some;

pub trait OptionMapRefFallible<'o, T: 'o> {
  /// Borrows the internal value of an `Option`, maps it using the provided closure
  /// and transposes `Option` of `Result` to `Result` of `Option`.
  ///
  /// Convenient to use with fallible mapping functions (which returns a `Result`)
  ///
  /// Inspired by
  /// https://github.com/ammongit/rust-ref-map/blob/4b1251c6d2fd192d89a114395b36aeeab5c5433c/src/option.rs
  fn map_ref_fallible<U, F, E>(&'o self, f: F) -> Result<Option<U>, E>
  where
    F: FnOnce(&'o T) -> Result<U, E>;
}

impl<'o, T: 'o> OptionMapRefFallible<'o, T> for Option<T> {
  #[inline]
  fn map_ref_fallible<U, F, E>(&'o self, f: F) -> Result<Option<U>, E>
  where
    F: FnOnce(&'o T) -> Result<U, E>,
  {
    (*self).as_ref().map(f).transpose()
  }
}

pub trait OptionMapMutFallible<'o, T: 'o> {
  /// Borrows the internal value of an `Option`, maps it using the provided closure
  /// and transposes `Option` of `Result` to `Result` of `Option`.
  ///
  /// Convenient to use with fallible mapping functions (which returns a `Result`)
  ///
  /// Inspired by
  /// https://github.com/ammongit/rust-ref-map/blob/4b1251c6d2fd192d89a114395b36aeeab5c5433c/src/option.rs
  fn map_mut_fallible<U, F, E>(&'o mut self, f: F) -> Result<Option<U>, E>
  where
    F: FnOnce(&'o mut T) -> Result<U, E>;
}

impl<'o, T: 'o> OptionMapMutFallible<'o, T> for Option<T> {
  #[inline]
  fn map_mut_fallible<U, F, E>(&'o mut self, f: F) -> Result<Option<U>, E>
  where
    F: FnOnce(&'o mut T) -> Result<U, E>,
  {
    (*self).as_mut().map(f).transpose()
  }
}
