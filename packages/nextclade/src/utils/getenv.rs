#[macro_export]
macro_rules! getenv {
  ($arg:tt) => {{
    match core::option_env!($arg) {
      Some(val) => val,
      None => dotenvy_macro::dotenv!($arg),
    }
  }};
}

pub use getenv;
