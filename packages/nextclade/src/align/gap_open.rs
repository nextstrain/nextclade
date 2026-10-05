use crate::align::params::AlignPairwiseParams;
use crate::alphabet::nuc::Nuc;

use crate::gene::gene::GeneStrand;
use crate::gene::gene_map::GeneMap;
use either::Either;
use itertools::Itertools;

pub fn get_gap_open_close_scores_flat(ref_seq: &[Nuc], params: &AlignPairwiseParams) -> GapScoreMap {
  let len = ref_seq.len() + 2;
  GapScoreMap {
    open: vec![params.penalty_gap_open; len],
    extend_deletion: vec![params.penalty_gap_extend; len],
  }
}

pub fn get_gap_open_close_scores_codon_aware(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> GapScoreMap {
  let GapScoreMap {
    open: mut gap_open_close,
    mut extend_deletion,
  } = get_gap_open_close_scores_flat(ref_seq, params);
  let mut is_coding = vec![false; gap_open_close.len()];
  for cds in gene_map.iter_cdses() {
    let mut cds_pos = 0;
    for segment in &cds.segments {
      let range = segment.range.to_std();
      let codon_start = if segment.strand == GeneStrand::Reverse { 2 } else { 0 };
      let range = if segment.strand == GeneStrand::Reverse {
        Either::Left(range.rev())
      } else {
        Either::Right(range)
      };

      for i in range {
        if cds_pos % 3 == codon_start {
          gap_open_close[i] = params.penalty_gap_open_in_frame;
        } else {
          gap_open_close[i] = params.penalty_gap_open_out_of_frame;
        }
        is_coding[i] = true;
        cds_pos += 1;
      }
    }
  }

  // The codon-aware open penalty applies only where a deletion starts. A deletion that starts outside of all CDSs and
  // runs into a CDS pays the additional penalty at the first coding base it covers. Otherwise an ambiguous deletion next
  // to the low-coordinate end of a CDS costs the same inside and outside of the CDS, and can remove its first bases.
  for (i, (prev, curr)) in is_coding.iter().tuple_windows().enumerate() {
    if *curr && !*prev {
      extend_deletion[i + 1] += params.penalty_gap_enter_cds;
    }
  }

  GapScoreMap {
    open: gap_open_close,
    extend_deletion,
  }
}

/// Gap penalties for each reference position
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct GapScoreMap {
  /// Penalty to open a gap. A deletion pays the value of its first deleted base. An insertion pays the value of the
  /// reference base after it
  pub open: Vec<i32>,

  /// Penalty to extend a deletion over the base
  pub extend_deletion: Vec<i32>,
}

#[cfg(test)]
mod tests {
  #![allow(clippy::field_reassign_with_default, clippy::needless_pass_by_value)]
  use super::*;
  use crate::coord::position::Position;
  use crate::coord::range::{NucRefGlobalRange, Range};
  use crate::gene::cds::Cds;
  use crate::gene::cds_segment::{CdsSegment, Truncation, WrappingPart};
  use crate::gene::frame::Frame;
  use crate::gene::gene::GeneStrand::{Forward, Reverse};
  use crate::gene::gene::{Gene, GeneStrand};
  use crate::gene::phase::Phase;
  use eyre::Report;
  use indexmap::indexmap;
  use itertools::Itertools;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};

  fn create_test_genome_annotation(cdses: &[&[(isize, isize, GeneStrand)]]) -> Result<GeneMap, Report> {
    let genes = cdses
      .iter()
      .enumerate()
      .map(|(cds_index, cds)| {
        let segments = cds
          .iter()
          .enumerate()
          .map(|(cds_segment_index, (begin, end, strand))| {
            let range_local = Range::from_isize(0, end - begin);
            let phase = Phase::from_begin(range_local.begin).unwrap();
            let frame = Frame::from_begin(Position::from(*begin)).unwrap();
            let name = format!("{cds_index}_{cds_segment_index}");

            CdsSegment {
              index: cds_segment_index,
              id: name.clone(),
              name,
              range: NucRefGlobalRange::from_isize(*begin, *end),
              range_local,
              landmark: None,
              wrapping_part: WrappingPart::NonWrapping,
              strand: *strand,
              frame,
              phase,
              truncation: Truncation::default(),
              exceptions: vec![],
              attributes: indexmap! {},
              source_record: None,
              compat_is_gene: false,
              color: None,
              gff_seqid: None,
              gff_source: None,
              gff_feature_type: None,
            }
          })
          .collect_vec();

        Gene::from_cds(&Cds {
          id: cds_index.to_string(),
          name: cds_index.to_string(),
          product: cds_index.to_string(),
          segments,
          proteins: vec![],
          exceptions: vec![],
          attributes: indexmap! {},
          compat_is_gene: false,
          color: None,
        })
      })
      .collect::<Result<Vec<Gene>, Report>>()?;

    let gene_map = GeneMap::from_genes(genes);

    gene_map.validate()?;

    Ok(gene_map)
  }

  #[derive(Debug)]
  struct Context {
    ref_seq: Vec<Nuc>,
    params: AlignPairwiseParams,
  }

  #[fixture]
  fn ctx() -> Context {
    let ref_seq = vec![Nuc::Gap; 25];

    let params = {
      let mut params = AlignPairwiseParams::default();
      params.penalty_gap_open = 6;
      params.penalty_gap_open_in_frame = 7;
      params.penalty_gap_open_out_of_frame = 8;
      params
    };

    Context { ref_seq, params }
  }

  #[rstest]
  fn test_gap_score_simple_adjacent(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let gene_map = create_test_genome_annotation(&[
      &[
        (3, 12, Forward),
        (12, 18, Forward)
      ],
    ])?;

    #[rustfmt::skip]
    //                         |                          |                 |
    //                0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
    let expect = vec![6, 6, 6, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &ctx.params);

    assert_eq!(expect, actual.open);
    Ok(())
  }

  #[rstest]
  fn test_gap_score_simple_2_cds(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let gene_map = create_test_genome_annotation(&[
      &[
        (3, 9, Forward)
      ],
      &[
        (12, 18, Forward)
      ],
    ])?;

    #[rustfmt::skip]
    //                         |                 |        |                 |
    //                0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
    let expect = vec![6, 6, 6, 7, 8, 8, 7, 8, 8, 6, 6, 6, 7, 8, 8, 7, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &ctx.params);

    assert_eq!(expect, actual.open);
    Ok(())
  }

  #[rstest]
  fn test_gap_score_simple_adjacent_reverse(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let gene_map = create_test_genome_annotation(&[
      &[
        (3, 12, Reverse),
        (12, 18, Forward)
      ],
    ])?;

    #[rustfmt::skip]
    //                         |                          |                 |
    //                0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
    let expect = vec![6, 6, 6, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7, 8, 8, 7, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &ctx.params);

    assert_eq!(expect, actual.open);
    Ok(())
  }

  #[rstest]
  fn test_gap_score_simple_nonmod3_reverse(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let gene_map = create_test_genome_annotation(&[
      &[
        (3, 11, Forward),
        (11, 18, Reverse)
      ],
    ])?;

    #[rustfmt::skip]
    //                         |                       |                    |
    //                0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
    let expect = vec![6, 6, 6, 7, 8, 8, 7, 8, 8, 7, 8, 7, 8, 8, 7, 8, 8, 7, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &ctx.params);

    assert_eq!(expect, actual.open);
    Ok(())
  }

  #[rstest]
  fn test_gap_score_simple_2_cds_reverse(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let gene_map = create_test_genome_annotation(&[
      &[
        (3, 9, Reverse)
      ],
      &[
        (12, 18, Reverse)
      ],
    ])?;

    #[rustfmt::skip]
    //                         |                 |        |                 |
    //                0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
    let expect = vec![6, 6, 6, 7, 8, 8, 7, 8, 8, 6, 6, 6, 7, 8, 8, 7, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &ctx.params);

    assert_eq!(expect, actual.open);
    Ok(())
  }

  #[rstest]
  fn test_gap_score_simple_begin(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let gene_map = create_test_genome_annotation(&[
      &[
        (0, 9, Forward)
      ],
    ])?;

    #[rustfmt::skip]
    //                |                          |
    //                0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
    let expect = vec![7, 8, 8, 7, 8, 8, 7, 8, 8, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6];

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &ctx.params);

    assert_eq!(expect, actual.open);
    Ok(())
  }

  #[rstest]
  fn test_gap_score_simple_end(ctx: Context) -> Result<(), Report> {
    #[rustfmt::skip]
    let gene_map = create_test_genome_annotation(&[
      &[
        (15, 24, Forward)
      ],
    ])?;

    #[rustfmt::skip]
    //                                                             |                          |
    //                0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
    let expect = vec![6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 7, 8, 8, 7, 8, 8, 7, 8, 8, 6, 6, 6];

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &ctx.params);

    assert_eq!(expect, actual.open);
    Ok(())
  }

  // Deletion extension penalty 1, CDS entry penalty 5: the first base of each coding run (in reference coordinates)
  // that follows a non-coding base costs 1 + 5
  #[rustfmt::skip]
  #[rstest]
  //                                                                                      0  1  2  3  4  5  6  7  8  9 10 11 12 13 14 15 16 17 18 19 20 21 22 23 24 + 2 extra
  #[case::forward(           vec![vec![(3, 9, Forward)]],                            vec![1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
  #[case::reverse(           vec![vec![(3, 9, Reverse)]],                            vec![1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
  #[case::adjacent_segments( vec![vec![(3, 12, Forward), (12, 18, Forward)]],        vec![1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
  #[case::two_cds(           vec![vec![(3, 9, Forward)], vec![(12, 18, Reverse)]],   vec![1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
  #[case::one_base_apart(    vec![vec![(3, 9, Forward)], vec![(10, 19, Forward)]],   vec![1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
  #[case::overlapping(       vec![vec![(3, 12, Forward)], vec![(9, 18, Forward)]],   vec![1, 1, 1, 6, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
  #[case::sequence_start(    vec![vec![(0, 9, Forward)]],                            vec![1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1])]
  #[trace]
  fn test_gap_score_extend_deletion_enter_cds(
    ctx: Context,
    #[case] cdses: Vec<Vec<(isize, isize, GeneStrand)>>,
    #[case] expect: Vec<i32>,
  ) -> Result<(), Report> {
    let gene_map = create_test_genome_annotation(&cdses.iter().map(Vec::as_slice).collect_vec())?;
    let params = AlignPairwiseParams {
      penalty_gap_extend: 1,
      penalty_gap_enter_cds: 5,
      ..ctx.params
    };

    let actual = get_gap_open_close_scores_codon_aware(&ctx.ref_seq, &gene_map, &params);

    assert_eq!(expect, actual.extend_deletion);
    Ok(())
  }

  #[rstest]
  fn test_gap_score_extend_deletion_flat(ctx: Context) {
    let params = AlignPairwiseParams {
      penalty_gap_extend: 1,
      penalty_gap_enter_cds: 5,
      ..ctx.params
    };

    let actual = get_gap_open_close_scores_flat(&ctx.ref_seq, &params);

    assert_eq!(vec![1; 27], actual.extend_deletion);
  }
}
