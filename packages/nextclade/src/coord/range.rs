use crate::coord::position::{
  AaAlnPosition, AaRefPosition, NucAlnGlobalPosition, NucAlnLocalPosition, NucRefGlobalPosition, NucRefLocalPosition,
  PositionLike,
};
use assert2::assert;
use auto_ops::impl_op_ex;
use num_traits::{AsPrimitive, clamp, clamp_max, clamp_min};
use serde::{Deserialize, Serialize};
use std::cmp::{max, min};
use std::fmt::{Display, Formatter};
use std::ops::Range as StdRange;

/// Range of positions in a given 1-dimensional coordinate space.
///
/// The coordinate space type parameter ensures that positions and ranges in different coordinate spaces have
/// different Rust types and they cannot be used interchangeably.
#[must_use]
#[derive(Clone, Debug, Default, Eq, PartialEq, Ord, PartialOrd, Hash, Serialize, Deserialize, schemars::JsonSchema)]
pub struct Range<P: PositionLike> {
  pub begin: P,
  pub end: P,
}

impl<P: PositionLike> AsRef<Range<P>> for Range<P> {
  fn as_ref(&self) -> &Range<P> {
    self
  }
}

impl<P: PositionLike> Range<P> {
  #[inline]
  pub fn new(begin: P, end: P) -> Self {
    assert!(begin <= end);
    Self { begin, end }
  }

  #[inline]
  pub fn from_usize(begin: usize, end: usize) -> Self {
    assert!(begin <= end);
    Self {
      begin: P::from(begin as isize),
      end: P::from(end as isize),
    }
    .fixed()
  }

  #[inline]
  pub fn from_isize(begin: isize, end: isize) -> Self {
    assert!(begin <= end);
    Self {
      begin: P::from(begin),
      end: P::from(end),
    }
    .fixed()
  }

  #[inline]
  pub fn from_range<Q: PositionLike>(range: impl AsRef<Range<Q>>) -> Self {
    let range = range.as_ref();
    assert!(range.begin <= range.end);
    Self::from_isize(range.begin.as_isize(), range.end.as_isize()).fixed()
  }

  #[inline]
  pub fn len(&self) -> usize {
    self.end.into().saturating_sub(self.begin.into()) as usize
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }

  #[inline]
  pub fn contains(&self, x: P) -> bool {
    x >= self.begin && x < self.end
  }

  #[inline]
  pub fn fix(&mut self) {
    if self.begin > self.end {
      self.begin = self.end;
    }
  }

  #[inline]
  pub fn fixed(&self) -> Self {
    let mut clone = self.clone();
    clone.fix();
    clone
  }

  /// Convert to Range from standard library (e.g. to use for array indexing)
  #[inline]
  pub fn to_std(&self) -> StdRange<usize> {
    StdRange {
      start: self.begin.as_usize(),
      end: self.end.as_usize(),
    }
  }

  #[inline]
  pub fn iter(&self) -> impl Iterator<Item = P> + use<P> {
    ((self.begin.into())..(self.end.into())).map(Into::into)
  }

  #[inline]
  pub fn clamp_min_range<T: AsPrimitive<isize>>(&self, lower_bound: T) -> Self {
    Self::new(
      clamp_min(self.begin.as_isize(), lower_bound.as_()).into(),
      clamp_min(self.end.as_isize(), lower_bound.as_()).into(),
    )
    .fixed()
  }

  #[inline]
  pub fn clamp_max_range<T: AsPrimitive<isize>>(&self, upper_bound: T) -> Self {
    Self::new(
      clamp_max(self.begin.as_isize(), upper_bound.as_()).into(),
      clamp_max(self.end.as_isize(), upper_bound.as_()).into(),
    )
    .fixed()
  }

  #[inline]
  #[allow(clippy::same_name_method)]
  pub fn clamp_range<T: AsPrimitive<isize>, U: AsPrimitive<isize>>(&self, lower_bound: T, upper_bound: U) -> Self {
    Self::new(
      clamp(self.begin.as_isize(), lower_bound.as_(), upper_bound.as_()).into(),
      clamp(self.end.as_isize(), lower_bound.as_(), upper_bound.as_()).into(),
    )
    .fixed()
  }
}

