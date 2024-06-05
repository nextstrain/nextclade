use crate::alphabet::aa::Aa;
use crate::analyze::aa_sub::AaSubMin;
use crate::coord::position::{AaRefPosition, PositionLike};
use crate::gene::cds::Cds;
use crate::translate::translate_genes::CdsTranslation;

/// Represents a pair of aligned amino acid sequences (resulting from pairwise alignment
pub struct AaAlignment<'c, 'r, 'q> {
  cds: &'c Cds,
  ref_tr: &'r CdsTranslation,
  qry_tr: &'q CdsTranslation,
}

impl<'c, 'r, 'q> AaAlignment<'c, 'r, 'q> {
  pub const fn new(cds: &'c Cds, ref_tr: &'r CdsTranslation, qry_tr: &'q CdsTranslation) -> Self {
    Self { cds, ref_tr, qry_tr }
  }

  pub fn ref_at(&self, pos: AaRefPosition) -> Aa {
    self.ref_tr.seq[pos.as_usize()]
  }

  pub fn qry_at(&self, pos: AaRefPosition) -> Aa {
    self.qry_tr.seq[pos.as_usize()]
  }

  pub fn mut_at(&self, pos: AaRefPosition) -> AaSubMin {
    AaSubMin {
      ref_aa: self.ref_at(pos),
      pos,
      qry_aa: self.qry_at(pos),
    }
  }
}
