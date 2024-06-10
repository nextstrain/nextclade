use crate::analyze::aa_del::{AaDel, AaDelRange};
use crate::analyze::abstract_mutation::Pos;
use crate::analyze::nuc_del::{NucDel, NucDelRange};
use crate::coord::position::PositionLike;
use crate::coord::range::Range;
use itertools::Itertools;

pub fn group_adjacent<P: PositionLike>(dels: &[impl Pos<P>]) -> Vec<Range<P>> {
  let mut ranges = Vec::with_capacity(dels.len() / 2);
  if let Some(first) = dels.first() {
    let mut begin = first.pos();
    let mut end = begin;
    for del in dels.iter().skip(1) {
      if del.pos().as_isize() != end.as_isize() + 1 {
        ranges.push(Range::new(begin, end));
        begin = del.pos();
      }
      end = del.pos();
    }
    ranges.push(Range::new(begin, end));
  } else {
    return vec![];
  }
  ranges.shrink_to_fit();
  ranges
}

pub fn group_adjacent_nuc_dels(dels: &[NucDel]) -> Vec<NucDelRange> {
  group_adjacent(dels)
    .into_iter()
    .map(|r| NucDelRange::new(r.begin, r.end))
    .collect_vec()
}

pub fn group_adjacent_aa_dels(dels: &[AaDel]) -> Vec<AaDelRange> {
  group_adjacent(dels)
    .into_iter()
    .map(|r| AaDelRange::new(r.begin, r.end))
    .collect_vec()
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::analyze::nuc_del::{NucDel, NucDelRange};
  use eyre::Report;

  #[test]
  fn test_group_adjacent_empty_input() -> Result<(), Report> {
    let dels = vec![];
    let ranges = group_adjacent_nuc_dels(&dels);
    assert!(ranges.is_empty());
    Ok(())
  }

  #[test]
  fn test_group_adjacent_single_deletion() -> Result<(), Report> {
    let dels = vec![NucDel::from_raw(5, 'A')?];
    let ranges = group_adjacent_nuc_dels(&dels);
    assert_eq!(ranges, vec![NucDelRange::from_usize(5, 5)]);
    Ok(())
  }

  #[test]
  fn test_group_adjacent_multiple_non_adjacent_deletions() -> Result<(), Report> {
    let dels = vec![
      NucDel::from_raw(1, 'A')?,
      NucDel::from_raw(3, 'T')?,
      NucDel::from_raw(5, 'G')?,
    ];
    let ranges = group_adjacent_nuc_dels(&dels);
    assert_eq!(
      ranges,
      vec![
        NucDelRange::from_usize(1, 1),
        NucDelRange::from_usize(3, 3),
        NucDelRange::from_usize(5, 5)
      ]
    );
    Ok(())
  }

  #[test]
  fn test_group_adjacent_multiple_adjacent_deletions() -> Result<(), Report> {
    let dels = vec![
      NucDel::from_raw(1, 'A')?,
      NucDel::from_raw(2, 'T')?,
      NucDel::from_raw(3, 'G')?,
    ];
    let ranges = group_adjacent_nuc_dels(&dels);
    assert_eq!(ranges, vec![NucDelRange::from_usize(1, 3)]);
    Ok(())
  }

  #[test]
  fn test_group_adjacent_complex_mixed_deletions() -> Result<(), Report> {
    let dels = vec![
      NucDel::from_raw(1, 'A')?,
      NucDel::from_raw(3, 'T')?,
      NucDel::from_raw(4, 'G')?,
      NucDel::from_raw(6, 'C')?,
      NucDel::from_raw(8, 'A')?,
      NucDel::from_raw(9, 'T')?,
      NucDel::from_raw(10, 'G')?,
      NucDel::from_raw(12, 'C')?,
      NucDel::from_raw(14, 'A')?,
      NucDel::from_raw(16, 'T')?,
      NucDel::from_raw(17, 'G')?,
      NucDel::from_raw(19, 'C')?,
      NucDel::from_raw(21, 'A')?,
      NucDel::from_raw(23, 'T')?,
      NucDel::from_raw(24, 'G')?,
      NucDel::from_raw(26, 'C')?,
    ];
    let ranges = group_adjacent_nuc_dels(&dels);
    assert_eq!(
      ranges,
      vec![
        NucDelRange::from_usize(1, 1),
        NucDelRange::from_usize(3, 4),
        NucDelRange::from_usize(6, 6),
        NucDelRange::from_usize(8, 10),
        NucDelRange::from_usize(12, 12),
        NucDelRange::from_usize(14, 14),
        NucDelRange::from_usize(16, 17),
        NucDelRange::from_usize(19, 19),
        NucDelRange::from_usize(21, 21),
        NucDelRange::from_usize(23, 24),
        NucDelRange::from_usize(26, 26)
      ]
    );
    Ok(())
  }
}
