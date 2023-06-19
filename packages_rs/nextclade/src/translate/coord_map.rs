use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::translate::complement::reverse_complement_in_place;
use crate::utils::range::{
  AaAlnPosition, AaRefPosition, AaRefRange, AlignmentCoords, CoordsMarker, GlobalSpace, NucAlnGlobalPosition,
  NucAlnGlobalRange, NucAlnLocalPosition, NucAlnLocalRange, NucRefGlobalPosition, NucRefGlobalRange,
  NucRefLocalPosition, NucRefLocalRange, NucSpace, Position, PositionLike, Range, ReferenceCoords, SeqTypeMarker,
  SpaceMarker,
};
use crate::vec_into;
use itertools::{izip, Itertools};
use num::integer::div_floor;
use serde::{Deserialize, Serialize};

/// Makes the "alignment to reference" coordinate map: from alignment coordinates to reference coordinates.
/// Given a position of a letter in the aligned sequence, the "alignment to reference" coordinate map allows to
/// lookup the position of the corresponding letter in the reference sequence.
fn make_aln_to_ref_map<L: SpaceMarker>(ref_seq: &[Nuc]) -> Vec<Position<ReferenceCoords, L, NucSpace>> {
  let mut rev_coord_map = Vec::<Position<ReferenceCoords, L, NucSpace>>::with_capacity(ref_seq.len());
  let mut ref_pos = 0_isize;

  for nuc in ref_seq {
    if nuc.is_gap() {
      if rev_coord_map.is_empty() {
        rev_coord_map.push(0_isize.into());
      } else {
        let prev = *(rev_coord_map.last().unwrap());
        rev_coord_map.push(prev);
      }
    } else {
      rev_coord_map.push(ref_pos.into());
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
fn make_ref_to_aln_map<L: SpaceMarker>(ref_seq: &[Nuc]) -> Vec<Position<AlignmentCoords, L, NucSpace>> {
  let mut coord_map = Vec::<Position<AlignmentCoords, L, NucSpace>>::with_capacity(ref_seq.len());

  for (i, nuc) in ref_seq.iter().enumerate() {
    if !nuc.is_gap() {
      coord_map.push(i.into());
    }
  }

  coord_map.shrink_to_fit();
  coord_map
}

// /// Converts sequence alignment to reference coordinates and vice versa.
// ///
// /// Positions of nucleotides in the sequences change after alignment due to insertion stripping. Some operations are
// /// done in alignment space, while others in reference space. This struct allows for conversion of position indices
// /// from one space to another.
// #[derive(Clone, Debug, Deserialize, Serialize, schemars::JsonSchema, Eq, PartialEq)]
// #[serde(rename_all = "camelCase")]
// struct CoordMap<L: SpaceMarker> {
//   aln_to_ref_table: Vec<Position<ReferenceCoords, L, NucSpace>>,
//   ref_to_aln_table: Vec<Position<AlignmentCoords, L, NucSpace>>,
// }
//
// impl<L: SpaceMarker> CoordMap<L> {
//   /// Takes aligned ref_seq before insertions (i.e. gaps in ref) are stripped
//   pub fn new(ref_seq: &[Nuc]) -> Self {
//     Self {
//       aln_to_ref_table: make_aln_to_ref_map(ref_seq),
//       ref_to_aln_table: make_ref_to_aln_map(ref_seq),
//     }
//   }
//
//   pub fn aln_to_ref_position(
//     &self,
//     aln: Position<AlignmentCoords, L, NucSpace>,
//   ) -> Position<ReferenceCoords, L, NucSpace> {
//     self.aln_to_ref_table[aln.as_usize()]
//   }
//
//   pub fn ref_to_aln_position(
//     &self,
//     reff: Position<ReferenceCoords, L, NucSpace>,
//   ) -> Position<AlignmentCoords, L, NucSpace> {
//     self.ref_to_aln_table[reff.as_usize()]
//   }
//
//   pub fn aln_to_ref_range(
//     &self,
//     aln_range: &Range<Position<AlignmentCoords, L, NucSpace>>,
//   ) -> Range<Position<ReferenceCoords, L, NucSpace>> {
//     Range::<Position<ReferenceCoords, L, NucSpace>>::new(
//       self.aln_to_ref_table[aln_range.begin.as_usize()],
//       (self.aln_to_ref_table[aln_range.end.as_usize() - 1].as_usize() + 1).into(),
//     )
//   }
//
//   pub fn ref_to_aln_range(
//     &self,
//     ref_range: &Range<Position<ReferenceCoords, L, NucSpace>>,
//   ) -> Range<Position<AlignmentCoords, L, NucSpace>> {
//     Range::<Position<AlignmentCoords, L, NucSpace>>::new(
//       self.ref_to_aln_table[ref_range.begin.as_usize()],
//       (self.ref_to_aln_table[ref_range.end.as_usize() - 1].as_usize() + 1).into(),
//     )
//   }
//
//   pub fn extract_cds_aln(&self, seq_aln: &[Nuc], cds: &Cds) -> (Vec<Nuc>, CoordMapForCds) {
//     let mut cds_aln_seq = vec![];
//     let mut cds_to_aln_map = vec![];
//     for segment in &cds.segments {
//       let range = self.ref_to_aln_range(&segment.range);
//       cds_to_aln_map.push(CdsToAln {
//         global: range.iter().collect_vec(),
//         start: cds_aln_seq.len(),
//         len: range.len(),
//       });
//       cds_aln_seq.extend_from_slice(&seq_aln[range.to_std()]);
//     }
//
//     // Reverse strands should be reverse-complemented
//     if cds.strand == GeneStrand::Reverse {
//       reverse_complement_in_place(&mut cds_aln_seq);
//     }
//
//     (cds_aln_seq, CoordMapForCds::new(cds_to_aln_map))
//   }
// }

/// Converts from global alignment coordinates to global reference coordinates and vice versa.
///
/// Positions of nucleotides in the sequences change after alignment due to insertion stripping. Some operations are
/// done in alignment space, while others in reference space. This struct allows for conversion of positions and ranges
/// from one space to another.
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
pub struct CoordMapGlobal {
  aln_to_ref_table: Vec<NucRefGlobalPosition>,
  ref_to_aln_table: Vec<NucAlnGlobalPosition>,
}

impl CoordMapGlobal {
  /// Takes aligned ref_seq before insertions (i.e. gaps in ref) are stripped
  pub fn new(ref_seq_unstripped: &[Nuc]) -> Self {
    Self {
      aln_to_ref_table: make_aln_to_ref_map(ref_seq_unstripped),
      ref_to_aln_table: make_ref_to_aln_map(ref_seq_unstripped),
    }
  }

  #[inline]
  pub fn aln_to_ref_position(&self, aln: NucAlnGlobalPosition) -> NucRefGlobalPosition {
    self.aln_to_ref_table[aln.as_usize()]
  }

  #[inline]
  pub fn ref_to_aln_position(&self, reff: NucRefGlobalPosition) -> NucAlnGlobalPosition {
    self.ref_to_aln_table[reff.as_usize()]
  }

  #[inline]
  pub fn aln_to_ref_range(&self, aln_range: &NucAlnGlobalRange) -> NucRefGlobalRange {
    Range::new(
      self.aln_to_ref_position(aln_range.begin),
      self.aln_to_ref_position(aln_range.end - 1) + 1,
    )
  }

  #[inline]
  pub fn ref_to_aln_range(&self, ref_range: &NucRefGlobalRange) -> NucAlnGlobalRange {
    Range::new(
      self.ref_to_aln_position(ref_range.begin),
      self.ref_to_aln_position(ref_range.end - 1) + 1,
    )
  }

  pub fn extract_cds_aln(&self, seq_aln: &[Nuc], cds: &Cds) -> (Vec<Nuc>, CoordMapForCds) {
    let mut cds_aln_seq = vec![];
    let mut cds_to_aln_map = vec![];
    for segment in &cds.segments {
      let range = self.ref_to_aln_range(&segment.range);
      cds_to_aln_map.push(CdsToAln {
        global: range.iter().collect_vec(),
        start: cds_aln_seq.len() as isize,
        len: range.len() as isize,
      });
      cds_aln_seq.extend_from_slice(&seq_aln[range.to_std()]);
    }

    // Reverse strands should be reverse-complemented
    if cds.strand == GeneStrand::Reverse {
      reverse_complement_in_place(&mut cds_aln_seq);
    }

    (cds_aln_seq, CoordMapForCds::new(cds_to_aln_map))
  }
}

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
  fn aln_to_ref_position(&self, aln: NucAlnLocalPosition) -> NucRefLocalPosition {
    self.aln_to_ref_table[aln.as_usize()]
  }

  #[inline]
  fn aln_to_ref_range(&self, aln_range: &NucAlnLocalRange) -> NucRefLocalRange {
    Range::new(
      self.aln_to_ref_position(aln_range.begin),
      self.aln_to_ref_position(aln_range.end - 1) + 1,
    )
  }

  /// Converts nucleotide local reference position to codon position
  fn local_to_codon_ref_position(pos: NucRefLocalPosition) -> AaRefPosition {
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

/// Convert ref local nuc CDS position to AA ref position, excluding partial codons (rounding to lower bound)
fn local_to_codon_position_exclusive(pos: NucRefLocalPosition) -> AaRefPosition {
  // Make sure the position is adjusted to lower boundary of codon (i.e. exclude incomplete codons)
  // TODO: ensure that adjustment direction is correct for reverse strands
  AaRefPosition::new(div_floor(pos.as_isize(), 3))
}

/// Convert ref local nuc CDS range to AA ref range, excluding partial codons
pub fn local_to_codon_range_exclusive(range: &NucRefLocalRange) -> AaRefRange {
  AaRefRange::new(
    local_to_codon_position_exclusive(range.begin),
    local_to_codon_position_exclusive(range.end),
  )
}

#[derive(Clone, Debug, Deserialize, Serialize, schemars::JsonSchema, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub struct CdsToAln<L: SpaceMarker> {
  global: Vec<Position<AlignmentCoords, L, NucSpace>>,
  start: isize,
  len: isize,
}

#[derive(Clone, Debug, Deserialize, Serialize, schemars::JsonSchema, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CdsAlnPosition {
  Before,
  Inside(NucAlnGlobalPosition),
  After,
}

#[derive(Clone, Debug, Deserialize, Serialize, schemars::JsonSchema, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CdsRefPosition {
  Before,
  Inside(NucRefGlobalPosition),
  After,
}

#[derive(Clone, Debug, Deserialize, Serialize, schemars::JsonSchema, Eq, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum CdsRange {
  Before,
  Covered(NucAlnGlobalRange),
  After,
}

