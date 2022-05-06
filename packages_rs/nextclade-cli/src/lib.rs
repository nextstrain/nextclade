pub mod cli;
pub mod dataset;
pub mod io;

#[cfg(test)]
mod tests {
  use nextclade::utils::global_init::global_init;
  use ctor::ctor;

  #[ctor]
  fn init() {
    global_init();
  }
}
