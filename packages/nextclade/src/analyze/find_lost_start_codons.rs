use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::{Nuc, from_nuc_seq};
use crate::analyze::nuc_alignment::{CodonNucs, NucAlignmentAbstract};
use crate::coord::coord_map_cds_to_global::cds_nuc_pos_to_ref;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition, NucRefLocalPosition};
use crate::coord::range::NucRefGlobalRange;
use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::gene::gene_map::GeneMap;
use crate::translate::extract::extract_cds_from_ref;
use crate::translate::translate::decode;
use crate::types::outputs::PeptideWarning;
use std::collections::{BTreeSet, HashSet};

const START_CODON: [Nuc; 3] = [Nuc::A, Nuc::T, Nuc::G];

/// Find names of CDSs that begin with the start codon `ATG` in the reference.
///
/// A CDS that continues the reading frame of another CDS has no start codon of its own, also when its first codon is
/// `ATG`: translation runs into it from the other CDS. This is the case for mature peptides of a polyprotein that the
/// genome annotation lists as separate CDSs, for example HIV-1 `p7` after `p2`, or dengue `E` after `M`. A CDS continues
/// the reading frame of another CDS when the other CDS is on the same strand, ends at the base before the first base of
/// the CDS in the reading direction, and does not end with a stop codon. Adjacent genes with a stop codon between them
/// (as in poxviruses) and alternative start codons inside of a longer CDS each keep their start codon.
pub fn find_cdses_with_start_codon(gene_map: &GeneMap, ref_seq: &[Nuc]) -> BTreeSet<String> {
  let reading_frame_continuations = gene_map
    .iter_cdses()
    .filter_map(|cds| base_after_open_reading_frame_end(cds, ref_seq))
    .collect::<HashSet<_>>();

  gene_map
    .iter_cdses()
    .filter(|cds| {
      extract_cds_from_ref(ref_seq, cds).starts_with(&START_CODON)
        && first_base(cds).is_some_and(|base| !reading_frame_continuations.contains(&base))
    })
    .map(|cds| cds.name.clone())
    .collect()
}

/// Find CDSs whose reference starts with a start codon while the query has a different first codon.
///
/// Only CDSs in `cdses_with_start_codon` (see `find_cdses_with_start_codon()`) are checked. The query codon must be fully
/// sequenced and consist of `A`, `C`, `G`, `T` or gaps. Missing data (`N`, ambiguous nucleotides, or bases outside of
/// the alignment range) gives no result, because it does not show whether the start codon is present.
pub fn find_lost_start_codons(
  cdses: &[&Cds],
  cdses_with_start_codon: &BTreeSet<String>,
  aln: &impl NucAlignmentAbstract,
) -> Vec<LostStartCodon> {
  cdses
    .iter()
    .filter(|cds| cdses_with_start_codon.contains(&cds.name))
    .filter_map(|cds| find_lost_start_codon(cds, aln))
    .collect()
}

/// Start codon of the reference that the query does not have
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct LostStartCodon {
  pub cds_name: String,

  /// First codon of the CDS in the reference, in the reading direction
  pub ref_codon: Vec<Nuc>,

  /// Query bases at the same positions, in the reading direction
  pub qry_codon: Vec<Nuc>,
}

impl LostStartCodon {
  pub fn to_warning(&self) -> PeptideWarning {
    let Self {
      cds_name,
      ref_codon,
      qry_codon,
    } = self;
    let ref_codon_str = from_nuc_seq(ref_codon);
    let qry_codon_str = from_nuc_seq(qry_codon);

    let mut warning = format!(
      "In CDS '{cds_name}': The start codon is lost: the first codon is '{ref_codon_str}' in the reference and '{qry_codon_str}' in the query."
    );
    if qry_codon.iter().any(Letter::is_gap) {
      warning += " A deletion removes all or part of the start codon. If the deletion has an equally good placement outside of the CDS, the alignment parameter 'penaltyGapEnterCds' moves it there.";
    }

    PeptideWarning {
      cds_name: cds_name.clone(),
      warning,
    }
  }
}

/// Base after the end of a CDS in the reading direction, with its strand, if translation continues past the end of the
/// CDS in the same reading frame
fn base_after_open_reading_frame_end(cds: &Cds, ref_seq: &[Nuc]) -> Option<(GeneStrand, NucRefGlobalPosition)> {
  let segment = cds.segments.last()?;
  let nucs = extract_cds_from_ref(ref_seq, cds);
  let len = nucs.len();
  if len < 3 || decode(&nucs[len - 3..]).is_stop() {
    return None;
  }

  let last = cds_nuc_pos_to_ref(cds, NucRefLocalPosition::from(len - 1));
  let next = match segment.strand {
    GeneStrand::Forward => last + 1,
    GeneStrand::Reverse => last - 1,
  };
  Some((segment.strand, next))
}

/// First base of a CDS in the reading direction, with its strand
fn first_base(cds: &Cds) -> Option<(GeneStrand, NucRefGlobalPosition)> {
  let segment = cds.segments.first()?;
  Some((segment.strand, cds_nuc_pos_to_ref(cds, NucRefLocalPosition::from(0))))
}

fn find_lost_start_codon(cds: &Cds, aln: &impl NucAlignmentAbstract) -> Option<LostStartCodon> {
  let CodonNucs {
    ref_triplet,
    qry_triplet,
    nuc_ranges,
  } = aln.codon(cds, AaRefPosition::from(0));

  let is_sequenced = nuc_ranges
    .iter()
    .flat_map(NucRefGlobalRange::iter)
    .all(|pos| aln.is_sequenced(pos));
  let is_known = qry_triplet.iter().all(|nuc| nuc.is_acgt() || nuc.is_gap());

  (is_sequenced && is_known && qry_triplet != ref_triplet).then(|| LostStartCodon {
    cds_name: cds.name.clone(),
    ref_codon: ref_triplet,
    qry_codon: qry_triplet,
  })
}
