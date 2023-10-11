#[macro_export]
macro_rules! getenv {
  ($arg:tt) => {{
    match core::option_env!($arg) {
      Some(val) => val,
      None => dotenv_codegen::dotenv!($arg),
    }
  }};
}

pub use getenv;
