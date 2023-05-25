use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::translate::complement::reverse_complement_in_place;
use crate::utils::range::Range;
use itertools::{izip, Itertools};
use serde::{Deserialize, Serialize};

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
#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
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

  pub fn aln_to_ref_position(&self, aln: usize) -> usize {
    self.aln_to_ref_table[aln]
  }

  // Reff is used because `ref` is magic word in Rust
  pub fn ref_to_aln_position(&self, reff: usize) -> usize {
    self.ref_to_aln_table[reff]
  }

  // /// Converts relative position inside an aligned feature (e.g. gene) to absolute position in the reference
  // pub fn feature_aln_to_ref_position(&self, feature: &Gene, aln_pos_rel: usize) -> usize {
  //   let aln_pos = if feature.strand == GeneStrand::Reverse {
  //     self.ref_to_aln_position(feature.end - 1) - aln_pos_rel //feature.end points to the nuc after the feature, hence - 1
  //   } else {
  //     self.ref_to_aln_position(feature.start) + aln_pos_rel
  //   };
  //   self.aln_to_ref_position(aln_pos)
  // }
  //
  // /// Converts relative position inside a feature (e.g. gene) to absolute position in the alignment
  // pub fn feature_ref_to_aln_position(&self, feature: &Gene, ref_pos_rel: usize) -> usize {
  //   let ref_pos = if feature.strand == GeneStrand::Reverse {
  //     feature.end - 1 - ref_pos_rel // the feature end is one past the last character, hence -1
  //   } else {
  //     feature.start + ref_pos_rel
  //   };
  //   self.ref_to_aln_position(ref_pos)
  // }

  pub fn aln_to_ref_range(&self, aln_range: &Range) -> Range {
    Range {
      begin: self.aln_to_ref_table[aln_range.begin],
      end: self.aln_to_ref_table[aln_range.end - 1] + 1,
    }
  }

  pub fn ref_to_aln_range(&self, ref_range: &Range) -> Range {
    Range {
      begin: self.ref_to_aln_table[ref_range.begin],
      end: self.ref_to_aln_table[ref_range.end - 1] + 1,
    }
  }

  // pub fn feature_aln_to_ref_range(&self, feature: &Gene, aln_range: &Range) -> Range {
  //   if feature.strand == GeneStrand::Reverse {
  //     Range {
  //       begin: self.feature_aln_to_ref_position(feature, aln_range.end - 1),
  //       end: self.feature_aln_to_ref_position(feature, aln_range.begin) + 1,
  //     }
  //   } else {
  //     Range {
  //       begin: self.feature_aln_to_ref_position(feature, aln_range.begin),
  //       end: self.feature_aln_to_ref_position(feature, aln_range.end - 1) + 1,
  //     }
  //   }
  // }
  //
  // pub fn feature_ref_to_aln_range(&self, feature: &Gene, ref_range: &Range) -> Range {
  //   Range {
  //     begin: self.feature_ref_to_aln_position(feature, ref_range.begin),
  //     end: self.feature_ref_to_aln_position(feature, ref_range.end - 1) + 1,
  //   }
  // }
  //
  // pub fn feature_aln_to_feature_ref_position(&self, feature: &Gene, aln_position: usize) -> usize {
  //   if feature.strand == GeneStrand::Reverse {
  //     feature.end - 1 - self.feature_aln_to_ref_position(feature, aln_position)
  //   } else {
  //     self.feature_aln_to_ref_position(feature, aln_position) - feature.start
  //   }
  // }
  //
  // pub fn feature_aln_to_feature_ref_range(&self, feature: &Gene, aln_range: &Range) -> Range {
  //   Range {
  //     begin: self.feature_aln_to_feature_ref_position(feature, aln_range.begin),
  //     end: self.feature_aln_to_feature_ref_position(feature, aln_range.end - 1) + 1,
  //   }
  // }
  //
  // /// Extracts nucleotide sequence of a gene
  // pub fn extract_gene(&self, full_aln_seq: &[Nuc], gene: &Gene) -> Vec<Nuc> {
  //   gene
  //     .cdses
  //     .iter()
  //     .flat_map(|cds| self.extract_cds(full_aln_seq, cds))
  //     .collect_vec()
  // }
  //
  // /// Extracts nucleotide sequence of a CDS
  // pub fn extract_cds(&self, full_aln_seq: &[Nuc], cds: &Cds) -> Vec<Nuc> {
  //   cds
  //     .segments
  //     .iter()
  //     .flat_map(|cds_segment| self.extract_cds_segment(full_aln_seq, cds_segment))
  //     .collect_vec()
  // }
  //
  // /// Extracts nucleotide sequence of a CDS segment
  // pub fn extract_cds_segment(&self, full_aln_seq: &[Nuc], cds_segment: &CdsSegment) -> Vec<Nuc> {
  //   // Genemap contains ranges in reference coordinates (like in ref sequence)
  //   let range_ref = Range {
  //     begin: cds_segment.start,
  //     end: cds_segment.end,
  //   };
  //
  //   // ...but we are extracting from aligned sequence, so we need to convert it to alignment coordinates (like in aligned sequences)
  //   let range_aln = self.ref_to_aln_range(&range_ref);
  //   let mut nucs = full_aln_seq[StdRange::from(range_aln)].to_vec();
  //
  //   // Reverse strands should be reverse-complemented
  //   if cds_segment.strand == GeneStrand::Reverse {
  //     reverse_complement_in_place(&mut nucs);
  //   }
  //
  //   nucs
  // }

  /////////////////////////////////////////////////////////////////////////////////////////////

  pub fn extract_cds_aln(&self, seq_aln: &[Nuc], cds: &Cds) -> (Vec<Nuc>, CoordMapForCds) {
    let mut cds_aln_seq = vec![];
    let mut cds_to_aln_map = vec![];
    for segment in &cds.segments {
      let start = self.ref_to_aln_position(segment.start);
      let end = self.ref_to_aln_position(segment.end - 1) + 1;
      cds_to_aln_map.push(CdsToAln {
        global: (start..end).collect_vec(),
        start: cds_aln_seq.len(),
        len: end - start,
      });
      cds_aln_seq.extend_from_slice(&seq_aln[start..end]);
    }

    // Reverse strands should be reverse-complemented
    if cds.strand == GeneStrand::Reverse {
      reverse_complement_in_place(&mut cds_aln_seq);
    }

    (cds_aln_seq, CoordMapForCds::new(cds_to_aln_map))
  }
}

