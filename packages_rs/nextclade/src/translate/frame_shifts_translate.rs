use crate::gene::cds::Cds;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::translate::coord_map::{CdsRange, CoordMap, CoordMapForCds, CoordMapLocal};
use crate::utils::range::Range;
use eyre::Report;
use itertools::Itertools;
use serde::{Deserialize, Serialize};

/// Find beginning nucleotide position of a deletion that immediately proceeds and adjacent to the frame shift
pub fn find_mask_begin(seq: &[Nuc], frame_shift_nuc_range_rel: &Range) -> usize {
  // From begin, rewind to find the first adjacent nuc deletion
  let mut begin = frame_shift_nuc_range_rel.begin - 1;
  if begin > 0 {
    while seq[begin].is_gap() {
      begin -= 1;
    }
  }

  // `begin` now points to the nuc that is immediately before the deletion.
  // Go back one nuc to make it point to the deletion.
  begin + 1
}

/// Find ending nucleotide position of a deletion that immediately follows and adjacent to the frame shift
pub fn find_mask_end(seq: &[Nuc], frame_shift_nuc_range_rel: &Range) -> usize {
  // From end, rewind backwards to find the last adjacent nuc deletion
  let mut end = frame_shift_nuc_range_rel.end;
  while end < seq.len() && seq[end].is_gap() {
    end += 1;
  }

  // `end` now points to the nuc that is 1 past the deletion. Which is correct - we use semi-open ranges.
  end
}

/// Finds nucleotide range to be masked. The nucleotides belonging to frame shift need to be masked, because the
/// alignment in this region is likely to be very uncertain.
pub fn find_nuc_mask_range(query: &[Nuc], frame_shift_nuc_range_rel: &Range) -> Range {
  Range {
    begin: find_mask_begin(query, frame_shift_nuc_range_rel),
    end: find_mask_end(query, frame_shift_nuc_range_rel),
  }
}

/// Finds codon range to be masked. The aminoacids belonging to frame shift need to be masked, because they are not
/// biological and can produce a lot of noisy mutations that don't exist.
pub fn find_codon_mask_range(nuc_rel_aln: &Range, query: &[Nuc], coord_map_local: &CoordMapLocal) -> Range {
  // extend the frame shifted region to a mask that includes leading and trailing gaps
  let mask_nuc_rel_aln = find_nuc_mask_range(query, nuc_rel_aln);
  coord_map_local.local_aln_to_codon_range(&mask_nuc_rel_aln)
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameShiftContext {
  pub codon: Range,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FrameShift {
  pub gene_name: String,
  pub nuc_rel: Range,
  pub nuc_abs: Vec<Range>,
  pub codon: Range,
  pub gaps_leading: FrameShiftContext,
  pub gaps_trailing: FrameShiftContext,
  pub codon_mask: Range,
}

pub fn frame_shift_transform(
  nuc_rel_aln: &Range,
  query: &[Nuc],
  coord_map: &CoordMap,
  qry_cds_map: &CoordMapForCds,
  coord_map_local: &CoordMapLocal,
  cds: &Cds,
) -> Result<FrameShift, Report> {
  let codon = coord_map_local.local_aln_to_codon_range(nuc_rel_aln);

  // determine the range(s) of the frame shift in the reference nucleotide sequence
  let nuc_abs_ref = qry_cds_map
    .cds_to_global_ref_range(nuc_rel_aln, &coord_map)
    .into_iter()
    .filter_map(|cds_range| match cds_range {
      CdsRange::Covered(range) => Some(range),
      _ => None,
    })
    .collect_vec();

  // determine reference codons mapping to frame shifted region including trailing/leading gaps
  let codon_mask = find_codon_mask_range(nuc_rel_aln, query, coord_map_local);

  let gaps_leading = FrameShiftContext {
    codon: Range {
      begin: codon_mask.begin,
      end: codon.begin,
    },
  };

  let gaps_trailing = FrameShiftContext {
    codon: Range {
      begin: codon.end,
      end: codon_mask.end,
    },
  };

  Ok(FrameShift {
    gene_name: cds.name.clone(),
    nuc_rel: nuc_rel_aln.clone(),
    nuc_abs: nuc_abs_ref,
    codon,
    gaps_leading,
    gaps_trailing,
    codon_mask,
  })
}

/// Converts relative nucleotide frame shifts to the final result, including
/// relative and absolute nucleotide frame shifts and relative aminoacid frame shifts
pub fn frame_shifts_transform_coordinates(
  nuc_rel_frame_shifts: &[Range],
  query: &[Nuc],
  coord_map: &CoordMap,
  qry_cds_map: &CoordMapForCds,
  coord_map_local: &CoordMapLocal,
  cds: &Cds,
) -> Result<Vec<FrameShift>, Report> {
  nuc_rel_frame_shifts
    .iter()
    .map(|fs_nuc_rel_aln| frame_shift_transform(fs_nuc_rel_aln, query, coord_map, qry_cds_map, coord_map_local, cds))
    .collect()
}
