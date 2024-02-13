use crate::alphabet::nuc::Nuc;
use crate::coord::coord_map::make_aln_to_ref_map;

use crate::coord::position::{AaRefPosition, NucAlnLocalPosition, NucRefLocalPosition, PositionLike};
use crate::coord::range::{AaRefRange, NucAlnLocalRange, NucRefLocalRange, Range};
use serde::{Deserialize, Serialize};

/// Similar principle to [CoordMapGlobal], but converts between nucleotide and codon spaces.
///
/// The word "local" here signifies that the coordinates are relative to the beginning of a
/// genetic feature (e.g. a gene, a CDS etc.)
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
pub struct CoordMapLocal {
  aln_to_ref_table: Vec<NucRefLocalPosition>,
}

impl CoordMapLocal {
  pub fn new(ref_seq_unstripped: &[Nuc]) -> Self {
    Self {
      aln_to_ref_table: make_aln_to_ref_map(ref_seq_unstripped),
    }
  }

  #[inline]
  pub fn aln_to_ref_position(&self, aln: NucAlnLocalPosition) -> NucRefLocalPosition {
    self.aln_to_ref_table[aln.as_usize()]
  }

  #[inline]
  pub fn aln_to_ref_range(&self, aln_range: &NucAlnLocalRange) -> NucRefLocalRange {
    Range::new(
      self.aln_to_ref_position(aln_range.begin),
      self.aln_to_ref_position(aln_range.end - 1) + 1,
    )
  }

  /// Converts nucleotide local reference position to codon position
  pub fn local_to_codon_ref_position(pos: NucRefLocalPosition) -> AaRefPosition {
    // Make sure the nucleotide position is adjusted to codon boundary before the division
    // TODO: ensure that adjustment direction is correct for reverse strands
    let pos = pos.as_isize();
    let pos_adjusted = pos + (3 - pos % 3) % 3;
    AaRefPosition::new(pos_adjusted / 3)
  }

  pub fn local_to_codon_ref_range(&self, range: &NucAlnLocalRange) -> AaRefRange {
    let range = self.aln_to_ref_range(range);
    AaRefRange::new(
      Self::local_to_codon_ref_position(range.begin),
      Self::local_to_codon_ref_position(range.end),
    )
  }
}