#[inline]
pub fn have_intersection<P: PositionLike>(x: &Range<P>, y: &Range<P>) -> bool {
  !(y.begin >= x.end || x.begin >= y.end)
}

/// Compute an intersection of two ranges. Returns an empty range if the intersection is empty
#[inline]
pub fn intersect<P: PositionLike>(x: &Range<P>, y: &Range<P>) -> Range<P> {
  if y.begin > x.end || x.begin > y.end {
    Range::from_isize(0, 0)
  } else {
    let begin = max(x.begin, y.begin);
    let end = min(x.end, y.end);
    let mut intersection = Range::new(begin, end);
    intersection.fix();
    intersection
  }
}

/// Compute an intersection of two ranges. Returns None if the intersection is empty
#[inline]
pub fn intersect_or_none<P: PositionLike>(x: &Range<P>, y: &Range<P>) -> Option<Range<P>> {
  let intersection = intersect(x, y);
  (!intersection.is_empty()).then_some(intersection)
}

impl<P: PositionLike> From<Range<P>> for StdRange<usize> {
  fn from(other: Range<P>) -> Self {
    StdRange::<usize> {
      start: other.begin.as_usize(),
      end: other.end.as_usize(),
    }
  }
}

impl<P: PositionLike> Display for Range<P> {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    if self.begin >= self.end {
      return write!(f, "empty range");
    }

    // NOTE: we (and Rust standard library) use 0-based half-open ranges,
    // but bioinformaticians prefer 1-based, closed ranges
    let begin_one = self.begin.into() + 1;
    let end_one = self.end.into();

    if end_one == begin_one {
      write!(f, "{begin_one}")
    } else {
      write!(f, "{begin_one}-{end_one}")
    }
  }
}

pub type NucAlnGlobalRange = Range<NucAlnGlobalPosition>;
pub type NucRefGlobalRange = Range<NucRefGlobalPosition>;
pub type NucAlnLocalRange = Range<NucAlnLocalPosition>;
pub type NucRefLocalRange = Range<NucRefLocalPosition>;
pub type AaAlnRange = Range<AaAlnPosition>;
pub type AaRefRange = Range<AaRefPosition>;

/// This macro implements boilerplate for arithmetic operators for each of the range types
/// Note that all operators use saturated versions of arithmetic operators where possible.
///
/// TODO: See notes for the sibling macro for the position types.
macro_rules! impl_ops_for_range {
  ($t:ty, $p:ty) => {
    // for range and scalar
    impl_op_ex!(+ |range: &$t, scalar: isize| -> $t { <$t>::new(range.begin + scalar, range.end + scalar) });
    impl_op_ex!(- |range: &$t, scalar: isize| -> $t { <$t>::new(range.begin - scalar, range.end - scalar) });
    impl_op_ex!(* |range: &$t, scalar: isize| -> $t { <$t>::new(range.begin * scalar, range.end * scalar) });
    impl_op_ex!(/ |range: &$t, scalar: isize| -> $t { <$t>::new(range.begin / scalar, range.end / scalar) });

    // for range and position
    impl_op_ex!(+ |range: &$t, pos: &$p| -> $t { <$t>::new(range.begin + pos, range.end + pos) });
    impl_op_ex!(- |range: &$t, pos: &$p| -> $t { <$t>::new(range.begin - pos, range.end - pos) });
  };
}

impl_ops_for_range!(NucAlnGlobalRange, NucAlnGlobalPosition);
impl_ops_for_range!(NucRefGlobalRange, NucRefGlobalPosition);
impl_ops_for_range!(NucAlnLocalRange, NucAlnLocalPosition);
impl_ops_for_range!(NucRefLocalRange, NucRefLocalPosition);
impl_ops_for_range!(AaAlnRange, AaAlnPosition);
impl_ops_for_range!(AaRefRange, AaRefPosition);
