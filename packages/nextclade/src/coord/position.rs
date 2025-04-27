use auto_ops::{impl_op_ex, impl_op_ex_commutative};
use derive_more::Display as DeriveDisplay;
use num::Integer;
use num_traits::{clamp, clamp_max, clamp_min, AsPrimitive};
use schemars::r#gen::SchemaGenerator;
use schemars::schema::Schema;
use serde::{Deserialize, Deserializer, Serialize, Serializer};
use std::cmp::Ordering;
use std::fmt::{Debug, Display, Formatter};
use std::hash::{Hash, Hasher};
use std::marker::PhantomData;

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
/// The coordinate space type parameter ensures that positions and ranges in different coordinate spaces have
/// different Rust types and they cannot be used interchangeably.
#[allow(clippy::partial_pub_fields)]
#[derive(Clone, Copy, Default)]
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
  pub const fn new(pos: isize) -> Self {
    Self {
      inner: pos,
      _coordinate_marker: PhantomData,
      _locality_marker: PhantomData,
      _sequence_marker: PhantomData,
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
    Display::fmt(&self.inner, f)
  }
}

impl<C, S, L> Debug for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    Debug::fmt(&self.inner, f)
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
    Some(self.cmp(other))
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

impl<C, S, L> schemars::JsonSchema for Position<C, S, L>
where
  C: CoordsMarker,
  S: SpaceMarker,
  L: SeqTypeMarker,
{
  fn schema_name() -> String {
    "Position".to_owned()
  }

  fn json_schema(r#gen: &mut SchemaGenerator) -> Schema {
    r#gen.subschema_for::<isize>()
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

// Global nucleotide positions in coordinates of reference sequence. "Global" here means that the position is relative
// to the beginning of the reference sequence.
pub type NucRefGlobalPosition = Position<ReferenceCoords, GlobalSpace, NucSpace>;

// Local nucleotide positions in alignment coordinates. "Local" here means that the position is relative
// to the beginning of a genetic feature, e.g. a gene or a CDS.
pub type NucAlnLocalPosition = Position<AlignmentCoords, LocalSpace, NucSpace>;

// Local nucleotide positions in coordinates of reference sequence. "Local" here means that the position is relative
// to the beginning of a genetic feature, e.g. a gene or a CDS.
pub type NucRefLocalPosition = Position<ReferenceCoords, LocalSpace, NucSpace>;

// Positions in aminoacid alignment
pub type AaAlnPosition = Position<AlignmentCoords, LocalSpace, AaSpace>;

// Positions in aminoacid reference sequence
pub type AaRefPosition = Position<ReferenceCoords, LocalSpace, AaSpace>;

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
