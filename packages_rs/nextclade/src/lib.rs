pub mod align;
pub mod gene;
pub mod io;
pub mod tree;
pub mod utils;

pub fn foo() -> String {
  "Hello!".to_owned()
}

#[cfg(test)]
mod tests {
  use crate::utils::global_init::global_init;
  use ctor::ctor;

  #[ctor]
  fn init() {
    global_init();
  }
}