/// Same as [CoordMap] but is meant for coordinates local to a genomic feature (e.g. a single CDS).
/// Wraps [CoordMap] and contains additional functionality for local transformations.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CoordMapLocal {
  coord_map: CoordMap,
}

impl CoordMapLocal {
  pub fn new(ref_seq: &[Nuc]) -> Self {
    Self {
      coord_map: CoordMap::new(ref_seq),
    }
  }

  // Converts a range in local coordinates (relative to the beginning of a CDS) to codon range
  pub fn local_aln_to_codon_range(&self, nuc_local_aln: &Range) -> Range {
    let begin = self.coord_map.aln_to_ref_position(nuc_local_aln.begin);
    let end = self.coord_map.aln_to_ref_position(nuc_local_aln.end - 1) + 1;
    Range {
      begin: Self::cds_nuc_local_ref_to_codon_position(begin),
      end: Self::cds_nuc_local_ref_to_codon_position(end),
    }
  }

  /// Converts nucleotide local reference position to codon position
  const fn cds_nuc_local_ref_to_codon_position(nuc_local_ref_pos: usize) -> usize {
    // Make sure the nucleotide position is adjusted to codon boundary before the division
    // TODO: ensure that adjustment direction is correct for reverse strands
    let nuc_rel_ref_adj = nuc_local_ref_pos + (3 - nuc_local_ref_pos % 3) % 3;
    nuc_rel_ref_adj.saturating_div(3)
  }
}

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CdsToAln {
  global: Vec<usize>,
  start: usize,
  len: usize,
}

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CdsPosition {
  Before,
  Inside(usize),
  After,
}

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CdsRange {
  Before,
  Covered(Range),
  After,
}

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
pub struct CoordMapForCds {
  cds_to_aln_map: Vec<CdsToAln>,
}

impl CoordMapForCds {
  pub fn new(cds_to_aln_map: Vec<CdsToAln>) -> Self {
    Self { cds_to_aln_map }
  }

