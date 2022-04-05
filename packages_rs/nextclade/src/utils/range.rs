use auto_ops::impl_op_ex;
use serde::{Deserialize, Serialize};
use std::ops::Range as StdRange;

#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize)]
pub struct Range {
  pub begin: usize,
  pub end: usize,
}

impl Range {
  #[inline]
  pub fn new(begin: usize, end: usize) -> Range {
    Range { begin, end }
  }

  #[inline]
  pub fn contains(&self, x: usize) -> bool {
    x >= self.begin && x < self.end
  }
}

#[inline]
pub fn have_intersection(x: &Range, y: &Range) -> bool {
  !(y.begin >= x.end || x.begin >= y.end)
}

// Arithmetic operators

#[rustfmt::skip]
impl_op_ex!(+ |range: &Range, scalar: usize| -> Range { Range{ begin: range.begin + scalar, end: range.end + scalar } });

#[rustfmt::skip]
impl_op_ex!(- |range: &Range, scalar: usize| -> Range { Range{ begin: range.begin - scalar, end: range.end - scalar } });

// Conversions

impl From<Range> for StdRange<usize> {
  fn from(other: Range) -> Self {
    StdRange::<usize> {
      start: other.begin,
      end: other.end,
    }
  }
}
