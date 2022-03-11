#![allow(clippy::use_self)]

use auto_ops::impl_op_ex;
use std::ops::Range as StdRange;

#[derive(Clone, Debug, PartialEq)]
pub struct Range {
  pub begin: usize,
  pub end: usize,
}

impl Range {
  pub fn new(begin: usize, end: usize) -> Range {
    Range { begin, end }
  }
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
      start: other.begin as usize,
      end: other.end as usize,
    }
  }
}
