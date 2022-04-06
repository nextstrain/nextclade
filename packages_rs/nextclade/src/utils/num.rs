/// Checks if a float can be represented as an integer without loss
pub fn is_int(x: f64) -> bool {
  x == (x as i64) as f64
}
