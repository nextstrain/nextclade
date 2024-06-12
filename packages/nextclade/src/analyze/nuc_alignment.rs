use crate::alphabet::nuc::Nuc;
use crate::analyze::abstract_mutation::AbstractMutation;
use crate::analyze::nuc_sub::NucSub;
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::coord::range::NucRefGlobalRange;
use std::collections::BTreeMap;

pub trait NucAlignmentAbstract {
  fn len(&self) -> usize;

  fn ref_at(&self, pos: NucRefGlobalPosition) -> Nuc;
  fn ref_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc>;

  fn qry_at(&self, pos: NucRefGlobalPosition) -> Nuc;
  fn qry_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc>;

  fn pair_at(&self, pos: NucRefGlobalPosition) -> NucSub {
    NucSub {
      ref_nuc: self.ref_at(pos),
      pos,
      qry_nuc: self.qry_at(pos),
    }
  }

  fn mut_at(&self, pos: NucRefGlobalPosition) -> Option<NucSub> {
    let p = self.pair_at(pos);
    (self.is_sequenced(pos) && p.is_mutated_and_not_unknown()).then_some(p)
  }

  fn alignment_range(&self) -> &NucRefGlobalRange;

  fn is_sequenced(&self, pos: NucRefGlobalPosition) -> bool {
    pos >= 0 && self.alignment_range().contains(pos)
  }
}

/// Represents a pair of aligned amino acid sequences (resulting from pairwise alignment)
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
}

impl NucAlignmentAbstract for NucAlignment<'_, '_, '_> {
  fn len(&self) -> usize {
    self.ref_seq.len()
  }

  fn ref_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    self.ref_seq[pos.as_usize()]
  }

  fn ref_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc> {
    let range = range.clamp_range(0, self.len());
    self.ref_seq[range.to_std()].iter().copied()
  }

  fn qry_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    self.qry_seq[pos.as_usize()]
  }

  fn qry_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc> {
    let range = range.clamp_range(0, self.len());
    self.qry_seq[range.to_std()].iter().copied()
  }

  fn alignment_range(&self) -> &NucRefGlobalRange {
    self.alignment_range
  }
}

/// Represents a virtual nucleotide alignment - a source alignment, with a set of mutations overlaid on top of it
pub struct NucAlignmentWithOverlay<'b, 'r, 'q, 'a, 'o> {
  source: &'b NucAlignment<'r, 'q, 'a>,
  overlay: &'o BTreeMap<NucRefGlobalPosition, Nuc>,
}

impl<'b, 'r, 'q, 'a, 'o> NucAlignmentWithOverlay<'b, 'r, 'q, 'a, 'o> {
  pub const fn new(source: &'b NucAlignment<'r, 'q, 'a>, overlay: &'o BTreeMap<NucRefGlobalPosition, Nuc>) -> Self {
    Self { source, overlay }
  }

  /// Lookup source sequence
  fn source_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    self.source.ref_at(pos)
  }

  /// Lookup a range in source sequence
  fn source_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc> + '_ {
    range.clamp_range(0, self.len()).iter().map(|pos| self.source_at(pos))
  }

  /// Lookup overlay sequence
  fn overlay_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    // If there's an overlay mutation at this position, return it
    if let Some(sub) = self.overlay.get(&pos) {
      *sub
    } else {
      // Otherwise return ref character from the source alignment
      self.source.ref_at(pos)
    }
  }

  /// Lookup a range in overlay sequence
  fn overlay_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc> + '_ {
    range.clamp_range(0, self.len()).iter().map(|pos| self.overlay_at(pos))
  }
}

impl NucAlignmentAbstract for NucAlignmentWithOverlay<'_, '_, '_, '_, '_> {
  fn len(&self) -> usize {
    self.source.len()
  }

  /// By convention, we treat overlay as a "virtual" reference, so this returns overlay letter.
  /// If you need the source reference, use .source_at() instead.
  fn ref_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    self.overlay_at(pos)
  }

  /// By convention, we treat overlay as a "virtual" reference, so this returns overlay range.
  /// If you need the source reference, use .source_range() instead.
  fn ref_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc> {
    self.overlay_range(range)
  }

  fn qry_at(&self, pos: NucRefGlobalPosition) -> Nuc {
    self.source.qry_at(pos)
  }

  fn qry_range(&self, range: &NucRefGlobalRange) -> impl IntoIterator<Item = Nuc> {
    self.source.qry_range(range)
  }

  fn alignment_range(&self) -> &NucRefGlobalRange {
    self.source.alignment_range()
  }
}
