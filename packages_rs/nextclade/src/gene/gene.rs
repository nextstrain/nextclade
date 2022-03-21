#![allow(non_snake_case)]

#[derive(Debug)]
pub struct Gene {
  pub gene_name: String,
  pub start: usize,
  pub end: usize,
  pub strand: String,
  pub frame: i32,
}

impl Gene {
  #[allow(clippy::len_without_is_empty)]
  pub fn len(&self) -> usize {
    self.end - self.start
  }
}
