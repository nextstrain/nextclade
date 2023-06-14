// Tagged position and range types for different coordinate spaces.
//
// Each coordinate space has a dummy marker (tag) struct implementing a coordinate space trait.
// A concrete position type and its sibling range type use these markers to distinguish themselves from positions and
// ranges in other spaces. This way the positions and ranges in different spaces have different Rust types and they
// cannot be accidentally mixed up.
//
// This prevents, for example, adding a position in alignment coordinates to the position in the
// reference coordinates, which is always a bug. Similarly, you cannot pass a range in reference to a function
// expecting a range in alignment.
use auto_ops::{impl_op_ex, impl_op_ex_commutative};
use derive_more::Display as DeriveDisplay;
use num::Integer;
use num_traits::{clamp, clamp_max, clamp_min, AsPrimitive, SaturatingAdd, SaturatingMul, SaturatingSub};
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::cmp::{max, min, Ordering};
use std::fmt::{Debug, Display, Formatter};
use std::hash::{Hash, Hasher};
use std::marker::PhantomData;
use std::ops::Range as StdRange;

pub trait PositionLikeAttrs:
  Clone + Copy + Debug + Display + Default + Eq + PartialEq + Ord + PartialOrd + Hash + schemars::JsonSchema
{
}

pub trait PositionLike: From<isize> + Into<isize> + PositionLikeAttrs {
  #[must_use]
  fn as_usize(&self) -> usize {
    self.as_isize() as usize
  }

  #[must_use]
  fn as_isize(&self) -> isize;

  #[must_use]
  #[inline]
  fn clamp_min_pos<T: AsPrimitive<isize>>(&self, lower_bound: T) -> Self {
    clamp_min(self.as_isize(), lower_bound.as_()).into()
  }

  #[must_use]
  #[inline]
  fn clamp_max_pos<T: AsPrimitive<isize>>(&self, upper_bound: T) -> Self {
    clamp_max(self.as_isize(), upper_bound.as_()).into()
  }

  #[must_use]
  #[inline]
  fn clamp_pos<T: AsPrimitive<isize>, U: AsPrimitive<isize>>(&self, lower_bound: T, upper_bound: U) -> Self {
    clamp(self.as_isize(), lower_bound.as_(), upper_bound.as_()).into()
  }
}

/// Coordinate: alignment vs reference
pub trait CoordsMarker: PositionLikeAttrs {}

/// Locality: global vs local
pub trait SpaceMarker: PositionLikeAttrs {}

// Sequence type nucleotide vs amino acid
pub trait SeqTypeMarker: PositionLikeAttrs {}

/// Position in a given 1-dimensional coordinate space.
///
/// The coordianate space type parameter ensures that positions and ranges in different coordinate spaces have
/// different Rust types and they cannot be used interchangeably.
#[allow(clippy::partial_pub_fields)]
#[derive(Clone, Copy, Debug, Default, schemars::JsonSchema)]
pub struct Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  pub inner: isize,
  _coordinate_marker: PhantomData<C>,
  _locality_marker: PhantomData<L>,
  _sequence_marker: PhantomData<S>,
}

impl<C, S, L> From<Position<C, S, L>> for usize
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn from(val: Position<C, S, L>) -> Self {
    val.inner as usize
  }
}

impl<C, S, L> From<Position<C, S, L>> for isize
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn from(val: Position<C, S, L>) -> Self {
    val.inner
  }
}

impl<C, S, L> Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  #[inline]
  pub fn new(pos: isize) -> Self {
    Self {
      inner: pos,
      _coordinate_marker: PhantomData::default(),
      _locality_marker: PhantomData::default(),
      _sequence_marker: PhantomData::default(),
    }
  }
}

impl<C, S, L, I> From<I> for Position<C, S, L>
where
  I: Integer + AsPrimitive<isize>,
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn from(pos: I) -> Self {
    Self::new(pos.as_())
  }
}

