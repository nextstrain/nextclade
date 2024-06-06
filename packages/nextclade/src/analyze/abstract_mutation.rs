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

pub trait Sub<P, L>
where
  P: PositionLike,
  L: Letter<L>,
{
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

  #[must_use]
  fn is_mutated(&self) -> bool {
    self.qry_letter() != self.ref_letter()
  }

  #[must_use]
  fn is_sub(&self) -> bool {
    self.is_mutated() && !self.qry_letter().is_gap() && !self.is_unknown()
  }

  #[must_use]
  fn is_del(&self) -> bool {
    self.is_mutated() && self.qry_letter().is_gap()
  }

  #[must_use]
  fn is_unknown(&self) -> bool {
    self.qry_letter().is_unknown()
  }

  #[must_use]
  fn is_mutated_and_not_unknown(&self) -> bool {
    self.is_sub() || self.is_del()
  }
}
