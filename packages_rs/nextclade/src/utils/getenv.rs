#[macro_export(local_inner_macros)]
macro_rules! getenv {
  ($arg:tt) => {{
    match core::option_env!($arg) {
      Some(val) => val,
      None => dotenv_codegen::dotenv!($arg),
    }
  }};
}

pub use getenv;
