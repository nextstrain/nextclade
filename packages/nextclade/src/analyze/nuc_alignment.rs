use crate::alphabet::nuc::Nuc;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::coord::range::NucRefGlobalRange;

/// Represents a pair of aligned amino acid sequences (resulting from pairwise alignment
pub struct NucAlignment<'r, 'q, 'a> {
  ref_seq: &'r [Nuc],
  qry_seq: &'q [Nuc],
  alignment_range: &'a NucRefGlobalRange,
}

impl<'r, 'q, 'a> NucAlignment<'r, 'q, 'a> {
  pub fn new(ref_seq: &'r [Nuc], qry_seq: &'q [Nuc], alignment_range: &'a NucRefGlobalRange) -> Self {
    assert_eq!(ref_seq.len(), qry_seq.len());
    Self {
      ref_seq,
      qry_seq,
      alignment_range,
    }
  }

  pub const fn len(&self) -> usize {
    self.ref_seq.len()
  }

  pub fn ref_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    self.ref_seq[pos.as_usize()]
  }

  pub fn qry_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    self.qry_seq[pos.as_usize()]
  }

  pub fn ref_range(&self, range: &NucRefGlobalRange) -> &[Nuc] {
    let range = range.clamp_range(0, self.len());
    &self.ref_seq[range.to_std()]
  }

  pub fn qry_range(&self, range: &NucRefGlobalRange) -> &[Nuc] {
    let range = range.clamp_range(0, self.len());
    &self.qry_seq[range.to_std()]
  }

  pub fn mut_at(&self, pos: NucRefGlobalPosition) -> NucSub {
    NucSub {
      ref_nuc: self.ref_at(pos),
      pos,
      qry_nuc: self.qry_at(pos),
    }
  }

  pub fn is_sequenced(&self, pos: NucRefGlobalPosition) -> bool {
    pos >= 0 && self.alignment_range.contains(pos)
  }
}
