use crate::utils::range::Range;
use num::integer::{div_ceil, div_floor};
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq)]
pub enum GeneStrand {
  #[serde(rename = "+")]
  Forward,
  #[serde(rename = "-")]
  Reverse,
  #[serde(rename = ".")]
  Unknown,
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

  /// Converts a range of codon indices into a range of nucleotides within the gene
  #[inline]
  pub const fn codon_to_nuc_range(&self, codon_range: &Range) -> Range {
    let &Range { begin, end } = codon_range;
    Range {
      begin: begin * 3,
      end: end * 3,
    }
  }

  /// Converts a nucleotide range within the gene to a range of codon indices.
  /// This conversion is "eager", in that the output range will include partially covered codons.
  #[inline]
  pub fn nuc_to_codon_range(&self, nuc_rel_ref: &Range) -> Range {
    let &Range { begin, end } = nuc_rel_ref;
    Range {
      begin: div_floor(begin, 3),
      end: div_ceil(end, 3),
    }
  }
}
