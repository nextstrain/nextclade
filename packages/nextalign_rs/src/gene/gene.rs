pub struct Gene {
  pub geneName: String,
  pub start: usize,
  pub end: usize,
  pub strand: String,
  pub frame: i32,
}

impl Gene {
  pub fn len(&self) -> usize {
    return self.end - self.start;
  }
}
