pub trait HasDivergence {
  fn divergence(&self) -> f64;
}

pub trait HasName {
  fn name(&self) -> &str;
}
