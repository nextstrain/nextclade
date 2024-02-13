use crate::alphabet::letter::Letter;
use crate::coord::position::PositionLike;

/// Trait for everything that has a position
pub trait Pos<P: PositionLike> {
  fn pos(&self) -> P;
}

/// Trait for everything that has a query letter
pub trait QryLetter<L: Letter<L>> {
  fn qry_letter(&self) -> L;
}

/// Trait for everything that has a ref letter
pub trait RefLetter<L: Letter<L>> {
  fn ref_letter(&self) -> L;
}

pub struct MutParams<P, L>
where
  P: PositionLike,
  L: Letter<L>,
{
  pub pos: P,
  pub qry_letter: L,
  pub ref_letter: L,
}

/// Trait for everything that looks like a mutation
pub trait AbstractMutation<P, L>: Pos<P> + QryLetter<L> + RefLetter<L>
where
  P: PositionLike,
  L: Letter<L>,
{
  /// Creates a copy of the mutation, overwriting some of the fields according to the provided parameters
  #[must_use]
  fn clone_with(&self, params: MutParams<P, L>) -> Self;
}
