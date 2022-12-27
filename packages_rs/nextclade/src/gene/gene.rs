use crate::gene::cds::Cds;
use crate::io::gff3::{get_one_of_attributes_optional, GffCommonInfo, NAME_ATTRS_STR};
use crate::utils::range::Range;
use bio::io::gff::Record as GffRecord;
use eyre::Report;
use itertools::Itertools;
use log::warn;
use multimap::MultiMap;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

#[derive(Clone, Debug, Deserialize, Serialize, Eq, PartialEq, Hash, Ord, PartialOrd)]
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
  pub index: usize,
  pub id: String,
  pub gene_name: String,
  pub start: usize,
  pub end: usize,
  pub strand: GeneStrand,
  pub frame: i32,
  pub cdses: Vec<Cds>,
  pub exceptions: Vec<String>,
  pub attributes: MultiMap<String, String>,
  pub source_record: Option<String>,
  pub compat_is_cds: bool,
}

impl Gene {
  pub fn from_gff_record((index, record): &(usize, GffRecord)) -> Result<Self, Report> {
    let GffCommonInfo {
      id,
      name,
      start,
      end,
      strand,
      frame,
      exceptions,
      attributes,
      gff_record_str,
    } = GffCommonInfo::from_gff_record(record)?;

    let gene_name = name.unwrap_or_else(|| {
      warn!("Gene map: the GFF3 gene record #{index} does not contain name attribute (attempted the following attribute keys: {}). This is compliant with GFF3 spec, however makes it difficult to identify the gene later on. Affected record:\n{gff_record_str}", *NAME_ATTRS_STR);
      format!("Gene_({index})")
    });

    let id = get_one_of_attributes_optional(record, &["ID"]).unwrap_or_else(|| gene_name.clone());

    Ok(Self {
      index: *index,
      id,
      gene_name,
      start,
      end,
      strand,
      frame,
      cdses: vec![],
      exceptions,
      attributes,
      source_record: Some(gff_record_str),
      compat_is_cds: false,
    })
  }

  /// HACK: COMPATIBILITY: if there are no gene records, pretend that CDS records describe full genes
  pub fn from_cds(cds: &Cds) -> Result<Self, Report> {
    let index = 0;
    let id = cds.segments.iter().map(|seg| &seg.id).unique().join("+");
    let gene_name = cds.segments.iter().map(|seg| &seg.name).unique().join("+");
    let start = cds.segments.first().map(|seg| seg.start).unwrap_or_default();
    let end = cds.segments.last().map(|seg| seg.end).unwrap_or_default();
    let strand = cds
      .segments
      .first()
      .map_or(GeneStrand::Unknown, |seg| seg.strand.clone());
    let frame = cds.segments.first().map(|seg| seg.frame).unwrap_or_default();
    let exceptions = cds
      .segments
      .iter()
      .flat_map(|seg| &seg.exceptions)
      .cloned()
      .collect_vec();

    Ok(Self {
      index,
      id,
      gene_name,
      start,
      end,
      strand,
      frame,
      cdses: vec![cds.clone()],
      exceptions,
      attributes: MultiMap::new(),
      source_record: None,
      compat_is_cds: true,
    })
  }

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
