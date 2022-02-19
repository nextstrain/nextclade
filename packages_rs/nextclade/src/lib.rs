pub mod align;
pub mod analyze;
pub mod gene;
pub mod io;
pub mod tree;
pub mod utils;
pub mod wasm;

#[cfg(test)]
mod tests {
  use crate::utils::global_init::global_init;
  use ctor::ctor;

  #[ctor]
  fn init() {
    global_init();
  }
}
