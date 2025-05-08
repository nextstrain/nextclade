use crate::coord::position::NucRefGlobalPosition;
use crate::coord::range::NucRefGlobalRange;
use crate::features::feature_group::FeatureGroup;
use crate::gene::cds::Cds;
use crate::utils::collections::take_exactly_one;
use crate::utils::iter::{single_unique_value, try_single_unique_value};
use eyre::{eyre, Report, WrapErr};
use indexmap::{indexmap, IndexMap};
use itertools::Itertools;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::fmt::{Display, Formatter};

#[must_use]
#[derive(Clone, Copy, Debug, Deserialize, Serialize, Eq, PartialEq, Hash, Ord, PartialOrd, JsonSchema)]
pub enum GeneStrand {
  #[serde(rename = "+")]
  Forward,
  #[serde(rename = "-")]
  Reverse,
}

impl GeneStrand {
  pub const fn inverted(self) -> Self {
    match self {
      Self::Forward => Self::Reverse,
      Self::Reverse => Self::Forward,
    }
  }
}

impl Default for GeneStrand {
  fn default() -> Self {
    Self::Forward
  }
}

impl Display for GeneStrand {
  fn fmt(&self, f: &mut Formatter<'_>) -> std::fmt::Result {
    self.serialize(f)
  }
}

impl From<bio_types::strand::Strand> for GeneStrand {
  fn from(s: bio_types::strand::Strand) -> Self {
    match s {
      // NOTE: assume 'forward' strand by default because 'unknown' does not make sense in this application
      bio_types::strand::Strand::Forward | bio_types::strand::Strand::Unknown => Self::Forward,
      bio_types::strand::Strand::Reverse => Self::Reverse,
    }
  }
}

#[derive(Clone, Debug, Deserialize, Serialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct Gene {
  pub index: usize,
  pub id: String,
  pub name: String,
  pub range: NucRefGlobalRange,
  pub cdses: Vec<Cds>,
  pub exceptions: Vec<String>,
  pub attributes: IndexMap<String, Vec<String>>,
  #[serde(skip)]
  pub source_record: Option<String>,
  pub compat_is_cds: bool,
  pub color: Option<String>,
  pub gff_seqid: Option<String>,
  pub gff_source: Option<String>,
  pub gff_feature_type: Option<String>,
}

impl Gene {
  pub fn from_feature_group(feature_group: &FeatureGroup) -> Result<Self, Report> {
    assert_eq!(feature_group.feature_type, "gene");

    let feature = take_exactly_one(&feature_group.features).wrap_err_with(|| {
      eyre!(
        "When processing feature group '{}' ('{}') of type '{}': genes must consist of exactly one feature",
        feature_group.name,
        feature_group.id,
        feature_group.feature_type
      )
    })?;

    let mut cdses = find_cdses(&feature_group.children)?;

    // HACK: COMPAT: If there are no CDSes in this gene, then pretend the whole gene is a CDS
    if cdses.is_empty() {
      cdses.push(Cds::from_gene(feature)?);
    }

    // Try to take gene's range from the source file directly
    let mut range = feature_group.range();
    if range.is_empty() {
      // If gene range is empty in the source (it is often unset, and out parser defaults to an empty range),
      // then calculate range based on max extent of child CDSes.
      let start = cdses.iter().map(Cds::start).min().unwrap_or_default();
      let end = cdses.iter().map(Cds::end).max().unwrap_or_default();
      range = NucRefGlobalRange::new(start, end);
    }

    Ok(Self {
      index: feature.index,
      id: feature.id.clone(),
      name: feature.name.clone(),
      range,
      cdses,
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
      source_record: feature.source_record.clone(),
      compat_is_cds: false,
      color: None,
      gff_seqid: feature.gff_seqid.clone(),
      gff_source: feature.gff_source.clone(),
      gff_feature_type: feature.gff_feature_type.clone(),
    })
  }

  /// HACK: COMPATIBILITY: if there are no gene records, pretend that CDS records describe full genes
  pub fn from_cds(cds: &Cds) -> Result<Self, Report> {
    let index = 0;
    let id = cds.segments.iter().map(|seg| &seg.id).unique().join("+");
    let name = cds.segments.iter().map(|seg| &seg.name).unique().join("+");
    let exceptions = cds
      .segments
      .iter()
      .flat_map(|seg| &seg.exceptions)
      .unique()
      .cloned()
      .collect_vec();

    let gff_seqid = single_unique_value(&cds.segments, |s| &s.gff_seqid)?.clone();
    let gff_source = single_unique_value(&cds.segments, |s| &s.gff_source)?.clone();
    let gff_feature_type = single_unique_value(&cds.segments, |s| &s.gff_feature_type)?.clone();

    Ok(Self {
      index,
      id,
      name,
      range: cds.range(),
      cdses: vec![cds.clone()],
      exceptions,
      attributes: indexmap!(),
      source_record: None,
      compat_is_cds: true,
      color: None,
      gff_seqid,
      gff_source,
      gff_feature_type,
    })
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
    self.range.is_empty()
  }

  #[inline]
  pub fn len_codon(&self) -> usize {
    (self.len() - self.len() % 3) / 3
  }

  pub fn name_and_type(&self) -> String {
    format!("Gene '{}'", self.name)
  }

  pub fn strand(&self) -> Result<GeneStrand, Report> {
    if self.cdses.is_empty() {
      return Ok(GeneStrand::Forward);
    }
    try_single_unique_value(&self.cdses, Cds::strand)
  }
}

pub fn find_cdses(feature_groups: &[FeatureGroup]) -> Result<Vec<Cds>, Report> {
  let mut cdses = vec![];
  feature_groups
    .iter()
    .try_for_each(|child_feature_group| find_cdses_recursive(child_feature_group, &mut cdses))?;
  Ok(cdses)
}

fn find_cdses_recursive(feature_group: &FeatureGroup, cdses: &mut Vec<Cds>) -> Result<(), Report> {
  if feature_group.feature_type == "CDS" {
    let cds = Cds::from_feature_group(feature_group)
      .wrap_err_with(|| eyre!("When processing CDS, '{}'", feature_group.name))?;
    cdses.push(cds);
  }

  feature_group
    .children
    .iter()
    .try_for_each(|child_feature_group| find_cdses_recursive(child_feature_group, cdses))
}
