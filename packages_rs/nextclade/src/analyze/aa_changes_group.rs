use crate::analyze::aa_changes::{AaChange, AaChangeType, AaContext, NucContext};
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::utils::range::Range;
use itertools::{merge, Itertools};
use serde::{Deserialize, Serialize};

#[allow(clippy::string_slice)]
pub fn merge_context(left: &str, right: &str) -> String {
  // left:    aaa bbb ccc
  // right:       bbb ccc ddd
  // result:  aaa bbb ccc ddd
  let mut result = left[0..left.len() - 3].to_owned();
  result.push_str(&right[3..9]);
  result
}

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct AaChangeGroup {
  pub gene: String,
  pub codon_aa_range: Range,
  pub changes: Vec<AaChange>,
  pub num_substitutions: usize,
  pub num_deletions: usize,
  pub nuc_substitutions: Vec<NucSub>,
  pub nuc_deletions: Vec<NucDel>,
  pub nuc_contexts: Vec<NucContext>,
  pub aa_context: AaContext,
}

impl AaChangeGroup {
  pub fn new(change: &AaChange) -> Self {
    Self {
      gene: change.gene.clone(),
      codon_aa_range: Range {
        begin: change.pos,
        end: change.pos + 1,
      },
      changes: vec![change.clone()],

      nuc_contexts: change.nuc_contexts.clone(),
      aa_context: change.aa_context.clone(),

      num_substitutions: if change.change_type == AaChangeType::Sub { 1 } else { 0 },
      num_deletions: if change.change_type == AaChangeType::Del { 0 } else { 1 },
      nuc_substitutions: change.nuc_substitutions.clone(),
      nuc_deletions: change.nuc_deletions.clone(),
    }
  }

  fn insert(&mut self, change: &AaChange) {
    self.changes.push(change.clone());

    // TODO
    // self.codon_aa_range.end = change.pos + 1;
    // // check what strand the gene is on -- if self.begin > change.begin -> reverse strand
    // if self.codon_nuc_range.begin > change.codon_nuc_range.begin {
    //   self.codon_nuc_range.begin = change.codon_nuc_range.begin;
    //   self.context_nuc_range.begin = change.context_nuc_range.begin;
    // } else {
    //   self.codon_nuc_range.end = change.codon_nuc_range.end;
    //   self.context_nuc_range.end = change.context_nuc_range.end;
    // }
    // // context is reverse complemented if the gene is on reverse strand, so merging doesn't depend on strand
    // self.ref_context = merge_context(&self.ref_context, &change.ref_context);
    // self.query_context = merge_context(&self.query_context, &change.query_context);

    self.nuc_substitutions = merge(&self.nuc_substitutions, &change.nuc_substitutions)
      .cloned()
      .sorted()
      .unique()
      .collect_vec();

    self.nuc_deletions = merge(&self.nuc_deletions, &change.nuc_deletions)
      .cloned()
      .sorted()
      .unique()
      .collect_vec();

    match change.change_type {
      AaChangeType::Sub => {
        self.num_substitutions += 1;
      }
      AaChangeType::Del => {
        self.num_deletions += 1;
      }
    }
  }
}

pub fn group_adjacent_aa_subs_and_dels(
  aa_substitutions: &[AaSubFull],
  aa_deletions: &[AaDelFull],
) -> Vec<AaChangeGroup> {
  let subs = aa_substitutions.iter().map(|sub| AaChange::from(sub.clone()));
  let dels = aa_deletions.iter().map(|del| AaChange::from(del.clone()));
  let changes: Vec<AaChange> = merge(subs, dels).sorted().collect_vec();

  if changes.is_empty() {
    return vec![];
  }

  let mut groups = vec![AaChangeGroup::new(&changes[0])];
  for i in 1..changes.len() {
    let prev = &changes[i - 1];
    let curr = &changes[i];
    let group = groups.last_mut().unwrap();
    if (curr.gene == prev.gene) && (curr.pos - prev.pos == 1) {
      group.insert(curr);
    } else {
      groups.push(AaChangeGroup::new(curr));
    }
  }

  groups
}
