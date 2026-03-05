use crate::alphabet::aa::Aa;
use crate::alphabet::letter::{serde_deserialize_seq, serde_serialize_seq};
use crate::alphabet::nuc::Nuc;
use crate::analyze::aa_sub_min::AaSubMin;
use crate::analyze::abstract_mutation::{AbstractMutation, CloneableMutation, MutParams, Pos, QryLetter, RefLetter};
use crate::analyze::nuc_alignment::NucAlignmentAbstract;
use crate::coord::coord_map_cds_to_global::cds_codon_pos_to_ref_range;
use crate::coord::position::{AaRefPosition, NucRefGlobalPosition};
use crate::coord::range::NucRefGlobalRange;
use crate::gene::cds::Cds;
use crate::gene::gene::GeneStrand;
use crate::translate::complement::reverse_complement_in_place;
use itertools::Itertools;
use serde::{Deserialize, Serialize};

/// Amino acid change with nucleotide-level context, including the reference and query codon triplets and their genomic coordinates.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangeWithContext {
  /// Name of the coding sequence containing this change
  pub cds_name: String,
  /// 0-based codon position within the CDS
  pub pos: AaRefPosition,
  /// Amino acid in the reference at this position
  pub ref_aa: Aa,
  /// Amino acid in the query at this position
  pub qry_aa: Aa,
  /// 0-based nucleotide position of the first base of this codon in reference coordinates
  pub nuc_pos: NucRefGlobalPosition,

  /// Reference codon nucleotides (typically 3 bases, more for split codons)
  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub ref_triplet: Vec<Nuc>,

  /// Query codon nucleotides at the same positions
  #[schemars(with = "String")]
  #[serde(serialize_with = "serde_serialize_seq")]
  #[serde(deserialize_with = "serde_deserialize_seq")]
  pub qry_triplet: Vec<Nuc>,
  /// Genomic coordinate ranges of the codon bases (multiple ranges for split codons in segmented CDS)
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

impl AbstractMutation<AaRefPosition, Aa> for AaChangeWithContext {}

impl CloneableMutation<AaRefPosition, Aa> for AaChangeWithContext {
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
  pub fn new(cds: &Cds, sub: &AaSubMin, aln: &impl NucAlignmentAbstract) -> Self {
    let AaSubMin { pos, ref_aa, qry_aa } = *sub;
    let nuc_ranges = cds_codon_pos_to_ref_range(cds, pos);

    let ref_triplet = nuc_ranges
      .iter()
      .flat_map(|(range, strand)| {
        let mut nucs = aln.ref_range(range).into_iter().collect_vec();
        if strand == &GeneStrand::Reverse {
          reverse_complement_in_place(&mut nucs);
        }
        nucs
      })
      .collect_vec();

    let qry_triplet = nuc_ranges
      .iter()
      .flat_map(|(range, strand)| {
        let mut nucs = aln.qry_range(range).into_iter().collect_vec();
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