impl<C, S, L> Display for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    std::fmt::Display::fmt(&self.inner, f)
  }
}

impl<U, C, S, L> PartialEq<U> for Position<C, S, L>
where
  isize: PartialEq<U>,
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn eq(&self, other: &U) -> bool {
    self.inner.eq(other)
  }
}

impl<C, S, L> PartialEq<Self> for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn eq(&self, other: &Self) -> bool {
    self.inner.eq(&other.inner)
  }
}

impl<U, C, S, L> PartialOrd<U> for Position<C, S, L>
where
  isize: PartialOrd<U>,
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn partial_cmp(&self, other: &U) -> Option<Ordering> {
    self.inner.partial_cmp(other)
  }
}

impl<C, S, L> PartialOrd for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn partial_cmp(&self, other: &Self) -> Option<Ordering> {
    self.inner.partial_cmp(&other.inner)
  }
}

impl<C, S, L> Eq for Position<C, S, L>
where
  C: CoordsMarker,
  L: SeqTypeMarker,
  S: SpaceMarker,
{
}

impl<C, S, L> Ord for Position<C, S, L>
where
  C: CoordsMarker,
  L: SeqTypeMarker,
  S: SpaceMarker,
{
  fn cmp(&self, other: &Self) -> Ordering {
    self.inner.cmp(&other.inner)
  }
}

impl<C, S, L> PositionLikeAttrs for Position<C, S, L>
where
  C: CoordsMarker,
  L: SeqTypeMarker,
  S: SpaceMarker,
{
}

impl<C, S, L> PositionLike for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn as_isize(&self) -> isize {
    self.inner
  }
}

impl<C, S, L> Hash for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn hash<H: Hasher>(&self, state: &mut H) {
    self.inner.hash(state);
  }
}

impl<'de, C, S, L> Deserialize<'de> for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn deserialize<D: Deserializer<'de>>(deserializer: D) -> Result<Self, D::Error> {
    let i = i64::deserialize(deserializer)?;
    Ok(Position::new(i as isize))
  }
}

impl<C, S, L> Serialize for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn serialize<Ser>(&self, serializer: Ser) -> Result<Ser::Ok, Ser::Error>
  where
    Ser: Serializer,
  {
    serializer.serialize_i64(self.inner as i64)
  }
}

/// Range of positions in a given 1-dimensional coordinate space.
///
/// The coordianate space type parameter ensures that positions and ranges in different coordinate spaces have
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
  pub const fn new(begin: P, end: P) -> Self {
    Self { begin, end }
  }

  #[inline]
  pub fn from_usize(begin: usize, end: usize) -> Self {
    Self {
      begin: P::from(begin as isize),
      end: P::from(end as isize),
    }
    .fixed()
  }

  #[inline]
  pub fn from_isize(begin: isize, end: isize) -> Self {
    Self {
      begin: P::from(begin),
      end: P::from(end),
    }
    .fixed()
  }

  #[inline]
  pub fn from_range<Q: PositionLike>(range: impl AsRef<Range<Q>>) -> Self {
    let range = range.as_ref();
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
  pub fn iter(&self) -> impl Iterator<Item = P> {
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
  let begin = max(x.begin, y.begin);
  let end = min(x.end, y.end);
  let mut intersection = Range::new(begin, end);
  intersection.fix();
  intersection
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

#[derive(
  Clone,
  Copy,
  Debug,
  DeriveDisplay,
  Default,
  Eq,
  PartialEq,
  Ord,
  PartialOrd,
  Hash,
  Serialize,
  Deserialize,
  schemars::JsonSchema,
)]
pub struct AlignmentCoords;
impl PositionLikeAttrs for AlignmentCoords {}
impl CoordsMarker for AlignmentCoords {}

