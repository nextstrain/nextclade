use crate::analyze::aa_change_with_context::AaChangeWithContext;
use crate::analyze::nuc_del::{NucDel, NucDelRange};
use crate::analyze::nuc_sub::NucSub;
use crate::coord::range::AaRefRange;
use itertools::{Itertools, MinMaxResult};
use serde::{Deserialize, Serialize};

/// Represents a group of adjacent amino acid changes along with nucleotide changes nearby.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangesGroup {
  pub name: String,
  pub range: AaRefRange,
  pub changes: Vec<AaChangeWithContext>,
  pub nuc_subs: Vec<NucSub>,
  pub nuc_dels: Vec<NucDel>,
  pub nuc_del_ranges: Vec<NucDelRange>,
}

impl AaChangesGroup {
  pub fn new(name: impl AsRef<str>) -> Self {
    Self::with_changes(name, vec![])
  }

  pub fn with_changes(name: impl AsRef<str>, changes: Vec<AaChangeWithContext>) -> Self {
    Self {
      name: name.as_ref().to_owned(),
      range: Self::find_codon_range(&changes),
      changes,
      nuc_subs: vec![],
      nuc_dels: vec![],
      nuc_del_ranges: vec![],
    }
  }

  pub fn push(&mut self, change: AaChangeWithContext) {
    self.changes.push(change);
    self.range = Self::find_codon_range(&self.changes);
  }

  pub fn last(&self) -> Option<&AaChangeWithContext> {
    self.changes.last()
  }

  fn find_codon_range(changes: &[AaChangeWithContext]) -> AaRefRange {
    match changes.iter().minmax_by_key(|change| change.pos) {
      MinMaxResult::NoElements => AaRefRange::from_isize(0, 0),
      MinMaxResult::OneElement(one) => AaRefRange::new(one.pos, one.pos + 1),
      MinMaxResult::MinMax(first, last) => AaRefRange::new(first.pos, last.pos + 1),
    }
  }
}
