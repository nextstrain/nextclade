use crate::coord::coord_map::local_to_codon_range_exclusive;
use crate::coord::position::PositionLike;
use crate::coord::range::{AaRefRange, NucRefGlobalRange, NucRefLocalRange, intersect};
use crate::gene::gene_map::GeneMap;
use crate::translate::translate_genes::Translation;
use eyre::Report;
use itertools::Itertools;
use maplit::btreemap;
use std::collections::BTreeMap;

pub fn calculate_aa_alignment_ranges_in_place(
  global_alignment_range: &NucRefGlobalRange,
  translation: &mut Translation,
  gene_map: &GeneMap,
) -> Result<(), Report> {
  // For each translated CDS
  translation.iter_cdses_mut().try_for_each(|(_, cds_tr)| {
    // Get CDS annotation
    let cds = gene_map.get_cds(&cds_tr.name)?;

    let mut aa_alignment_ranges = vec![];
    let mut prev_segment_end = 0;
    // For each segment
    for segment in &cds.segments {
      // Trim segment to include only what's inside alignment
      let included_range_global = intersect(global_alignment_range, &segment.range);
      if !included_range_global.is_empty() {
        // Convert to coordinates local to CDS (not local to segment!)
        let included_range_local = NucRefLocalRange::from_range(
          included_range_global - segment.range.begin.as_isize() + prev_segment_end as isize,
        );
        aa_alignment_ranges.push(local_to_codon_range_exclusive(&included_range_local));
      }
      // CDS consists of concatenated segments; remember by how far we went along the CDS so far
      prev_segment_end += segment.len();
    }

    // Record computed AA alignment ranges on CDS translation
    // TODO: avoid mutable code. Move calculation of AA alignment ranges to where translation is.
    //   This requires global_alignment_range to be available there, but it is only computed much later currently.
    cds_tr.unsequenced_ranges = calculate_aa_unsequenced_ranges(&aa_alignment_ranges, cds_tr.seq.len());
    cds_tr.alignment_ranges = aa_alignment_ranges;

    Ok::<(), Report>(())
  })?;

  Ok(())
}

/// Calculate a list of unsequenced AA ranges from a list of AA alignment ranges (which are the sequenced AA ranges)
fn calculate_aa_unsequenced_ranges(sequenced: &[AaRefRange], cds_tr_len: usize) -> Vec<AaRefRange> {
  let last_pos = cds_tr_len.into();
  let sorted_ranges = sequenced.iter().sorted_by_key(|x| x.begin);

  let mut prev_end = 0.into();
  let mut unsequenced = vec![];
  for range in sorted_ranges {
    if range.begin > prev_end {
      unsequenced.push(AaRefRange::new(prev_end, range.begin));
    }
    prev_end = range.end;
  }

  if last_pos > prev_end {
    unsequenced.push(AaRefRange::new(prev_end, last_pos));
  }

  unsequenced
}

pub struct GatherAaAlignmentRangesResult {
  pub aa_alignment_ranges: BTreeMap<String, Vec<AaRefRange>>,
  pub aa_unsequenced_ranges: BTreeMap<String, Vec<AaRefRange>>,
}

/// Collects aminoacid alignment ranges across all CDSes, including CDSes missing from translation.
pub fn gather_aa_alignment_ranges(translation: &Translation, gene_map: &GeneMap) -> GatherAaAlignmentRangesResult {
  let mut res = GatherAaAlignmentRangesResult {
    aa_alignment_ranges: btreemap! {},
    aa_unsequenced_ranges: btreemap! {},
  };

  for cds in gene_map.iter_cdses() {
    if let Ok(cds_tr) = translation.get_cds(&cds.name) {
      // CDS is present in the translation. Collect aligned and sequenced ranged from all CDS fragments.
      let alignment_ranges = cds_tr
        .alignment_ranges
        .iter()
        .filter_map(|alignment_range| (!alignment_range.is_empty()).then_some(alignment_range.clone()))
        .collect_vec();
      res.aa_alignment_ranges.insert(cds.name.clone(), alignment_ranges);

      let unsequenced_ranges = cds_tr
        .unsequenced_ranges
        .iter()
        .filter_map(|unsequenced_range| (!unsequenced_range.is_empty()).then_some(unsequenced_range.clone()))
        .collect_vec();

      res.aa_unsequenced_ranges.insert(cds.name.clone(), unsequenced_ranges);
    } else {
      // The entire CDS is missing from translation. Mark each CDS fragment as unsequenced.
      res.aa_alignment_ranges.insert(cds.name.clone(), vec![]);

      let aa_unsequenced_ranges = cds
        .segments
        .iter()
        .map(|cds_seg| local_to_codon_range_exclusive(&cds_seg.range_local))
        .collect_vec();

      res
        .aa_unsequenced_ranges
        .insert(cds.name.clone(), aa_unsequenced_ranges);
    }
  }

  res
}
