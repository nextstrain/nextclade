use crate::alphabet::aa::Aa;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_sub_min::AaSubMin;
use crate::analyze::abstract_mutation::{AbstractMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::coord::coord_map_cds_to_global::cds_codon_pos_to_ref_range;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition};
use crate::coord::range::NucRefGlobalRange;
use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::translate::complement::reverse_complement_in_place;
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

impl Pos<AaRefPosition> for AaChangeWithContext {
  fn pos(&self) -> AaRefPosition {
    self.pos
  }
}

impl QryLetter<Aa> for AaChangeWithContext {
  fn qry_letter(&self) -> Aa {
    self.qry_aa
  }
}

impl RefLetter<Aa> for AaChangeWithContext {
  fn ref_letter(&self) -> Aa {
    self.ref_aa
  }
}

impl AbstractMutation<AaRefPosition, Aa> for AaChangeWithContext {
  fn clone_with(&self, params: MutParams<AaRefPosition, Aa>) -> Self {
    Self {
      cds_name: self.cds_name.clone(),
      pos: params.pos,
      ref_aa: params.ref_letter,
      qry_aa: params.qry_letter,
      ..self.clone()
    }
  }
}

impl AaChangeWithContext {
  pub fn new(cds: &Cds, sub: &AaSubMin, qry_seq: &[Nuc], ref_seq: &[Nuc]) -> Self {
    let AaSubMin { pos, ref_aa, qry_aa } = *sub;
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
}
