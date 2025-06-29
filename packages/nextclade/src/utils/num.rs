use num_traits::Float;

/// Checks if a float can be represented as an integer without loss
#[allow(clippy::float_cmp)]
pub fn is_int(x: f64) -> bool {
  x == (x as i64) as f64
}

/// Collapse -0.0 to +0.0
pub fn float_collapse_zero<T: Float>(x: T) -> T {
  // -0.0 == 0.0
  if x == T::zero() {
    return T::zero();
  }
  x
}
