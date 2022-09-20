use crate::gene::gene::Gene;
use crate::io::letter::Letter;
use crate::io::nuc::Nuc;
use crate::translate::coord_map::CoordMap;
use crate::utils::range::Range;
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
pub fn find_codon_mask_range(nuc_rel_aln: &Range, query: &[Nuc], coord_map_ref: &CoordMap, gene: &Gene) -> Range {
  // extend the frame shifted region to a mask that includes leading and trailing gaps
  let mask_nuc_rel_aln = find_nuc_mask_range(query, nuc_rel_aln);
  // map that mask to reference coordinates within the gene
  let mask_nuc_rel_ref = coord_map_ref.feature_aln_to_feature_ref_range(gene, &mask_nuc_rel_aln);
  // determine corresponding reference codons
  let mut mask_codon_range = gene.nuc_to_codon_range(&mask_nuc_rel_ref);

  // Nuc mask can span beyond the gene. Prevent peptide mask overflow.
  mask_codon_range.end = mask_codon_range.end.min(gene.len_codon());
  mask_codon_range
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
  pub nuc_abs: Range,
  pub codon: Range,
  pub gaps_leading: FrameShiftContext,
  pub gaps_trailing: FrameShiftContext,
  pub codon_mask: Range,
}

pub fn frame_shift_transform(nuc_rel_aln: &Range, query: &[Nuc], coord_map_ref: &CoordMap, gene: &Gene) -> FrameShift {
  // Relative nuc range is in alignment coordinates. However, after insertions are stripped,
  // absolute positions may change - so in order to get absolute range, we need to convert range boundaries
  // from alignment coordinates (as in aligned reference sequence, with gaps) to reference coordinates
  // (as in the original reference coordinates, with gaps stripped).

  // convert frameshift in the nucleotide gene alignment to positions in the reference gene sequence
  let nuc_rel_ref = coord_map_ref.feature_aln_to_feature_ref_range(gene, nuc_rel_aln);
  // calculate the codon range of the frame shift in gene reference coordinates
  let codon = gene.nuc_to_codon_range(&nuc_rel_ref);
  // determine the range of the frame shift in the reference nucleotide sequence
  let nuc_abs_ref = coord_map_ref.feature_aln_to_ref_range(gene, nuc_rel_aln);
  // determine reference codons mapping to frame shifted region including trailing/leading gaps
  let codon_mask = find_codon_mask_range(nuc_rel_aln, query, coord_map_ref, gene);

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

  FrameShift {
    gene_name: gene.gene_name.clone(),
    nuc_rel: nuc_rel_aln.clone(),
    nuc_abs: nuc_abs_ref,
    codon,
    gaps_leading,
    gaps_trailing,
    codon_mask,
  }
}

/// Converts relative nucleotide frame shifts to the final result, including
/// relative and absolute nucleotide frame shifts and relative aminoacid frame shifts
pub fn frame_shifts_transform_coordinates(
  nuc_rel_frame_shifts: &[Range],
  query: &[Nuc],
  coord_map_ref: &CoordMap,
  gene: &Gene,
) -> Vec<FrameShift> {
  nuc_rel_frame_shifts
    .iter()
    .map(|fs_nuc_rel_aln| frame_shift_transform(fs_nuc_rel_aln, query, coord_map_ref, gene))
    .collect_vec()
}
