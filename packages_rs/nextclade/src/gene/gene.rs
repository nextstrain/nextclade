#[derive(Debug)]
pub struct Gene {
  pub gene_name: String,
  pub start: usize,
  pub end: usize,
  pub strand: String,
  pub frame: i32,
}

impl Gene {
  pub fn len(&self) -> usize {
    self.end - self.start
  }

  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }
}
