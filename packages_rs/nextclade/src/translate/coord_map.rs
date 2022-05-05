use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::utils::range::Range;

/// Makes the "alignment to reference" coordinate map: from alignment coordinates to reference coordinates.
/// Given a position of a letter in the aligned sequence, the "alignment to reference" coordinate map allows to
/// lookup the position of the corresponding letter in the reference sequence.
fn make_aln_to_ref_map(ref_seq: &[Nuc]) -> Vec<usize> {
  let mut rev_coord_map = Vec::<usize>::with_capacity(ref_seq.len());
  let mut ref_pos = 0;

  for nuc in ref_seq {
    if nuc.is_gap() {
      if rev_coord_map.is_empty() {
        rev_coord_map.push(0);
      } else {
        let prev = *(rev_coord_map.last().unwrap());
        rev_coord_map.push(prev);
      }
    } else {
      rev_coord_map.push(ref_pos);
      ref_pos += 1;
    }
  }

  rev_coord_map.shrink_to_fit();
  rev_coord_map
}

/// Makes the "reference to alignment" coordinate map: from reference coordinates to alignment coordinates.
/// Given a position of a letter in the reference sequence, the "reference to alignment" coordinate map allows to
/// lookup the position of the corresponding letter in the aligned sequence.
///
fn make_ref_to_aln_map(ref_seq: &[Nuc]) -> Vec<usize> {
  let mut coord_map = Vec::<usize>::with_capacity(ref_seq.len());

  for (i, nuc) in ref_seq.iter().enumerate() {
    if !nuc.is_gap() {
      coord_map.push(i);
    }
  }

  coord_map.shrink_to_fit();
  coord_map
}

/// Converts sequence alignment to reference coordinates and vice versa.
///
/// Positions of nucleotides in the sequences change after alignment due to insertion stripping. Some operations are
/// done in alignment space, while others in reference space. This struct allows for conversion of position indices
/// from one space to another.
pub struct CoordMap {
  aln_to_ref_table: Vec<usize>,
  ref_to_aln_table: Vec<usize>,
}

impl CoordMap {
  /// Takes aligned ref_seq before insertions (i.e. gaps in ref) are stripped
  pub fn new(ref_seq: &[Nuc]) -> Self {
    Self {
      aln_to_ref_table: make_aln_to_ref_map(ref_seq),
      ref_to_aln_table: make_ref_to_aln_map(ref_seq),
    }
  }

  pub fn aln_to_ref_scalar(&self, aln: usize) -> usize {
    self.aln_to_ref_table[aln]
  }

  // Reff is used because `ref` is magic word in Rust
  pub fn ref_to_aln_scalar(&self, reff: usize) -> usize {
    self.ref_to_aln_table[reff]
  }

  pub fn aln_to_ref(&self, aln_range: &Range) -> Range {
    Range {
      begin: self.aln_to_ref_table[aln_range.begin],
      end: self.aln_to_ref_table[aln_range.end - 1] + 1,
    }
  }

  pub fn ref_to_aln(&self, ref_range: &Range) -> Range {
    Range {
      begin: self.ref_to_aln_table[ref_range.begin],
      end: self.ref_to_aln_table[ref_range.end - 1] + 1,
    }
  }
}
