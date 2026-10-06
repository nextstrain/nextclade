use crate::alphabet::letter::Letter;
use crate::alphabet::nuc::{Nuc, from_nuc_seq};
use crate::analyze::nuc_alignment::{CodonNucs, NucAlignmentAbstract};
use crate::coord::position::AaRefPosition;
use crate::coord::range::NucRefGlobalRange;
use crate::gene::cds::Cds;
use crate::types::outputs::PeptideWarning;

const START_CODON: [Nuc; 3] = [Nuc::A, Nuc::T, Nuc::G];

/// Find CDSs whose reference starts with the start codon `ATG` while the query has a different first codon.
///
/// The query codon must be fully sequenced and consist of `A`, `C`, `G`, `T` or gaps. Missing data (`N`, ambiguous
/// nucleotides, or bases outside of the alignment range) gives no result, because it does not show whether the start
/// codon is present.
pub fn find_lost_start_codons(cdses: &[&Cds], aln: &impl NucAlignmentAbstract) -> Vec<LostStartCodon> {
  cdses.iter().filter_map(|cds| find_lost_start_codon(cds, aln)).collect()
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

fn find_lost_start_codon(cds: &Cds, aln: &impl NucAlignmentAbstract) -> Option<LostStartCodon> {
  let CodonNucs {
    ref_triplet,
    qry_triplet,
    nuc_ranges,
  } = aln.codon(cds, AaRefPosition::from(0));

  let is_start_codon_in_ref = ref_triplet == START_CODON;
  let is_sequenced = nuc_ranges
    .iter()
    .flat_map(NucRefGlobalRange::iter)
    .all(|pos| aln.is_sequenced(pos));
  let is_known = qry_triplet.iter().all(|nuc| nuc.is_acgt() || nuc.is_gap());

  (is_start_codon_in_ref && is_sequenced && is_known && qry_triplet != ref_triplet).then(|| LostStartCodon {
    cds_name: cds.name.clone(),
    ref_codon: ref_triplet,
    qry_codon: qry_triplet,
  })
}
