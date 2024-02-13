use std::ops::{Add, Rem, Sub};

// Wraps given integer `x` (positive or negative) around `period`.
// Negative values are wrapped backwards.
//
// Examples with period=3:
//   6 --> 0
//   5 --> 2
//   4 --> 1
//   3 --> 0
//   2 --> 2
//   1 --> 1
//   0 --> 0
//  -1 --> 2
//  -2 --> 1
//  -3 --> 0
//  -4 --> 2
//  -5 --> 1
//  -6 --> 0
#[inline]
pub fn wraparound<T>(x: T, period: T) -> T
where
  T: Copy + Add<Output = T> + Sub<Output = T> + Rem<Output = T> + Ord + From<i32>,
{
  if x < T::from(0) {
    return ((x % period) + period) % period;
  }
  x % period
}