#[derive(
  Clone,
  Copy,
  Debug,
  DeriveDisplay,
  Default,
  Eq,
  PartialEq,
  Ord,
  PartialOrd,
  Hash,
  Serialize,
  Deserialize,
  schemars::JsonSchema,
)]
pub struct ReferenceCoords;
impl PositionLikeAttrs for ReferenceCoords {}
impl CoordsMarker for ReferenceCoords {}

#[derive(
  Clone,
  Copy,
  Debug,
  DeriveDisplay,
  Default,
  Eq,
  PartialEq,
  Ord,
  PartialOrd,
  Hash,
  Serialize,
  Deserialize,
  schemars::JsonSchema,
)]
pub struct LocalSpace;
impl PositionLikeAttrs for LocalSpace {}
impl SpaceMarker for LocalSpace {}

#[derive(
  Clone,
  Copy,
  Debug,
  DeriveDisplay,
  Default,
  Eq,
  PartialEq,
  Ord,
  PartialOrd,
  Hash,
  Serialize,
  Deserialize,
  schemars::JsonSchema,
)]
pub struct GlobalSpace;
impl PositionLikeAttrs for GlobalSpace {}
impl SpaceMarker for GlobalSpace {}

#[derive(
  Clone,
  Copy,
  Debug,
  DeriveDisplay,
  Default,
  Eq,
  PartialEq,
  Ord,
  PartialOrd,
  Hash,
  Serialize,
  Deserialize,
  schemars::JsonSchema,
)]
pub struct NucSpace;
impl PositionLikeAttrs for NucSpace {}
impl SeqTypeMarker for NucSpace {}

#[derive(
  Clone,
  Copy,
  Debug,
  DeriveDisplay,
  Default,
  Eq,
  PartialEq,
  Ord,
  PartialOrd,
  Hash,
  Serialize,
  Deserialize,
  schemars::JsonSchema,
)]
pub struct AaSpace;
impl PositionLikeAttrs for AaSpace {}
impl SeqTypeMarker for AaSpace {}

// Global nucleotide positions in alignment coordinates. "Global" here means that the position is relative to the
// beginning of the aligned sequence.
pub type NucAlnGlobalPosition = Position<AlignmentCoords, GlobalSpace, NucSpace>;
pub type NucAlnGlobalRange = Range<NucAlnGlobalPosition>;

// Global nucleotide positions in coordinates of reference sequence. "Global" here means that the position is relative
// to the beginning of the reference sequence.
pub type NucRefGlobalPosition = Position<ReferenceCoords, GlobalSpace, NucSpace>;
pub type NucRefGlobalRange = Range<NucRefGlobalPosition>;

// Local nucleotide positions in alignment coordinates. "Local" here means that the position is relative
// to the beginning of a genetic featurem e.g. a gene or a CDS.
pub type NucAlnLocalPosition = Position<AlignmentCoords, LocalSpace, NucSpace>;
pub type NucAlnLocalRange = Range<NucAlnLocalPosition>;

// Local nucleotide positions in coordinates of reference sequence. "Local" here means that the position is relative
// to the beginning of a genetic featurem e.g. a gene or a CDS.
pub type NucRefLocalPosition = Position<ReferenceCoords, LocalSpace, NucSpace>;
pub type NucRefLocalRange = Range<NucRefLocalPosition>;

// Positions in aminoacid alignment
pub type AaAlnPosition = Position<AlignmentCoords, LocalSpace, AaSpace>;
pub type AaAlnRange = Range<AaAlnPosition>;

// Positions in aminoacid reference sequence
pub type AaRefPosition = Position<ReferenceCoords, LocalSpace, AaSpace>;
pub type AaRefRange = Range<AaRefPosition>;

