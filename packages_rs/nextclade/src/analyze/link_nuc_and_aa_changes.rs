use crate::analyze::aa_changes::{AaDel, AaSub};
use crate::analyze::aa_sub_full;
use crate::analyze::aa_sub_full::{AaDelFull, AaSubFull};
use crate::analyze::nuc_del::NucDel;
use crate::analyze::nuc_sub::NucSub;
use crate::analyze::nuc_sub_full::{NucDelFull, NucSubFull};
use crate::utils::range::have_intersection;
use itertools::Itertools;

#[derive(Debug, Default)]
pub struct LinkedNucAndAaChanges {
  pub substitutions: Vec<NucSubFull>,
  pub deletions: Vec<NucDelFull>,
  pub aa_substitutions: Vec<AaSubFull>,
  pub aa_deletions: Vec<AaDelFull>,
}

impl LinkedNucAndAaChanges {
  pub fn new(
    substitutions: &[NucSub],
    deletions: &[NucDel],
    aa_substitutions: &[AaSub],
    aa_deletions: &[AaDel],
  ) -> Self {
    Self {
      substitutions: substitutions.iter().map(NucSubFull::from_nuc_sub).collect_vec(),
      deletions: deletions.iter().map(NucDelFull::from_nuc_del).collect_vec(),
      aa_substitutions: aa_substitutions.iter().map(AaSubFull::from_aa_sub).collect_vec(),
      aa_deletions: aa_deletions.iter().map(AaDelFull::from_aa_del).collect_vec(),
    }
  }
}

/// Associates nucleotide and aminoacid mutations, such that each nucleotide mutations contains a list of aminoacid
/// mutations it is related to, and each aminoacid mutation contains a list of nucleotide mutations it is related to.
pub fn link_nuc_and_aa_changes(
  substitutions: &[NucSub],
  deletions: &[NucDel],
  aa_substitutions: &[AaSub],
  aa_deletions: &[AaDel],
) -> LinkedNucAndAaChanges {
  let mut linked = LinkedNucAndAaChanges::new(substitutions, deletions, aa_substitutions, aa_deletions);

  for aa_sub in &mut linked.aa_substitutions {
    for nuc_sub in &mut linked.substitutions {
      for context in &aa_sub.sub.nuc_contexts {
        if context.codon_nuc_range.contains(nuc_sub.sub.pos) {
          nuc_sub.aa_substitutions.push(aa_sub.sub.clone());
          aa_sub.nuc_substitutions.push(nuc_sub.sub.clone());
        }
      }
    }

    for nuc_del in &mut linked.deletions {
      for context in &aa_sub.sub.nuc_contexts {
        if have_intersection(&nuc_del.del.range(), &context.codon_nuc_range) {
          nuc_del.aa_substitutions.push(aa_sub.sub.clone());
          aa_sub.nuc_deletions.push(nuc_del.del.clone());
        }
      }
    }
  }

  for aa_del in &mut linked.aa_deletions {
    for nuc_sub in &mut linked.substitutions {
      for context in &aa_del.del.nuc_contexts {
        if context.codon_nuc_range.contains(nuc_sub.sub.pos) {
          nuc_sub.aa_deletions.push(aa_del.del.clone());
          aa_del.nuc_substitutions.push(nuc_sub.sub.clone());
        }
      }
    }

    for nuc_del in &mut linked.deletions {
      for context in &aa_del.del.nuc_contexts {
        if have_intersection(&nuc_del.del.range(), &context.codon_nuc_range) {
          nuc_del.aa_deletions.push(aa_del.del.clone());
          aa_del.nuc_deletions.push(nuc_del.del.clone());
        }
      }
    }
  }

  linked
}
