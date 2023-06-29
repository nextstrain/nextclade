use crate::align::params::AlignPairwiseParams;
use crate::alphabet::nuc::Nuc;
use crate::coord::range::NucRefGlobalRange;
use crate::gene::gene::GeneStrand;
use crate::gene::gene_map::GeneMap;
use either::Either;

pub type GapScoreMap = Vec<i32>;

pub fn get_gap_open_close_scores_flat(ref_seq: &[Nuc], params: &AlignPairwiseParams) -> GapScoreMap {
  let value = params.penalty_gap_open;
  let len = ref_seq.len() + 2;
  vec![value; len]
}

pub fn get_gap_open_close_scores_codon_aware(
  ref_seq: &[Nuc],
  gene_map: &GeneMap,
  params: &AlignPairwiseParams,
) -> GapScoreMap {
  let mut gap_open_close = get_gap_open_close_scores_flat(ref_seq, params);
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
        cds_pos += 1;
      }
    }
  }
  gap_open_close
}

#[cfg(test)]
mod tests {
  #![allow(clippy::field_reassign_with_default, clippy::needless_pass_by_value)]
  use super::*;
  use crate::coord::position::Position;
  use crate::coord::range::{NucRefGlobalRange, Range};
  use crate::gene::cds::Cds;
  use crate::gene::cds_segment::{CdsSegment, WrappingPart};
  use crate::gene::frame::Frame;
  use crate::gene::gene::GeneStrand::{Forward, Reverse};
  use crate::gene::gene::{Gene, GeneStrand};
  use crate::gene::phase::Phase;
  use eyre::Report;
  use itertools::Itertools;
  use maplit::hashmap;
  use pretty_assertions::assert_eq;
  use rstest::{fixture, rstest};
  use std::collections::BTreeMap;

  fn create_test_genome_annotation(cdses: &[&[(isize, isize, GeneStrand)]]) -> Result<GeneMap, Report> {
    let genes = cdses
      .iter()
      .enumerate()
      .map(|(cds_index, cds)| {
        let segments = cds
          .iter()
          .enumerate()
          .map(|(index, (begin, end, strand))| {
            let range_local = Range::from_isize(0, end - begin);
            let phase = Phase::from_begin(range_local.begin).unwrap();
            let frame = Frame::from_begin(Position::from(*begin)).unwrap();

            CdsSegment {
              index,
              id: index.to_string(),
              name: index.to_string(),
              range: NucRefGlobalRange::from_isize(*begin, *end),
              range_local,
              landmark: None,
              wrapping_part: WrappingPart::NonWrapping,
              strand: *strand,
              frame,
              phase,
              exceptions: vec![],
              attributes: hashmap! {},
              source_record: None,
              compat_is_gene: false,
              color: None,
            }
          })
          .collect_vec();

        Ok((
          cds_index.to_string(),
          Gene::from_cds(&Cds {
            id: cds_index.to_string(),
            name: cds_index.to_string(),
            product: cds_index.to_string(),
            segments,
            proteins: vec![],
            exceptions: vec![],
            attributes: hashmap! {},
            compat_is_gene: false,
            color: None,
          })?,
        ))
      })
      .collect::<Result<BTreeMap<String, Gene>, Report>>()?;

    let gene_map = GeneMap::from_genes(genes);

    gene_map.validate()?;

    Ok(gene_map)
  }

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

    assert_eq!(actual, expect);
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

    assert_eq!(actual, expect);
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

    assert_eq!(actual, expect);
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

    assert_eq!(actual, expect);
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

    assert_eq!(actual, expect);
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

    assert_eq!(actual, expect);
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

    assert_eq!(actual, expect);
    Ok(())
  }
}