/// This macro implements boilerplate for arithmetic operators for each of the position types.
/// Note that all operators use saturated versions of arithmetic operators where possible.
///
/// TODO: This boilerplate is needed because, at the time of writing, the `impl_op_ex!()` macro from `auto_ops` crate
///   does not work with generic types. See:
///    - https://github.com/carbotaniuman/auto_ops/blob/74d97b4fb0f39e73c7fd63934c877c91a2c4a031/README.md?plain=1#L47-L48
///    - https://github.com/carbotaniuman/auto_ops/issues/2
///   Come back to this if Rust "specialization" feature is stabilized:
///    - https://rust-lang.github.io/rfcs/1210-impl-specialization.html
///   and/or if `auto_ops` crate finds another way to work with generics:
///    - https://github.com/carbotaniuman/auto_ops/pull/14
///   The operators can then be implemented only once for the generic type, instead of for each of the specialized types.
macro_rules! impl_ops_for_pos {
  ($t:ty) => {
  // for position and signed scalar
    impl_op_ex_commutative!(+ |pos: &$t, scalar: isize| -> $t { <$t>::new(pos.inner.saturating_add(scalar)) });
    impl_op_ex_commutative!(- |pos: &$t, scalar: isize| -> $t { <$t>::new(pos.inner.saturating_sub(scalar)) });
    impl_op_ex_commutative!(* |pos: &$t, scalar: isize| -> $t { <$t>::new(pos.inner.saturating_mul(scalar)) });
    impl_op_ex_commutative!(/ |pos: &$t, scalar: isize| -> $t { <$t>::new(pos.inner / scalar) });
    impl_op_ex_commutative!(% |pos: &$t, scalar: isize| -> $t { <$t>::new(pos.inner % scalar) });

    // // for position and unsigned scalar
    // impl_op_ex_commutative!(+ |pos: &$t, scalar: usize| -> $t { <$t>::new(pos.inner.saturating_add(scalar as isize)) });
    // impl_op_ex_commutative!(- |pos: &$t, scalar: usize| -> $t { <$t>::new(pos.inner.saturating_sub(scalar as isize)) });
    // impl_op_ex_commutative!(* |pos: &$t, scalar: usize| -> $t { <$t>::new(pos.inner.saturating_mul(scalar as isize)) });
    // impl_op_ex_commutative!(/ |pos: &$t, scalar: usize| -> $t { <$t>::new(pos.inner / (scalar as isize)) });
    // impl_op_ex_commutative!(% |pos: &$t, scalar: usize| -> $t { <$t>::new(pos.inner % (scalar as isize)) });

    // for position and signed scalar, compound
    impl_op_ex!(+= |pos: &mut $t, scalar: isize| { pos.inner = pos.inner.saturating_add(scalar); });
    impl_op_ex!(-= |pos: &mut $t, scalar: isize| { pos.inner = pos.inner.saturating_sub(scalar); });
    impl_op_ex!(*= |pos: &mut $t, scalar: isize| { pos.inner = pos.inner.saturating_mul(scalar); });

    // impl_op_ex!(+= |pos: &mut $t, scalar: usize| { pos.inner = pos.inner.saturating_add(scalar as isize); });
    // impl_op_ex!(-= |pos: &mut $t, scalar: usize| { pos.inner = pos.inner.saturating_sub(scalar as isize); });
    // impl_op_ex!(*= |pos: &mut $t, scalar: usize| { pos.inner = pos.inner.saturating_mul(scalar as isize); });

    // for position and position
    impl_op_ex!(+ |left: &$t, right: &$t| -> $t { <$t>::new(left.inner.saturating_add(right.inner)) });
    impl_op_ex!(- |left: &$t, right: &$t| -> $t { <$t>::new(left.inner.saturating_sub(right.inner)) });
    impl_op_ex!(% |left: &$t, right: &$t| -> $t { <$t>::new(left.inner % right.inner) });
  };
}

impl_ops_for_pos!(NucAlnGlobalPosition);
impl_ops_for_pos!(NucRefGlobalPosition);
impl_ops_for_pos!(NucAlnLocalPosition);
impl_ops_for_pos!(NucRefLocalPosition);
impl_ops_for_pos!(AaAlnPosition);
impl_ops_for_pos!(AaRefPosition);

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
