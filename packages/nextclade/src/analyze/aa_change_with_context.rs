use crate::alphabet::aa::Aa;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_sub::is_aa_mutated_or_deleted;
use crate::coord::coord_map_cds_to_global::cds_codon_pos_to_ref_range;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition, PositionLike};
use crate::coord::range::NucRefGlobalRange;
use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::translate::complement::reverse_complement_in_place;
use crate::translate::translate_genes::CdsTranslation;
use itertools::Itertools;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangeWithContext {
  pub cds_name: String,
  pub pos: AaRefPosition,
  pub ref_aa: Aa,
  pub qry_aa: Aa,
  pub nuc_pos: NucRefGlobalPosition,

  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub ref_triplet: Vec<Nuc>,

  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub qry_triplet: Vec<Nuc>,
  pub nuc_ranges: Vec<NucRefGlobalRange>,
}

impl AaChangeWithContext {
  pub fn new(
    cds: &Cds,
    pos: AaRefPosition,
    qry_seq: &[Nuc],
    ref_seq: &[Nuc],
    ref_tr: &CdsTranslation,
    qry_tr: &CdsTranslation,
  ) -> Self {
    let ref_aa = ref_tr.seq[pos.as_usize()];
    let qry_aa = qry_tr.seq[pos.as_usize()];
    let nuc_ranges = cds_codon_pos_to_ref_range(cds, pos);

    let ref_triplet = nuc_ranges
      .iter()
      .flat_map(|(range, strand)| {
        let mut nucs = ref_seq[range.to_std()].to_vec();
        if strand == &GeneStrand::Reverse {
          reverse_complement_in_place(&mut nucs);
        }
        nucs
      })
      .collect_vec();

    let qry_triplet = nuc_ranges
      .iter()
      .flat_map(|(range, strand)| {
        let mut nucs = qry_seq[range.clamp_range(0, qry_seq.len()).to_std()].to_vec();
        if strand == &GeneStrand::Reverse {
          reverse_complement_in_place(&mut nucs);
        }
        nucs
      })
      .collect_vec();

    let nuc_ranges = nuc_ranges.into_iter().map(|(range, _)| range).collect_vec();

    Self {
      cds_name: cds.name.clone(),
      pos,
      ref_aa,
      qry_aa,
      nuc_pos: nuc_ranges[0].begin,
      nuc_ranges,
      ref_triplet,
      qry_triplet,
    }
  }

  #[inline]
  pub fn is_mutated_or_deleted(&self) -> bool {
    is_aa_mutated_or_deleted(self.ref_aa, self.qry_aa)
  }
}
