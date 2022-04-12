#[derive(Debug)]
pub struct Gene {
  pub gene_name: String,
  pub start: usize,
  pub end: usize,
  pub strand: String,
  pub frame: i32,
}

impl Gene {
  pub const fn len(&self) -> usize {
    self.end - self.start
  }

  pub const fn is_empty(&self) -> bool {
    self.len() == 0
  }
}