#[derive(Clone, Debug, Deserialize, Serialize, schemars::JsonSchema, Eq, PartialEq)]
pub struct CoordMapForCds {
  cds_to_aln_map: Vec<CdsToAln<GlobalSpace>>,
}

impl CoordMapForCds {
  pub fn new(cds_to_aln_map: Vec<CdsToAln<GlobalSpace>>) -> Self {
    Self { cds_to_aln_map }
  }

  /// Map a position in the extracted alignment of the CDS to the global alignment.
  /// Returns a result for each CDS segment, but a single position can  only be in one CDS segment.
  pub fn cds_to_global_aln_position(
    &self,
    cds_aln_pos: NucAlnLocalPosition,
  ) -> impl Iterator<Item = CdsAlnPosition> + '_ {
    self.cds_to_aln_map.iter().map(move |segment| {
      let pos_in_segment = cds_aln_pos - segment.start;

      if pos_in_segment < 0 {
        CdsAlnPosition::Before
      } else if pos_in_segment >= segment.len {
        CdsAlnPosition::After
      } else {
        CdsAlnPosition::Inside(segment.global[pos_in_segment.as_usize()])
      }
    })
  }

  pub fn cds_to_global_aln_position_one(&self, cds_aln_pos: NucAlnLocalPosition) -> NucAlnGlobalPosition {
    self
      .cds_to_global_aln_position(cds_aln_pos)
      .find_map(|pos| match pos {
        CdsAlnPosition::Inside(pos) => Some(pos),
        _ => None,
      })
      .unwrap()
  }

  // Map a range in the extracted alignment of the CDS to the global alignment.
  // Returns a result for each CDS segment, as a range can span multiple CDS segments.
  pub fn cds_to_global_aln_range(&self, range: &NucAlnLocalRange) -> impl Iterator<Item = NucAlnGlobalRange> + '_ {
    let cds_to_aln_begin = self.cds_to_global_aln_position(range.begin);

    // need to map end position -1 to correspond to the last included position
    let cds_to_aln_end = self.cds_to_global_aln_position(range.end - 1);

    izip!(cds_to_aln_begin, cds_to_aln_end, &self.cds_to_aln_map)
      .into_iter()
      .filter_map(|(seg_start, seg_end, seg_map)| {
        let begin = match seg_start {
          CdsAlnPosition::Before => seg_map.global[0],
          CdsAlnPosition::Inside(pos) => pos,
          CdsAlnPosition::After => {
            return None;
          }
        };

        // map end and increment by one to correspond to open interval
        let end = match seg_end {
          CdsAlnPosition::Before => {
            return None;
          }
          CdsAlnPosition::Inside(pos) => pos + 1,
          CdsAlnPosition::After => seg_map.global.last().unwrap() + 1,
        };

        Some(Range { begin, end })
      })
  }

  /// Map a position in the extracted alignment of the CDS to the reference sequence.
  /// Returns a result for each CDS segment, but a single position can  only be in one CDS segment.
  pub fn cds_to_global_ref_position<'a>(
    &'a self,
    pos: NucAlnLocalPosition,
    coord_map: &'a CoordMapGlobal,
  ) -> impl Iterator<Item = CdsRefPosition> + 'a {
    self.cds_to_global_aln_position(pos).map(|cds_pos| match cds_pos {
      CdsAlnPosition::Before => CdsRefPosition::Before,
      CdsAlnPosition::Inside(pos) => CdsRefPosition::Inside(coord_map.aln_to_ref_position(pos)),
      CdsAlnPosition::After => CdsRefPosition::After,
    })
  }

  pub fn cds_to_global_ref_range<'a>(
    &'a self,
    range: &'a NucAlnLocalRange,
    coord_map: &'a CoordMapGlobal,
  ) -> impl Iterator<Item = NucRefGlobalRange> + 'a {
    self.cds_to_global_aln_range(range).map(|range| {
      let begin = coord_map.aln_to_ref_position(range.begin);
      let end = coord_map.aln_to_ref_position(range.end - 1) + 1;
      Range { begin, end }
    })
  }

  /// Expand a codon in the extracted alignment to a range in the global alignment
  pub fn codon_to_global_aln_range(&self, codon: AaAlnPosition) -> impl Iterator<Item = NucAlnGlobalRange> + '_ {
    let begin = (codon * 3).as_usize();
    let end = begin + 3;
    self.cds_to_global_aln_range(&NucAlnLocalRange::from_usize(begin, end))
  }
}