  /// Map a position in the extracted alignment of the CDS to the global alignment.
  /// Returns a result for each CDS segment, but a single position can  only be in one CDS segment.
  pub fn cds_to_global_aln_position(&self, cds_aln_pos: usize) -> impl Iterator<Item = CdsPosition> + '_ {
    self.cds_to_aln_map.iter().map(move |segment| {
      let pos_in_segment = cds_aln_pos as isize - segment.start as isize;

      if pos_in_segment < 0 {
        CdsPosition::Before
      } else if pos_in_segment >= segment.len as isize {
        CdsPosition::After
      } else {
        CdsPosition::Inside(segment.global[pos_in_segment as usize])
      }
    })
  }

  pub fn cds_to_global_aln_position_one(&self, cds_aln_pos: usize) -> usize {
    self
      .cds_to_global_aln_position(cds_aln_pos)
      .find_map(|pos| match pos {
        CdsPosition::Inside(pos) => Some(pos),
        _ => None,
      })
      .unwrap()
  }

  // Map a range in the extracted alignment of the CDS to the global alignment.
  // Returns a result for each CDS segment, as a range can span multiple CDS segments.
  pub fn cds_to_global_aln_range(&self, range: &Range) -> Vec<CdsRange> {
    let cds_to_aln_begin = self.cds_to_global_aln_position(range.begin);

    // need to map end position -1 to correspond to the last included position
    let cds_to_aln_end = self.cds_to_global_aln_position(range.end - 1);

    let mut result = vec![];
    for (seg_start, seg_end, seg_map) in izip!(cds_to_aln_begin, cds_to_aln_end, &self.cds_to_aln_map) {
      let begin = match seg_start {
        CdsPosition::Before => seg_map.global[0],
        CdsPosition::Inside(pos) => pos,
        CdsPosition::After => {
          result.push(CdsRange::After);
          continue;
        }
      };

      // map end and increment by one to correspond to open interval
      let end = match seg_end {
        CdsPosition::Before => {
          result.push(CdsRange::Before);
          continue;
        }
        CdsPosition::Inside(pos) => pos + 1,
        CdsPosition::After => seg_map.global.last().unwrap() + 1,
      };

      result.push(CdsRange::Covered(Range { begin, end }));
    }
    result
  }

  /// Map a position in the extracted alignment of the CDS to the reference sequence.
  /// Returns a result for each CDS segment, but a single position can  only be in one CDS segment.
  pub fn cds_to_global_ref_position<'a>(
    &'a self,
    pos: usize,
    coord_map: &'a CoordMap,
  ) -> impl Iterator<Item = CdsPosition> + 'a {
    self.cds_to_global_aln_position(pos).map(|cds_pos| match cds_pos {
      CdsPosition::Inside(pos) => CdsPosition::Inside(coord_map.aln_to_ref_position(pos)),
      _ => cds_pos,
    })
  }

  pub fn cds_to_global_ref_range<'a>(
    &'a self,
    range: &'a Range,
    coord_map: &'a CoordMap,
  ) -> impl Iterator<Item = CdsRange> + 'a {
    self
      .cds_to_global_aln_range(range)
      .into_iter()
      .map(|segment| match segment {
        CdsRange::Covered(segment) => {
          let begin = coord_map.aln_to_ref_position(segment.begin);
          let end = coord_map.aln_to_ref_position(segment.end - 1) + 1;
          CdsRange::Covered(Range { begin, end })
        }
        CdsRange::Before | CdsRange::After => segment,
      })
  }

  /// Expand a codon in the extracted alignment to a range in the global alignment
  pub fn codon_to_global_aln_range(&self, codon: usize) -> Vec<CdsRange> {
    let begin = codon * 3;
    let end = begin + 3;
    self.cds_to_global_aln_range(&Range { begin, end })
  }

  /// Same as [Self::codon_to_global_aln_range], but returns only covered ranges
  pub fn codon_to_global_aln_range_covered(&self, codon: usize) -> impl Iterator<Item = Range> + '_ {
    self
      .codon_to_global_aln_range(codon)
      .into_iter()
      .filter_map(|range| match range {
        CdsRange::Covered(range) => Some(range),
        _ => None,
      })
  }
}

pub fn extract_cds_ref(seq: &[Nuc], cds: &Cds) -> Vec<Nuc> {
  let mut nucs = cds
    .segments
    .iter()
    .flat_map(|cds_segment| seq[cds_segment.start..cds_segment.end].iter().copied())
    .collect_vec();

  // Reverse strands should be reverse-complemented
  if cds.strand == GeneStrand::Reverse {
    reverse_complement_in_place(&mut nucs);
  }

  nucs
}

