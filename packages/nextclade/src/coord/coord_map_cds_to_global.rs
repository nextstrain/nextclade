use crate::coord::position::{AaRefPosition, NucRefGlobalPosition, NucRefLocalPosition, PositionLike};
use crate::coord::range::{intersect_or_none, NucRefGlobalRange, NucRefLocalRange};
use crate::gene::cds::Cds;

use crate::gene::gene::GeneStrand;
use assert2::assert;
use itertools::Itertools;

pub fn cds_nuc_pos_to_ref(cds: &Cds, pos: NucRefLocalPosition) -> NucRefGlobalPosition {
  assert!(pos < cds.len() as isize);

  let segment = cds
    .segments
    .iter()
    .find(|segment| segment.range_local.contains(pos))
    .expect("Position is expected to be in exactly one segment, but none is found");

  let pos_in_segment = isize::from(pos - segment.range_local.begin);
  match segment.strand {
    GeneStrand::Forward => segment.range.begin + pos_in_segment,
    GeneStrand::Reverse => segment.range.end - 1 - pos_in_segment,
  }
}

pub fn cds_codon_pos_to_ref_pos(cds: &Cds, codon: AaRefPosition) -> NucRefGlobalPosition {
  cds_nuc_pos_to_ref(cds, NucRefLocalPosition::new(codon.as_isize() * 3))
}

pub fn cds_range_to_ref_ranges(cds: &Cds, range: &NucRefLocalRange) -> Vec<(NucRefGlobalRange, GeneStrand)> {
  assert!(range.begin <= range.end);
  assert!(range.end <= cds.len() as isize);

  cds
    .segments
    .iter()
    .filter_map(|segment| {
      intersect_or_none(&segment.range_local, range).map(|NucRefLocalRange { begin, end }| {
        #[rustfmt::skip]
        let begin = cds_nuc_pos_to_ref(cds, begin);
        let end = cds_nuc_pos_to_ref(cds, end - 1);
        let global_range = match segment.strand {
          GeneStrand::Forward => NucRefGlobalRange::new(begin, end + 1),
          GeneStrand::Reverse => NucRefGlobalRange::new(end, begin + 1),
        };
        (global_range, segment.strand)
      })
    })
    .collect_vec()
}

pub fn cds_codon_pos_to_ref_range(cds: &Cds, codon: AaRefPosition) -> Vec<(NucRefGlobalRange, GeneStrand)> {
  let begin = codon.as_isize() * 3;
  let end = begin + 3;
  cds_range_to_ref_ranges(cds, &NucRefLocalRange::from_isize(begin, end))
}

pub fn global_ref_pos_to_local(cds: &Cds, pos: NucRefGlobalPosition) -> Vec<NucRefLocalPosition> {
  let mut cds_segment_start = 0_isize;
  let mut cds_positions = vec![];
  for segment in &cds.segments {
    if segment.range.contains(pos) {
      let cds_position = NucRefLocalPosition::new(if segment.strand == GeneStrand::Forward {
        cds_segment_start + pos.as_isize() - segment.range.begin.as_isize()
      } else {
        cds_segment_start + (segment.range.end.as_isize() - 1 - pos.as_isize())
      });
      cds_positions.push(cds_position);
    }
    cds_segment_start += segment.len() as isize;
  }
  cds_positions
}

#[cfg(test)]
mod coord_map_tests {
  use super::*;
  use crate::coord::position::Position;
  use crate::coord::range::Range;
  use crate::gene::cds_segment::{CdsSegment, WrappingPart};
  use crate::gene::frame::Frame;
  use crate::gene::gene::GeneStrand::{Forward, Reverse};
  use crate::gene::phase::Phase;
  use indexmap::indexmap;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  fn create_fake_cds(segment_ranges: &[(isize, isize, GeneStrand)]) -> Cds {
    Cds {
      id: "".to_owned(),
      name: "".to_owned(),
      product: "".to_owned(),
      segments: {
        let mut segment_start = 0_isize;
        segment_ranges
          .iter()
          .map(|(begin, end, strand)| {
            let range_local = Range::from_isize(segment_start, segment_start + end - begin);
            let phase = Phase::from_begin(range_local.begin).unwrap();
            let frame = Frame::from_begin(Position::new(*begin)).unwrap();

            let segment = CdsSegment {
              index: 0,
              id: "".to_owned(),
              name: "".to_owned(),
              range: NucRefGlobalRange::from_isize(*begin, *end),
              range_local,
              landmark: None,
              wrapping_part: WrappingPart::NonWrapping,
              strand: *strand,
              frame,
              phase,
              exceptions: vec![],
              attributes: indexmap!(),
              source_record: None,
              compat_is_gene: false,
              color: None,
              gff_seqid: None,
              gff_source: None,
              gff_feature_type: None,
            };
            segment_start = segment_start + end - begin;
            segment
          })
          .collect_vec()
      },
      proteins: vec![],
      exceptions: vec![],
      attributes: indexmap! {},
      compat_is_gene: false,
      color: None,
    }
  }

  const EMPTY: &[NucRefLocalPosition] = &[];

  #[rstest]
  fn converts_cds_nuc_pos_to_ref_with_one_segment() {
    let cds = create_fake_cds(&[(4, 37, Forward)]);
    assert_eq!(cds_nuc_pos_to_ref(&cds, Position::new(3)), 7);
  }

  #[rstest]
  fn converts_cds_nuc_pos_to_ref_with_multiple_segments() {
    let cds = create_fake_cds(&[
      (4, 21, Forward),
      (20, 39, Forward), // slippage at position 20 -- 20 is read twice
      (45, 51, Forward),
    ]);
    assert_eq!(cds_nuc_pos_to_ref(&cds, Position::new(16)), 20);
    assert_eq!(cds_nuc_pos_to_ref(&cds, Position::new(17)), 20);
    assert_eq!(cds_nuc_pos_to_ref(&cds, Position::new(25)), 28);
  }

  #[rstest]
  fn converts_cds_nuc_pos_to_ref_with_reverse_strand() {
    let cds = create_fake_cds(&[(45, 51, Reverse), (4, 21, Reverse)]);
    assert_eq!(cds_nuc_pos_to_ref(&cds, Position::new(0)), 50);
    assert_eq!(cds_nuc_pos_to_ref(&cds, Position::new(7)), 19);
  }

  #[rstest]
  fn converts_global_ref_pos_to_local_with_one_segment() {
    let cds = create_fake_cds(&[(4, 37, Forward)]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(2)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(4)), vec![0]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(20)), vec![16]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(38)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(39)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(45)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(50)), EMPTY);
  }

  #[rstest]
  fn converts_global_ref_pos_to_local_with_multiple_segments() {
    let cds = create_fake_cds(&[
      (4, 21, Forward),
      (20, 39, Forward), // slippage at position 20 -- 20 is read twice
      (45, 51, Forward),
    ]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(2)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(4)), vec![0]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(20)), vec![16, 17]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(38)), vec![35]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(39)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(45)), vec![36]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(50)), vec![41]);
  }

  #[rstest]
  fn converts_global_ref_pos_to_local_with_reverse_strand() {
    let cds = create_fake_cds(&[(45, 51, Reverse), (4, 21, Reverse)]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(2)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(4)), vec![22]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(20)), vec![6]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(38)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(39)), EMPTY);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(45)), vec![5]);
    assert_eq!(global_ref_pos_to_local(&cds, Position::new(50)), vec![0]);
  }
}
