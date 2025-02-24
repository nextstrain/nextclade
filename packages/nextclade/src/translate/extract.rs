use crate::alphabet::nuc::Nuc;
use crate::coord::coord_map_global::CoordMapGlobal;
use crate::coord::range::NucAlnGlobalRange;
use crate::gene::cds::Cds;
use crate::gene::cds_segment::{CdsSegment, WrappingPart};
use crate::gene::gene::GeneStrand;
use crate::translate::complement::reverse_complement_in_place;
use itertools::Itertools;

pub fn extract_cds_from_aln(seq_aln: &[Nuc], cds: &Cds, coord_map_global: &CoordMapGlobal) -> Vec<Nuc> {
  let mut cds_aln_seq = vec![];
  for segment in &cds.segments {
    let range = cds_segment_aln_range(seq_aln, coord_map_global, segment);

    let mut nucs = seq_aln[range.to_std()].to_vec();
    if segment.strand == GeneStrand::Reverse {
      reverse_complement_in_place(&mut nucs);
    }
    cds_aln_seq.extend_from_slice(&nucs);
  }

  cds_aln_seq
}

pub fn cds_segment_aln_range(
  seq_aln: &[Nuc],
  coord_map_global: &CoordMapGlobal,
  segment: &CdsSegment,
) -> NucAlnGlobalRange {
  // TODO: should we use `landmark.range.end` (converted to aln coords) instead of `seq_aln.len()`?
  match segment.wrapping_part {
    WrappingPart::NonWrapping => coord_map_global.ref_to_aln_range(&segment.range),
    WrappingPart::WrappingStart => {
      // If segment is the first part of a segment that wraps around the origin,
      // limit the range to end of alignment (trim the overflowing parts)
      NucAlnGlobalRange::new(
        coord_map_global.ref_to_aln_position(segment.range.begin),
        seq_aln.len().into(),
      )
    }
    WrappingPart::WrappingCentral(_) => {
      // If segment is one of the middle parts of a segment that wraps around the origin,
      // it spans the entire aligned sequence.
      NucAlnGlobalRange::from_usize(0, seq_aln.len())
    }
    WrappingPart::WrappingEnd(_) => {
      // If segment is the last part of a segment that wraps around the origin,
      // start range at the beginning of the alignment (trim the underflowing parts)
      NucAlnGlobalRange::new(
        0.into(),
        coord_map_global.ref_to_aln_position(segment.range.end - 1) + 1,
      )
    }
  }
}

pub fn extract_cds_from_ref(seq: &[Nuc], cds: &Cds) -> Vec<Nuc> {
  cds
    .segments
    .iter()
    .flat_map(|cds_segment| {
      let mut nucs = seq[cds_segment.range.to_std()].to_vec();
      if cds_segment.strand == GeneStrand::Reverse {
        reverse_complement_in_place(&mut nucs);
      }
      nucs
    })
    .collect_vec()
}

#[cfg(test)]
mod coord_map_tests {
  use super::*;
  use crate::alphabet::nuc::to_nuc_seq;
  use crate::coord::position::Position;
  use crate::coord::range::{NucRefGlobalRange, Range};
  use crate::gene::cds_segment::{CdsSegment, WrappingPart};
  use crate::gene::frame::Frame;
  use crate::gene::phase::Phase;
  use eyre::Report;
  use indexmap::indexmap;
  use itertools::Itertools;
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
              attributes: indexmap!(),
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
      attributes: indexmap! {},
      compat_is_gene: false,
      color: None,
    }
  }

  //noinspection SpellCheckingInspection
  #[rustfmt::skip]
  #[rstest]
  fn extracts_cds_sequence() -> Result<(), Report> {
    // CDS range                   11111111111111111
    // CDS range                                   2222222222222222222      333333
    // index                   012345678901234567890123456789012345678901234567890123
    let reff = to_nuc_seq("TGATGCACAATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
    let expected = to_nuc_seq("GCACAATCGTTTTTAAAACGGGTTTGCGGTGTAAGTCGTCTT")?;
    let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
    let actual = extract_cds_from_ref(&reff, &cds);
    assert_eq!(actual, expected);
    Ok(())
  }

  //noinspection SpellCheckingInspection
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

    let ref_cds_aln = extract_cds_from_aln(&ref_aln, &cds, &global_coord_map);
    assert_eq!(
      ref_cds_aln,
      to_nuc_seq("GCACA---ATCGTTTTTAAAACGGGTTTGCGGTGTAAGTCGTCTT")?
    );

    let qry_cds_aln = extract_cds_from_aln(&qry_aln, &cds, &global_coord_map);
    assert_eq!(
      qry_cds_aln,
      to_nuc_seq("GCACACGCATC---TTTAAAACGGGTTTGCGGTGTCAGTCGTCTT")?
    );

    Ok(())
  }
}
