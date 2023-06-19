use crate::gene::cds::{Cds, WrappingPart};
use crate::gene::gene::GeneStrand;
use crate::io::letter::Letter;
use crate::utils::range::{
  AaRefPosition, CoordsMarker, NucRefGlobalPosition, NucRefGlobalRange, NucRefLocalPosition, PositionLike,
  SeqTypeMarker, SpaceMarker,
};
use itertools::Itertools;
use serde::{Deserialize, Serialize};

pub fn cds_nuc_pos_to_ref(cds: &Cds, pos: NucRefLocalPosition) -> NucRefGlobalPosition {
  assert!(pos < cds.len() as isize);
  let mut remaining_pos = pos;
  let mut segment_index = 0;
  let mut segment = &cds.segments[segment_index];
  while remaining_pos >= segment.len() as isize {
    remaining_pos -= segment.len() as isize;
    segment_index += 1;
    segment = &cds.segments[segment_index];
  }

  if segment.strand == GeneStrand::Forward {
    NucRefGlobalPosition::from(segment.range.begin.as_isize() + remaining_pos.as_isize())
  } else {
    NucRefGlobalPosition::from(segment.range.end.as_isize() - 1 - remaining_pos.as_isize())
  }
}

pub fn cds_codon_pos_to_ref_pos(cds: &Cds, codon: AaRefPosition) -> NucRefGlobalPosition {
  cds_nuc_pos_to_ref(cds, NucRefLocalPosition::new(codon.as_isize() * 3))
}

pub fn cds_codon_pos_to_ref_range(cds: &Cds, codon: AaRefPosition) -> NucRefGlobalRange {
  let begin = codon.as_isize() * 3;
  let end = begin + 3;
  NucRefGlobalRange::new(
    cds_nuc_pos_to_ref(cds, NucRefLocalPosition::new(begin)),
    cds_nuc_pos_to_ref(cds, NucRefLocalPosition::new(end) - 1) + 1,
  )
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
  use crate::gene::cds::{CdsSegment, WrappingPart};
  use crate::gene::gene::GeneStrand::{Forward, Reverse};
  use crate::utils::range::Position;
  use maplit::hashmap;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  fn create_fake_cds(segment_ranges: &[(usize, usize, GeneStrand)]) -> Cds {
    Cds {
      id: "".to_owned(),
      name: "".to_owned(),
      product: "".to_owned(),
      strand: Forward,
      segments: segment_ranges
        .iter()
        .map(|(start, end, strand)| CdsSegment {
          index: 0,
          id: "".to_owned(),
          name: "".to_owned(),
          range: NucRefGlobalRange::from_usize(*start, *end),
          landmark: None,
          wrapping_part: WrappingPart::NonWrapping,
          strand: *strand,
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
