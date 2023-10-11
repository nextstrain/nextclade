/// Useful for `#[serde(default = "bool_true")]`
#[inline]
pub const fn bool_true() -> bool {
  true
}

/// Useful for `#[serde(default = "bool_false")]`
#[inline]
pub const fn bool_false() -> bool {
  false
}