pub fn extract_cds_ref(seq: &[Nuc], cds: &Cds) -> Vec<Nuc> {
  let mut nucs = cds
    .segments
    .iter()
    .flat_map(|cds_segment| seq[cds_segment.range.to_std()].iter().copied())
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
  use crate::gene::cds::{CdsSegment, WrappingPart};
  use crate::io::nuc::to_nuc_seq;
  use eyre::Report;
  use maplit::hashmap;
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
          range: NucRefGlobalRange::from_usize(*start, *end),
          landmark: None,
          wrapping_part: WrappingPart::NonWrapping,
          strand: GeneStrand::Forward,
          frame: 0,
          exceptions: vec![],
          attributes: hashmap!(),
          source_record: None,
          compat_is_gene: false,
          color: None,
        })
        .collect_vec(),
      proteins: vec![],
      exceptions: vec![],
      attributes: hashmap! {},
      compat_is_gene: false,
      color: None,
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
    let global_coord_map = CoordMapGlobal::new(&ref_aln);

    let (ref_cds_aln, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);
    assert_eq!(
      ref_cds_aln,
      to_nuc_seq("GCACA---ATCGTTTTTAAAACGGGTTTGCGGTGTAAGTCGTCTT")?
    );

    assert_eq!(
      ref_cds_to_aln,
       CoordMapForCds::new(vec![
        CdsToAln {
          global: vec_into![4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          start: 0,
          len: 20,
        },
        CdsToAln {
          global: vec_into![23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
          start: 20,
          len: 19,
        },
        CdsToAln {
          global: vec_into![48, 49, 50, 51, 52, 53],
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
          global: vec_into![4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23],
          start: 0,
          len: 20,
        },
        CdsToAln {
          global: vec_into![23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41],
          start: 20,
          len: 19,
        },
        CdsToAln {
          global: vec_into![48, 49, 50, 51, 52, 53],
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

    let global_coord_map = CoordMapGlobal::new(&ref_aln);

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
    let global_coord_map = CoordMapGlobal::new(&ref_aln);
    let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);

    assert_eq!(
      ref_cds_to_aln.cds_to_global_aln_position(10.into()).collect_vec(),
      [CdsAlnPosition::Inside(14.into()), CdsAlnPosition::Before, CdsAlnPosition::Before]
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
    let global_coord_map = CoordMapGlobal::new(&ref_aln);
    let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);

    assert_eq!(
      ref_cds_to_aln.cds_to_global_aln_range(&NucAlnLocalRange::from_usize(10, 15)).collect_vec(),
      [NucAlnGlobalRange::from_usize(14, 19)]
    );
    Ok(())
  }
  //
  // #[rustfmt::skip]
  // #[rstest]
  // fn maps_codon_to_global_aln_range() -> Result<(), Report> {
  //   // CDS range                  11111111111111111
  //   // CDS range                                  2222222222222222222      333333
  //   // index                  012345678901234567890123456789012345678901234567890123456
  //   let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
  //
  //   let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
  //   let global_coord_map = CoordMap::new(&ref_aln);
  //   let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);
  //
  //   assert_eq!(
  //     ref_cds_to_aln.codon_to_global_aln_range(5).collect_vec(),
  //     [
  //       Range::new(19, 22),
  //     ]
  //   );
  //
  //   assert_eq!(
  //     ref_cds_to_aln.codon_to_global_aln_range(6).collect_vec(),
  //     [
  //       Range::new(22, 24),
  //       Range::new(23, 24),
  //     ]
  //   );
  //
  //   assert_eq!(
  //     ref_cds_to_aln.codon_to_global_aln_range(7).collect_vec(),
  //     [Range::new(24, 27)]
  //   );
  //
  //   Ok(())
  // }
  //
  // #[rustfmt::skip]
  // #[rstest]
  // fn maps_cds_to_global_ref_position() -> Result<(), Report> {
  //   // CDS range                  11111111111111111
  //   // CDS range                                  2222222222222222222      333333
  //   // index                  012345678901234567890123456789012345678901234567890123456
  //   let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
  //
  //   let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
  //   let global_coord_map = CoordMap::new(&ref_aln);
  //   let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);
  //
  //   assert_eq!(
  //     ref_cds_to_aln.cds_to_global_ref_position(10, &global_coord_map).collect_vec(),
  //     [CdsPosition::Inside(11), CdsPosition::Before, CdsPosition::Before]
  //   );
  //
  //   Ok(())
  // }
  //
  // #[rustfmt::skip]
  // #[rstest]
  // fn maps_cds_to_global_ref_range() -> Result<(), Report> {
  //   // CDS range                  11111111111111111
  //   // CDS range                                  2222222222222222222      333333
  //   // index                  012345678901234567890123456789012345678901234567890123456
  //   let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
  //
  //   let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
  //   let global_coord_map = CoordMap::new(&ref_aln);
  //   let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);
  //
  //   assert_eq!(
  //     ref_cds_to_aln.cds_to_global_ref_range(&Range::new(10, 15), &global_coord_map).collect_vec(),
  //     [
  //       Range::new(11, 16),
  //     ]
  //   );
  //   Ok(())
  // }

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
