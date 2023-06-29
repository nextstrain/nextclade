use crate::coord::coord_map::{make_aln_to_ref_map, make_ref_to_aln_map};
use crate::gene::cds::Cds;
use crate::gene::cds_segment::WrappingPart;
use crate::gene::gene::GeneStrand;
use crate::io::nuc::Nuc;
use crate::translate::complement::reverse_complement_in_place;
use crate::utils::position::{NucAlnGlobalPosition, NucRefGlobalPosition, PositionLike};
use crate::utils::range::{NucAlnGlobalRange, NucRefGlobalRange, Range};
use itertools::Itertools;
use serde::{Deserialize, Serialize};

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

  pub fn extract_cds_aln(&self, seq_aln: &[Nuc], cds: &Cds) -> Vec<Nuc> {
    let mut cds_aln_seq = vec![];
    for segment in &cds.segments {
      // TODO: should we use `landmark.range.end` (converted to aln coords) instead of `seq_aln.len()`?
      let range = match segment.wrapping_part {
        WrappingPart::NonWrapping => self.ref_to_aln_range(&segment.range),
        WrappingPart::WrappingStart => {
          // If segment is the first part of a segment that wraps around the origin,
          // limit the range to end of alignment (trim the overflowing parts)
          NucAlnGlobalRange::new(self.ref_to_aln_position(segment.range.begin), seq_aln.len().into())
        }
        WrappingPart::WrappingCentral(_) => {
          // If segment is one of the the middle parts of a segment that wraps around the origin,
          // it spans the entire aligned sequence.
          NucAlnGlobalRange::from_usize(0, seq_aln.len())
        }
        WrappingPart::WrappingEnd(_) => {
          // If segment is the last part of a segment that wraps around the origin,
          // start range at the beginning of the alignment (trim the underflowing parts)
          NucAlnGlobalRange::new(0.into(), self.ref_to_aln_position(segment.range.end - 1) + 1)
        }
      };

      let mut nucs = seq_aln[range.to_std()].to_vec();
      if segment.strand == GeneStrand::Reverse {
        reverse_complement_in_place(&mut nucs);
      }
      cds_aln_seq.extend_from_slice(&nucs);
    }

    cds_aln_seq
  }
}

pub fn extract_cds_ref(seq: &[Nuc], cds: &Cds) -> Vec<Nuc> {
  let nucs = cds
    .segments
    .iter()
    .flat_map(|cds_segment| {
      let mut nucs = seq[cds_segment.range.to_std()].to_vec();
      if cds_segment.strand == GeneStrand::Reverse {
        reverse_complement_in_place(&mut nucs);
      }
      nucs
    })
    .collect_vec();

  nucs
}

#[cfg(test)]
mod coord_map_tests {
  use super::*;
  use crate::gene::cds_segment::{CdsSegment, WrappingPart};
  use crate::gene::frame::Frame;
  use crate::gene::phase::Phase;
  use crate::io::nuc::to_nuc_seq;
  use crate::utils::position::Position;
  use eyre::Report;
  use itertools::Itertools;
  use maplit::hashmap;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  fn create_fake_cds(segment_ranges: &[(isize, isize)]) -> Cds {
    Cds {
      id: "".to_owned(),
      name: "".to_owned(),
      product: "".to_owned(),
      segments: {
        let mut segment_start = 0_isize;
        segment_ranges
          .iter()
          .map(|(begin, end)| {
            let range_local = Range::from_isize(segment_start, segment_start + end - begin);
            let phase = Phase::from_begin(range_local.begin).unwrap();
            let frame = Frame::from_begin(Position::from(*begin)).unwrap();

            let segment = CdsSegment {
              index: 0,
              id: "".to_owned(),
              name: "".to_owned(),
              range: NucRefGlobalRange::from_isize(*begin, *end),
              range_local,
              landmark: None,
              wrapping_part: WrappingPart::NonWrapping,
              strand: GeneStrand::Forward,
              frame,
              phase,
              exceptions: vec![],
              attributes: hashmap!(),
              source_record: None,
              compat_is_gene: false,
              color: None,
            };
            segment_start = segment_start + end - begin;
            segment
          })
          .collect_vec()
      },
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
    let reff = to_nuc_seq("TGATGCACAATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
    let expected = to_nuc_seq("GCACAATCGTTTTTAAAACGGGTTTGCGGTGTAAGTCGTCTT")?;
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

    let ref_cds_aln = global_coord_map.extract_cds_aln(&ref_aln, &cds);
    assert_eq!(
      ref_cds_aln,
      to_nuc_seq("GCACA---ATCGTTTTTAAAACGGGTTTGCGGTGTAAGTCGTCTT")?
    );

    let qry_cds_aln = global_coord_map.extract_cds_aln(&qry_aln, &cds);
    assert_eq!(
      qry_cds_aln,
      to_nuc_seq("GCACACGCATC---TTTAAAACGGGTTTGCGGTGTCAGTCGTCTT")?
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
}
