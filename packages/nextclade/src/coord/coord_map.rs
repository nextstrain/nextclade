use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::Nuc;
use crate::coord::position::{
  AaRefPosition, AlignmentCoords, NucRefLocalPosition, NucSpace, Position, PositionLike, ReferenceCoords, SpaceMarker,
};
use crate::coord::range::{AaRefRange, NucRefLocalRange};

use num::integer::div_floor;


/// Makes the "alignment to reference" coordinate map: from alignment coordinates to reference coordinates.
/// Given a position of a letter in the aligned sequence, the "alignment to reference" coordinate map allows to
/// lookup the position of the corresponding letter in the reference sequence.
pub fn make_aln_to_ref_map<L: SpaceMarker>(ref_seq: &[Nuc]) -> Vec<Position<ReferenceCoords, L, NucSpace>> {
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
pub fn make_ref_to_aln_map<L: SpaceMarker>(ref_seq: &[Nuc]) -> Vec<Position<AlignmentCoords, L, NucSpace>> {
  let mut coord_map = Vec::<Position<AlignmentCoords, L, NucSpace>>::with_capacity(ref_seq.len());

  for (i, nuc) in ref_seq.iter().enumerate() {
    if !nuc.is_gap() {
      coord_map.push(i.into());
    }
  }

  coord_map.shrink_to_fit();
  coord_map
}

/// Convert ref local nuc CDS position to AA ref position, excluding partial codons (rounding to lower bound)
pub fn local_to_codon_position_exclusive(pos: NucRefLocalPosition) -> AaRefPosition {
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

#[cfg(test)]
mod coord_map_tests {
  // use super::*;
  // use crate::gene::cds_segment::{CdsSegment, WrappingPart};
  // use crate::gene::frame::Frame;
  // use crate::gene::phase::Phase;
  // use crate::alphabet::nuc::to_nuc_seq;
  // use eyre::Report;
  // use maplit::hashmap;
  // use pretty_assertions::assert_eq;
  // use rstest::rstest;
  //
  //
  // #[rustfmt::skip]
  // #[rstest]
  // fn maps_cds_to_global_aln_position() -> Result<(), Report> {
  //   // CDS range                  11111111111111111
  //   // CDS range                                  2222222222222222222      333333
  //   // index                  012345678901234567890123456789012345678901234567890123456
  //   let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
  //
  //   let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
  //   let global_coord_map = CoordMapGlobal::new(&ref_aln);
  //   let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);
  //
  //   assert_eq!(
  //     ref_cds_to_aln.cds_to_global_aln_position(10.into()).collect_vec(),
  //     [CdsAlnPosition::Inside(14.into()), CdsAlnPosition::Before, CdsAlnPosition::Before]
  //   );
  //   Ok(())
  // }
  //
  // #[rustfmt::skip]
  // #[rstest]
  // fn maps_cds_to_global_aln_range() -> Result<(), Report> {
  //   // CDS range                  11111111111111111
  //   // CDS range                                  2222222222222222222      333333
  //   // index                  012345678901234567890123456789012345678901234567890123456
  //   let ref_aln = to_nuc_seq("TGATGCACA---ATCGTTTTTAAACGGGTTTGCGGTGTAAGTGCAGCCCGTCTTACA")?;
  //
  //   let cds = create_fake_cds(&[(4, 21), (20, 39), (45, 51)]);
  //   let global_coord_map = CoordMapGlobal::new(&ref_aln);
  //   let (_, ref_cds_to_aln) = global_coord_map.extract_cds_aln(&ref_aln, &cds);
  //
  //   assert_eq!(
  //     ref_cds_to_aln.cds_to_global_aln_range(&NucAlnLocalRange::from_usize(10, 15)).collect_vec(),
  //     [NucAlnGlobalRange::from_usize(14, 19)]
  //   );
  //   Ok(())
  // }
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
