pub mod align;
pub mod analyze;
pub mod constants;
pub mod coord;
pub mod features;
pub mod gene;
pub mod io;
pub mod qc;
pub mod run;
pub mod translate;
pub mod tree;
pub mod types;
pub mod utils;

#[cfg(test)]
mod tests {
  use crate::utils::global_init::global_init;
  use ctor::ctor;

  #[ctor]
  fn init() {
    global_init();
  }
}
