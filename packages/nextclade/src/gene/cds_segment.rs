use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::{NucRefGlobalRange, NucRefLocalRange};
use crate::features::feature::Landmark;
use crate::gene::frame::Frame;
use crate::gene::gene::GeneStrand;
use crate::gene::phase::Phase;
use indexmap::IndexMap;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

/// Marks the position of a CDS segment within a circular genome wraparound.
///
/// When a CDS crosses the origin of a circular genome, it is split into linear parts:
///   WrappingStart      : |....<-----|
///   WrappingCentral(1) : |----------|
///   WrappingCentral(2) : |----------|
///   WrappingEnd(3)     : |---->     |
#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "kebab-case")]
pub enum WrappingPart {
  /// Segment does not cross the circular genome origin.
  NonWrapping,
  /// First part of a wrapping segment, before the origin crossing.
  WrappingStart,
  /// Intermediate part after wrapping, with its 1-based index within the wrapping group.
  WrappingCentral(usize),
  /// Last part of a wrapping segment, with its 1-based index within the wrapping group.
  WrappingEnd(usize),
}

/// Whether a CDS segment is truncated (incomplete) and by how many nucleotides.
#[derive(Clone, Debug, Default, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub enum Truncation {
  /// No truncation, CDS segment is complete.
  #[default]
  None,
  /// Truncated at the 5' end by the given number of nucleotides.
  FivePrime(usize),
  /// Truncated at the 3' end by the given number of nucleotides.
  ThreePrime(usize),
  /// Truncated at both ends (5' truncation, 3' truncation).
  Both((usize, usize)),
}

/// One contiguous fragment of a coding sequence (CDS). A CDS with programmed ribosomal slippage,
/// splicing, or circular genome wraparound consists of multiple segments.
#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct CdsSegment {
  /// Ordinal index of this segment within the parent CDS.
  pub index: usize,
  /// Unique identifier from the GFF3 ID attribute.
  pub id: String,
  /// Display name from the GFF3 Name attribute.
  pub name: String,
  /// Nucleotide range on the reference sequence (global coordinates).
  pub range: NucRefGlobalRange,
  /// Nucleotide range within the concatenated CDS (local coordinates, 0-based).
  pub range_local: NucRefLocalRange,
  /// Circular genome landmark that this segment belongs to, if any.
  pub landmark: Option<Landmark>,
  /// Position of this segment within a circular genome wraparound.
  pub wrapping_part: WrappingPart,
  /// Strand direction (forward or reverse).
  pub strand: GeneStrand,
  /// Reading frame (0, 1, or 2) determined by the segment's global start position modulo 3.
  pub frame: Frame,
  /// GFF3 phase (0, 1, or 2): number of bases to skip before the first complete codon.
  pub phase: Phase,
  /// Whether this segment is truncated at the 5' or 3' end.
  pub truncation: Truncation,
  /// GFF3 exception qualifiers (e.g. ribosomal slippage, RNA editing).
  pub exceptions: Vec<String>,
  /// Additional GFF3 attributes as key-value pairs.
  pub attributes: IndexMap<String, Vec<String>>,
  #[serde(skip)]
  pub source_record: Option<String>,
  /// True when this segment was synthesized from a gene record that had no child CDS.
  pub compat_is_gene: bool,
  /// Display color for the genome annotation viewer.
  pub color: Option<String>,
  /// GFF3 seqid column value (reference sequence identifier).
  pub gff_seqid: Option<String>,
  /// GFF3 source column value (annotation provenance, e.g. "GenBank").
  pub gff_source: Option<String>,
  /// GFF3 type column value (feature type, e.g. "CDS").
  pub gff_feature_type: Option<String>,
}

impl CdsSegment {
  pub fn name_and_type(&self) -> String {
    format!("CDS segment '{}'", self.name)
  }

  pub const fn start(&self) -> NucRefGlobalPosition {
    self.range.begin
  }

  pub const fn end(&self) -> NucRefGlobalPosition {
    self.range.end
  }

  #[inline]
  pub fn len(&self) -> usize {
    self.range.len()
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }
}
