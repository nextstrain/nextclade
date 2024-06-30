use crate::alphabet::aa::Aa;
use crate::analyze::aa_sub_min::AaSubMin;
use crate::analyze::abstract_mutation::AbstractMutation;
use crate::coord::position::{AaRefPosition, PositionLike};
use crate::coord::range::AaRefRange;
use crate::gene::cds::Cds;
use crate::translate::translate_genes::CdsTranslation;
use std::collections::BTreeMap;

pub trait AaAlignmentAbstract {
  fn cds(&self) -> &Cds;

  fn len(&self) -> usize;

  fn ref_at(&self, pos: AaRefPosition) -> Aa;

  fn qry_at(&self, pos: AaRefPosition) -> Aa;

  fn pair_at(&self, pos: AaRefPosition) -> AaSubMin {
    AaSubMin {
      ref_aa: self.ref_at(pos),
      pos,
      qry_aa: self.qry_at(pos),
    }
  }

  fn mut_at(&self, pos: AaRefPosition) -> Option<AaSubMin> {
    let p = self.pair_at(pos);
    (self.is_sequenced(pos) && p.is_mutated_and_not_unknown()).then_some(p)
  }

  fn alignment_ranges(&self) -> &[AaRefRange];

  fn is_sequenced(&self, pos: AaRefPosition) -> bool {
    pos >= 0
      && self
        .alignment_ranges()
        .iter()
        .any(|aa_alignment_range| aa_alignment_range.contains(pos))
  }
}

/// Represents a pair of aligned amino acid sequences (resulting from pairwise alignment)
pub struct AaAlignment<'c, 'r, 'q> {
  cds: &'c Cds,
  ref_tr: &'r CdsTranslation,
  qry_tr: &'q CdsTranslation,
}

impl<'c, 'r, 'q> AaAlignment<'c, 'r, 'q> {
  pub fn new(cds: &'c Cds, ref_tr: &'r CdsTranslation, qry_tr: &'q CdsTranslation) -> Self {
    assert_eq!(ref_tr.seq.len(), qry_tr.seq.len());
    Self { cds, ref_tr, qry_tr }
  }
}

impl AaAlignmentAbstract for AaAlignment<'_, '_, '_> {
  fn cds(&self) -> &Cds {
    self.cds
  }

  fn len(&self) -> usize {
    self.ref_tr.seq.len()
  }

  fn ref_at(&self, pos: AaRefPosition) -> Aa {
    self.ref_tr.seq[pos.as_usize()]
  }

  fn qry_at(&self, pos: AaRefPosition) -> Aa {
    self.qry_tr.seq[pos.as_usize()]
  }

  fn alignment_ranges(&self) -> &[AaRefRange] {
    &self.qry_tr.alignment_ranges
  }
}

/// Represents a virtual aminoacid alignment - a source alignment, with a set of mutations overlaid on top of it
pub struct AaAlignmentView<'b, 'c, 'r, 'q, 'm> {
  source: &'b AaAlignment<'c, 'r, 'q>,
  overlay: &'m BTreeMap<AaRefPosition, Aa>,
}

impl<'b, 'c, 'r, 'q, 'm> AaAlignmentView<'b, 'c, 'r, 'q, 'm> {
  pub const fn new(source: &'b AaAlignment<'c, 'r, 'q>, overlay: &'m BTreeMap<AaRefPosition, Aa>) -> Self {
    Self { source, overlay }
  }

  /// Lookup source sequence
  fn source_at(&self, pos: AaRefPosition) -> Aa {
    self.source.ref_at(pos)
  }

  /// Lookup "virtual" overlay sequence view
  fn overlay_at(&self, pos: AaRefPosition) -> Aa {
    // If there's an overlay mutation at this position, return it
    if let Some(sub) = self.overlay.get(&pos) {
      *sub
    } else {
      // Otherwise return ref character from the source alignment
      self.source_at(pos)
    }
  }
}

impl AaAlignmentAbstract for AaAlignmentView<'_, '_, '_, '_, '_> {
  fn cds(&self) -> &Cds {
    self.source.cds()
  }

  fn len(&self) -> usize {
    self.source.ref_tr.seq.len()
  }

  /// By convention, we treat overlay as a "virtual" reference.
  /// If you need the source reference, use .source_at() instead.
  fn ref_at(&self, pos: AaRefPosition) -> Aa {
    self.overlay_at(pos)
  }

  fn qry_at(&self, pos: AaRefPosition) -> Aa {
    self.source.qry_tr.seq[pos.as_usize()]
  }

  fn alignment_ranges(&self) -> &[AaRefRange] {
    &self.source.qry_tr.alignment_ranges
  }
}
