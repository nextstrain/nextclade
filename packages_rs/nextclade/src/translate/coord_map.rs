use crate::gene::gene::{Gene, GeneStrand};
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::translate::complement::reverse_complement_in_place;
use crate::utils::range::Range;
use std::ops::Range as StdRange;

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

  /// Converts relative position inside a feature (e.g. gene) to absolute position in the reference
  pub fn feature_aln_to_ref_scalar(&self, feature: &Gene, aln_pos_rel: usize) -> usize {
    let aln_pos = if feature.strand == GeneStrand::Reverse {
      self.ref_to_aln_scalar(feature.end) - aln_pos_rel
    } else {
      self.ref_to_aln_scalar(feature.start) + aln_pos_rel
    };
    self.aln_to_ref_scalar(aln_pos)
  }

  /// Converts relative position inside a feature (e.g. gene) to absolute position in the alignment
  pub fn feature_ref_to_aln_scalar(&self, feature: &Gene, ref_pos_rel: usize) -> usize {
    let ref_pos = if feature.strand == GeneStrand::Reverse {
      self.aln_to_ref_scalar(feature.end) - ref_pos_rel
    } else {
      self.aln_to_ref_scalar(feature.start) + ref_pos_rel
    };
    self.ref_to_aln_scalar(ref_pos)
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

  pub fn feature_aln_to_ref(&self, feature: &Gene, aln_range: &Range) -> Range {
    Range {
      begin: self.feature_aln_to_ref_scalar(feature, aln_range.begin),
      end: self.feature_aln_to_ref_scalar(feature, aln_range.end - 1) + 1,
    }
  }

  pub fn feature_ref_to_aln(&self, feature: &Gene, ref_range: &Range) -> Range {
    Range {
      begin: self.feature_ref_to_aln_scalar(feature, ref_range.begin),
      end: self.feature_ref_to_aln_scalar(feature, ref_range.end - 1) + 1,
    }
  }

  /// Extracts nucleotide sequence of a gene
  pub fn extract_gene(&self, full_aln_seq: &[Nuc], gene: &Gene) -> Vec<Nuc> {
    let &Gene { start, end, .. } = gene;

    // Gene map contains gene range in reference coordinates (like in ref sequence)
    let gene_range_ref = Range { begin: start, end };

    // ...but we are extracting from aligned sequence, so we need to convert it to alignment coordinates (like in aligned sequences)
    let gene_range_aln = self.ref_to_aln(&gene_range_ref);

    let mut gene_nucs = full_aln_seq[StdRange::from(gene_range_aln)].to_vec();

    // Reverse strands should be reverse-complemented
    if gene.strand == GeneStrand::Reverse {
      reverse_complement_in_place(&mut gene_nucs);
    }

    gene_nucs
  }
}

#[cfg(test)]
mod coord_map_tests {
  use super::*;
  use crate::io::nuc::to_nuc_seq;
  use eyre::Report;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rstest]
  fn maps_ref_to_aln_simple() -> Result<(), Report> {
    // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
    // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
    // aln pos: 0  1  2  3           7  8  9  10          14
    let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
    assert_eq!(coord_map.ref_to_aln_table, vec![0, 1, 2, 3, 7, 8, 9, 10, 14]);
    Ok(())
  }

  #[rstest]
  fn maps_ref_to_aln_with_leading_insertions() -> Result<(), Report> {
    // ref pos:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
    // ref    :  -  -  A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
    // aln pos:  -  -  2  3  4  5           9  10 11 12          16
    let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
    assert_eq!(coord_map.ref_to_aln_table, vec![2, 3, 4, 5, 9, 10, 11, 12, 16]);
    Ok(())
  }

  #[rstest]
  fn maps_aln_to_ref_simple() -> Result<(), Report> {
    // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
    // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
    // aln pos: 0  1  2  3  3  3  3  4  5  6  7  7  7  7  8
    let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
    assert_eq!(
      coord_map.aln_to_ref_table,
      vec![0, 1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8]
    );
    Ok(())
  }

  #[rstest]
  fn maps_aln_to_ref_with_leading_insertions() -> Result<(), Report> {
    // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
    // ref    : -  -  A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
    // aln pos: 0  0  0  1  2  3  3  3  3  4  5  6  7  7  7  7  8
    let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
    assert_eq!(
      coord_map.aln_to_ref_table,
      vec![0, 0, 0, 1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8]
    );
    Ok(())
  }

  #[rstest]
  fn maps_range_ref_to_aln_simple() -> Result<(), Report> {
    let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
    assert_eq!(
      coord_map.ref_to_aln(&Range { begin: 3, end: 6 }),
      Range { begin: 3, end: 9 }
    );
    Ok(())
  }

  #[rstest]
  fn maps_range_aln_to_ref_simple() -> Result<(), Report> {
    let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
    assert_eq!(
      coord_map.aln_to_ref(&Range { begin: 3, end: 9 }),
      Range { begin: 3, end: 6 }
    );
    Ok(())
  }

  #[rstest]
  fn maps_range_ref_to_aln_with_leading_insertions() -> Result<(), Report> {
    let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
    assert_eq!(
      coord_map.ref_to_aln(&Range { begin: 3, end: 6 }),
      Range { begin: 5, end: 11 }
    );
    Ok(())
  }

  #[rstest]
  fn maps_range_aln_to_ref_with_leading_insertions() -> Result<(), Report> {
    let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
    assert_eq!(
      coord_map.aln_to_ref(&Range { begin: 5, end: 11 }),
      Range { begin: 3, end: 6 }
    );
    Ok(())
  }
}
