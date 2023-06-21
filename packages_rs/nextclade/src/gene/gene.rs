use crate::features::feature_group::FeatureGroup;
use crate::gene::cds::Cds;
use crate::io::container::take_exactly_one;
use crate::utils::range::NucRefGlobalRange;
use eyre::{eyre, Report, WrapErr};
use itertools::Itertools;
use maplit::hashmap;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fmt::{Display, Formatter};

#[derive(Clone, Copy, Debug, Deserialize, Serialize, Eq, PartialEq, Hash, Ord, PartialOrd, JsonSchema)]
pub enum GeneStrand {
  #[serde(rename = "+")]
  Forward,
  #[serde(rename = "-")]
  Reverse,
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
  pub frame: i32,
  pub cdses: Vec<Cds>,
  pub exceptions: Vec<String>,
  pub attributes: HashMap<String, Vec<String>>,
  pub source_record: Option<String>,
  pub compat_is_cds: bool,
  pub color: Option<String>,
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

    Ok(Self {
      index: feature.index,
      id: feature.id.clone(),
      name: feature.name.clone(),
      range: feature.range.clone(),
      frame: feature.frame,
      cdses,
      exceptions: feature.exceptions.clone(),
      attributes: feature.attributes.clone(),
      source_record: feature.source_record.clone(),
      compat_is_cds: false,
      color: None,
    })
  }

  /// HACK: COMPATIBILITY: if there are no gene records, pretend that CDS records describe full genes
  pub fn from_cds(cds: &Cds) -> Result<Self, Report> {
    let index = 0;
    let id = cds.segments.iter().map(|seg| &seg.id).unique().join("+");
    let name = cds.segments.iter().map(|seg| &seg.name).unique().join("+");
    let start = cds.segments.first().map(|seg| seg.range.begin).unwrap_or_default();
    let end = cds.segments.last().map(|seg| seg.range.end).unwrap_or_default();
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
      name,
      range: NucRefGlobalRange::new(start, end),
      frame,
      cdses: vec![cds.clone()],
      exceptions,
      attributes: hashmap!(),
      source_record: None,
      compat_is_cds: true,
      color: None,
    })
  }

  #[inline]
  pub fn len(&self) -> usize {
    self.cdses.iter().map(Cds::len).sum()
  }

  #[inline]
  pub fn is_empty(&self) -> bool {
    self.len() == 0
  }

  #[inline]
  pub fn len_codon(&self) -> usize {
    (self.len() - self.len() % 3) / 3
  }

  pub fn name_and_type(&self) -> String {
    format!("Gene '{}'", self.name)
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