#[cfg(test)]
mod coord_map_tests {
  use super::*;
  use crate::gene::cds::CdsSegment;
  use crate::io::nuc::to_nuc_seq;
  use eyre::Report;
  use multimap::MultiMap;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  fn create_fake_cds(segment_ranges: &[(usize, usize)]) -> Cds {
    Cds {
      id: "".to_owned(),
      name: "".to_owned(),
      product: "".to_owned(),
      strand: GeneStrand::Forward,
      segments: segment_ranges
        .iter()
        .map(|(start, end)| CdsSegment {
          index: 0,
          id: "".to_owned(),
          name: "".to_owned(),
          start: *start,
          end: *end,
          landmark: None,
          strand: GeneStrand::Forward,
          frame: 0,
          exceptions: vec![],
          attributes: MultiMap::default(),
          source_record: None,
          compat_is_gene: false,
        })
        .collect_vec(),
      proteins: vec![],
      compat_is_gene: false,
    }
  }

  #[rustfmt::skip]
  #[rstest]
  fn extracts_cds_sequence() -> Result<(), Report> {
    // CDS range                   11111111111111111
    // CDS range                                   2222222222222222222      333333
    // index                   012345678901234567890123456789012345678901234567890123
    let reff =     to_nuc_seq("TGATGCACAATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
    let expected = to_nuc_seq(    "GCACAATCGTTTTTAAAACGGGTTTGCGGTGTAAGTCGTCTT")?;
    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let actual = extract_cds_ref(&reff, &cds);
    assert_eq!(actual, expected);
    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  fn extracts_cds_alignment() -> Result<(), Report> {
    // CDS range                  11111111111111111
    // CDS range                                  2222222222222222222      333333
    // index                  012345678901234567890123456789012345678901234567890123456
    // let reff = to_nuc_seq("TGATGCACAATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
    let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
    let qry_aln = to_nuc_seq("-GATGCACACGCATC---TTTAAACGGGTTTGCGGTGTCAGT---GCCCGTCTTACA")?;

    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let global_coord_map = CoordMap::new(&ref_aln);

    let (ref_cds_aln, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);
    assert_eq!(
      ref_cds_aln,
      to_nuc_seq("GCACA---ATCGTTTTTAAAACGGGTTTGCGGTGTAAGTCGTCTT")?
    );

    assert_eq!(
      ref_cds_to_aln,
       CoordMapForCds::new(vec![
        CdsToAln {
          global: vec![4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          start: 0,
          len: 20,
        },
        CdsToAln {
          global: vec![23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
          start: 20,
          len: 19,
        },
        CdsToAln {
          global: vec![48, 49, 50, 51, 52, 53],
          start: 39,
          len: 6,
        },
      ])
    );

    let (qry_cds_aln, qry_cds_to_aln) = global_coord_map.extract_cds_aln(&qry_aln, &cds);
    assert_eq!(
      qry_cds_aln,
      to_nuc_seq("GCACACGCATC---TTTAAAACGGGTTTGCGGTGTCAGTCGTCTT")?
    );
    assert_eq!(
      qry_cds_to_aln,
      CoordMapForCds::new(vec![
        CdsToAln {
          global: vec![4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          start: 0,
          len: 20,
        },
        CdsToAln {
          global: vec![23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
          start: 20,
          len: 19,
        },
        CdsToAln {
          global: vec![48, 49, 50, 51, 52, 53],
          start: 39,
          len: 6,
        },
      ])
    );

    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  fn maps_example() -> Result<(), Report> {
    // CDS range                  11111111111111111
    // CDS range                                  2222222222222222222      333333
    // index                  012345678901234567890123456789012345678901234567890123456
    let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;

    let global_coord_map = CoordMap::new(&ref_aln);

    assert_eq!(
      global_coord_map.aln_to_ref_table,
      vec![
        0, 1, 2, 3, 4, 5, 6, 7, 8, 8, 8, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27,
        28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53
      ]
    );

    assert_eq!(
      global_coord_map.ref_to_aln_table,
      vec![
        0, 1, 2, 3, 4, 5, 6, 7, 8, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32,
        33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47, 48, 49, 50, 51, 52, 53, 54, 55, 56
      ]
    );

    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  fn maps_cds_to_global_aln_position() -> Result<(), Report> {
    // CDS range                  11111111111111111
    // CDS range                                  2222222222222222222      333333
    // index                  012345678901234567890123456789012345678901234567890123456
    let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;

    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let global_coord_map = CoordMap::new(&ref_aln);
    let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);

    assert_eq!(
      ref_cds_to_aln.cds_to_global_aln_position(10).collect_vec(),
      [CdsPosition::Inside(14), CdsPosition::Before, CdsPosition::Before]
    );
    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  fn maps_cds_to_global_aln_range() -> Result<(), Report> {
    // CDS range                  11111111111111111
    // CDS range                                  2222222222222222222      333333
    // index                  012345678901234567890123456789012345678901234567890123456
    let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;

    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let global_coord_map = CoordMap::new(&ref_aln);
    let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);

    assert_eq!(
      ref_cds_to_aln.cds_to_global_aln_range(&Range::new(10, 15)),
      [
        CdsRange::Covered(Range::new(14, 19)),
        CdsRange::Before,
        CdsRange::Before
      ]
    );
    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  fn maps_codon_to_global_aln_range() -> Result<(), Report> {
    // CDS range                  11111111111111111
    // CDS range                                  2222222222222222222      333333
    // index                  012345678901234567890123456789012345678901234567890123456
    let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;

    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let global_coord_map = CoordMap::new(&ref_aln);
    let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);

    assert_eq!(
      ref_cds_to_aln.codon_to_global_aln_range(5),
      [
        CdsRange::Covered(Range::new(19, 22)),
        CdsRange::Before,
        CdsRange::Before
      ]
    );

    assert_eq!(
      ref_cds_to_aln.codon_to_global_aln_range(6),
      [
        CdsRange::Covered(Range::new(22, 24)),
        CdsRange::Covered(Range::new(23, 24)),
        CdsRange::Before
      ]
    );

    assert_eq!(
      ref_cds_to_aln.codon_to_global_aln_range(7),
      [CdsRange::After, CdsRange::Covered(Range::new(24, 27)), CdsRange::Before]
    );

    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  fn maps_cds_to_global_ref_position() -> Result<(), Report> {
    // CDS range                  11111111111111111
    // CDS range                                  2222222222222222222      333333
    // index                  012345678901234567890123456789012345678901234567890123456
    let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;

    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let global_coord_map = CoordMap::new(&ref_aln);
    let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);

    assert_eq!(
      ref_cds_to_aln.cds_to_global_ref_position(10, &global_coord_map).collect_vec(),
      [CdsPosition::Inside(11), CdsPosition::Before, CdsPosition::Before]
    );

    Ok(())
  }

  #[rustfmt::skip]
  #[rstest]
  fn maps_cds_to_global_ref_range() -> Result<(), Report> {
    // CDS range                  11111111111111111
    // CDS range                                  2222222222222222222      333333
    // index                  012345678901234567890123456789012345678901234567890123456
    let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;

    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let global_coord_map = CoordMap::new(&ref_aln);
    let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);

    assert_eq!(
      ref_cds_to_aln.cds_to_global_ref_range(&Range::new(10, 15), &global_coord_map).collect_vec(),
      [
        CdsRange::Covered(Range::new(11, 16)),
        CdsRange::Before,
        CdsRange::Before
      ]
    );
    Ok(())
  }

  // #[rstest]
  // fn maps_ref_to_aln_simple() -> Result<(), Report> {
  //   // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
  //   // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  //   // aln pos: 0  1  2  3           7  8  9  10          14
  //   let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
  //   assert_eq!(coord_map.ref_to_aln_table, vec![0, 1, 2, 3, 7, 8, 9, 10, 14]);
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn maps_ref_to_aln_with_leading_insertions() -> Result<(), Report> {
  //   // ref pos:  0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
  //   // ref    :  -  -  A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  //   // aln pos:  -  -  2  3  4  5           9  10 11 12          16
  //   let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
  //   assert_eq!(coord_map.ref_to_aln_table, vec![2, 3, 4, 5, 9, 10, 11, 12, 16]);
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn maps_aln_to_ref_simple() -> Result<(), Report> {
  //   // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14
  //   // ref    : A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  //   // aln pos: 0  1  2  3  3  3  3  4  5  6  7  7  7  7  8
  //   let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
  //   assert_eq!(
  //     coord_map.aln_to_ref_table,
  //     vec![0, 1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8]
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn maps_aln_to_ref_with_leading_insertions() -> Result<(), Report> {
  //   // ref pos: 0  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16
  //   // ref    : -  -  A  C  T  C  -  -  -  C  G  T  G  -  -  -  A
  //   // aln pos: 0  0  0  1  2  3  3  3  3  4  5  6  7  7  7  7  8
  //   let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
  //   assert_eq!(
  //     coord_map.aln_to_ref_table,
  //     vec![0, 0, 0, 1, 2, 3, 3, 3, 3, 4, 5, 6, 7, 7, 7, 7, 8]
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn maps_range_ref_to_aln_simple() -> Result<(), Report> {
  //   let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
  //   assert_eq!(
  //     coord_map.ref_to_aln_range(&Range { begin: 3, end: 6 }),
  //     Range { begin: 3, end: 9 }
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn maps_range_aln_to_ref_simple() -> Result<(), Report> {
  //   let coord_map = CoordMap::new(&to_nuc_seq("ACTC---CGTG---A")?);
  //   assert_eq!(
  //     coord_map.aln_to_ref_range(&Range { begin: 3, end: 9 }),
  //     Range { begin: 3, end: 6 }
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn maps_range_ref_to_aln_with_leading_insertions() -> Result<(), Report> {
  //   let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
  //   assert_eq!(
  //     coord_map.ref_to_aln_range(&Range { begin: 3, end: 6 }),
  //     Range { begin: 5, end: 11 }
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn maps_range_aln_to_ref_with_leading_insertions() -> Result<(), Report> {
  //   let coord_map = CoordMap::new(&to_nuc_seq("--ACTC---CGTG---A")?);
  //   assert_eq!(
  //     coord_map.aln_to_ref_range(&Range { begin: 5, end: 11 }),
  //     Range { begin: 3, end: 6 }
  //   );
  //   Ok(())
  // }

  // #[rstest]
  // fn extract_gene_plus_strand() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Forward,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //                5           |17
  //   // qry_aln: ACGCT|CCGTGCGG--CG|TGCGT
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(
  //     from_nuc_seq(&coord_map.extract_gene(&to_nuc_seq("ACGCTCCGTGCGG--CGTGCGT")?, &gene)),
  //     "CCGTGCGG--CG"
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn extract_gene_minus_strand() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Reverse,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //                5           |17
  //   // qry_aln: ACGCT|CCGTGCGG--CG|TGCGT
  //   // rev comp       CG--CCGCACGG
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(
  //     from_nuc_seq(&coord_map.extract_gene(&to_nuc_seq("ACGCTCCGTGCGG--CGTGCGT")?, &gene)),
  //     "CG--CCGCACGG"
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn ref_feature_pos_to_aln_fwd() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Forward,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   //                0..    |7
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //                5         |15
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(coord_map.feature_ref_to_aln_position(&gene, 7), 15);
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn ref_feature_pos_to_aln_rev() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Reverse,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   //                 |7      |0
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //                 |6
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(coord_map.feature_ref_to_aln_position(&gene, 7), 6);
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn aln_feature_pos_to_ref_fwd() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Forward,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   //               |3    |8
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //               |        |8
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(coord_map.feature_aln_to_ref_position(&gene, 8), 8);
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn aln_feature_pos_to_ref_rev() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Reverse,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   //               |3 |5
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //               |  |9       |0
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(coord_map.feature_aln_to_ref_position(&gene, 9), 5);
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn aln_feature_range_to_ref_fwd() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Forward,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   //               |   |3 |6
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //               |   |     |9
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(
  //     coord_map.feature_aln_to_ref_range(&gene, &Range { begin: 3, end: 9 }),
  //     Range { begin: 6, end: 9 }
  //   );
  //   Ok(())
  // }
  //
  // #[rstest]
  // fn aln_feature_range_to_ref_rev() -> Result<(), Report> {
  //   let gene = Gene {
  //     gene_name: "g1".to_owned(),
  //     start: 3,
  //     end: 12,
  //     strand: GeneStrand::Reverse,
  //     frame: 0,
  //     cdses: vec![],
  //     attributes: multimap!(),
  //   };
  //   //               |   |6 |9
  //   // reference: ACT|CCGTGACCG|CGT
  //   // ref_aln: A--CT|CCGT---GACCG|--CGT
  //   //               |  9|   3|
  //
  //   let coord_map = CoordMap::new(&to_nuc_seq("A--CTCCGT---GACCG--CGT")?);
  //   assert_eq!(
  //     coord_map.feature_aln_to_ref_range(&gene, &Range { begin: 3, end: 9 }),
  //     Range { begin: 6, end: 9 }
  //   );
  //   Ok(())
  // }
}
