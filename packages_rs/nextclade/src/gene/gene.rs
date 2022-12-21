use crate::gene::cds::Cds;
use crate::utils::range::Range;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
pub enum GeneStrand {
  #[serde(rename = "+")]
  Forward,
  #[serde(rename = "-")]
  Reverse,
  #[serde(rename = ".")]
  Unknown,
}

impl Display for GeneStrand {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    self.serialize(f)
  }
}

impl From<bio_types::strand::Strand> for GeneStrand {
  fn from(s: bio_types::strand::Strand) -> Self {
    match s {
      bio_types::strand::Strand::Forward => Self::Forward,
      bio_types::strand::Strand::Reverse => Self::Reverse,
      bio_types::strand::Strand::Unknown => Self::Unknown,
    }
  }
}

#[derive(Clone, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Gene {
  pub gene_name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub cdses: Vec<Cds>,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub compat_is_cds: bool,
}

impl Gene {
  #[inline]
  pub const fn len(&self) -> usize {
    self.end - self.start
  }

  #[inline]
  pub const fn len_codon(&self) -> usize {
    (self.len() - self.len() % 3) / 3
  }

  #[inline]
  pub const fn is_empty(&self) -> bool {
    self.len() == 0
  }

  /// Converts relative nucleotide position inside gene (relative to gene start) to absolute position in the
  /// reference nucleotide sequence
  #[inline]
  pub fn nuc_rel_to_abs(&self, nuc_ref_rel: usize) -> usize {
    debug_assert!(
      nuc_ref_rel < self.len(),
      "Position should be within the gene:\nnuc_ref_rel={nuc_ref_rel:},\ngene.len()={self:#?}"
    );

    if self.strand == GeneStrand::Reverse {
      self.end - nuc_ref_rel
    } else {
      self.start + nuc_ref_rel
    }
  }

  /// Converts codon index into absolute position in the reference nucleotide sequence
  #[inline]
  pub const fn codon_to_nuc_position(&self, codon: usize) -> usize {
    codon * 3
  }

  /// Converts a range of codon indices into a range of nucleotides within the gene
  #[inline]
  pub const fn codon_to_nuc_range(&self, codon_range: &Range) -> Range {
    let &Range { begin, end } = codon_range;
    Range {
      begin: self.codon_to_nuc_position(begin),
      end: self.codon_to_nuc_position(end),
    }
  }

  /// Converts nucleotide position to codon index
  #[inline]
  pub const fn nuc_to_codon_position(&self, nuc_rel_ref: usize) -> usize {
    // Make sure the nucleotide position is adjusted to codon boundary before the division
    // TODO: ensure that adjustment direction is correct for reverse strands
    let nuc_rel_ref_adj = nuc_rel_ref + (3 - nuc_rel_ref % 3) % 3;

    nuc_rel_ref_adj / 3
  }

  /// Converts a nucleotide range within the gene to a range of codon indices
  #[inline]
  pub const fn nuc_to_codon_range(&self, nuc_rel_ref: &Range) -> Range {
    let &Range { begin, end } = nuc_rel_ref;
    Range {
      begin: self.nuc_to_codon_position(begin),
      end: self.nuc_to_codon_position(end),
    }
  }
}
