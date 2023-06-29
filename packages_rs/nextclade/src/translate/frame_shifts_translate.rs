use crate::coord::coord_map_cds_to_global::cds_range_to_ref_ranges;
use crate::coord::coord_map_local::CoordMapLocal;
use crate::coord::position::{NucAlnLocalPosition, PositionLike};
use crate::coord::range::{AaRefRange, NucAlnLocalRange, NucRefGlobalRange, Range};
use crate::gene::cds::Cds;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use eyre::Report;
use itertools::Itertools;
use serde::{Deserialize, Serialize};

/// Find beginning nucleotide position of a deletion that immediately proceeds and adjacent to the frame shift
pub fn find_mask_begin(seq: &[Nuc], frame_shift_nuc_range_rel: &NucAlnLocalRange) -> NucAlnLocalPosition {
  // From begin, rewind to find the first adjacent nuc deletion
  let mut begin = frame_shift_nuc_range_rel.begin - 1;
  if begin > 0 {
    while seq[begin.as_usize()].is_gap() {
      begin -= 1;
    }
  }

  // `begin` now points to the nuc that is immediately before the deletion.
  // Go back one nuc to make it point to the deletion.
  begin + 1
}

/// Find ending nucleotide position of a deletion that immediately follows and adjacent to the frame shift
pub fn find_mask_end(seq: &[Nuc], frame_shift_nuc_range_rel: &NucAlnLocalRange) -> NucAlnLocalPosition {
  // From end, rewind backwards to find the last adjacent nuc deletion
  let mut end = frame_shift_nuc_range_rel.end;
  while end < seq.len() as isize && seq[end.as_usize()].is_gap() {
    end += 1;
  }

  // `end` now points to the nuc that is 1 past the deletion. Which is correct - we use semi-open ranges.
  end
}

/// Finds nucleotide range to be masked. The nucleotides belonging to frame shift need to be masked, because the
/// alignment in this region is likely to be very uncertain.
pub fn find_nuc_mask_range(query: &[Nuc], frame_shift_nuc_range_rel: &NucAlnLocalRange) -> NucAlnLocalRange {
  NucAlnLocalRange::new(
    find_mask_begin(query, frame_shift_nuc_range_rel),
    find_mask_end(query, frame_shift_nuc_range_rel),
  )
}

/// Finds codon range to be masked. The aminoacids belonging to frame shift need to be masked, because they are not
/// biological and can produce a lot of noisy mutations that don't exist.
pub fn find_codon_mask_range(
  nuc_rel_aln: &NucAlnLocalRange,
  query: &[Nuc],
  coord_map_local: &CoordMapLocal,
) -> AaRefRange {
  // extend the frame shifted region to a mask that includes leading and trailing gaps
  let mask_nuc_rel_aln = find_nuc_mask_range(query, nuc_rel_aln);
  coord_map_local.local_to_codon_ref_range(&mask_nuc_rel_aln)
}

#[derive(Clone, Debug, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct FrameShift {
  pub gene_name: String,
  pub nuc_rel: NucAlnLocalRange,
  pub nuc_abs: Vec<NucRefGlobalRange>,
  pub codon: AaRefRange,
  pub gaps_leading: AaRefRange,
  pub gaps_trailing: AaRefRange,
}

pub fn frame_shift_transform(
  nuc_aln_local: &NucAlnLocalRange,
  query: &[Nuc],
  coord_map_local: &CoordMapLocal,
  cds: &Cds,
) -> Result<FrameShift, Report> {
  let codon = coord_map_local.local_to_codon_ref_range(nuc_aln_local);

  // determine the range(s) of the frame shift in the reference nucleotide sequence
  let nuc_ref_global = cds_range_to_ref_ranges(cds, &coord_map_local.aln_to_ref_range(nuc_aln_local))
    .into_iter()
    .map(|(range, _)| range)
    .collect_vec();

  // determine reference codons mapping to frame shifted region including trailing/leading gaps
  let codon_mask = find_codon_mask_range(nuc_aln_local, query, coord_map_local);

  // Leading and trailing gaps will be masked in the aligned, stripped peptide
  let gaps_leading = Range::new(codon_mask.begin, codon.begin);
  let gaps_trailing = Range::new(codon.end, codon_mask.end);

  Ok(FrameShift {
    gene_name: cds.name.clone(),
    nuc_abs: nuc_ref_global,
    codon,
    nuc_rel: nuc_aln_local.clone(),
    gaps_leading,
    gaps_trailing,
  })
}

/// Converts relative nucleotide frame shifts to the final result, including
/// relative and absolute nucleotide frame shifts and relative aminoacid frame shifts
pub fn frame_shifts_transform_coordinates(
  nuc_rel_frame_shifts: &[NucAlnLocalRange],
  query: &[Nuc],
  coord_map_local: &CoordMapLocal,
  cds: &Cds,
) -> Result<Vec<FrameShift>, Report> {
  nuc_rel_frame_shifts
    .iter()
    .map(|fs_nuc_rel_aln| frame_shift_transform(fs_nuc_rel_aln, query, coord_map_local, cds))
    .collect()
}
