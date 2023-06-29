use crate::alphabet::nuc::Nuc;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDel;
use crate::coord::position::PositionLike;
use crate::coord::range::Range;
use crate::qc::qc_config::QcRulesConfigPrivateMutations;
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultPrivateMutations {
  pub score: f64,
  pub status: QcStatus,
  pub num_reversion_substitutions: usize,
  pub num_labeled_substitutions: usize,
  pub num_unlabeled_substitutions: usize,
  pub total_deletion_ranges: usize,
  pub weighted_total: f64,
  pub excess: f64,
  pub cutoff: f64,
}

impl QcRule for QcResultPrivateMutations {
  fn score(&self) -> f64 {
    self.score
  }
}

pub fn rule_private_mutations(
  private_nuc_mutations: &PrivateNucMutations,
  config: &QcRulesConfigPrivateMutations,
) -> Option<QcResultPrivateMutations> {
  if !config.enabled {
    return None;
  }

  // Note that we count *individual* nucleotide substitutions, but contiguous *ranges* of deletions.
  // That is, a 2 adjacent substitutions give a total of 2, but 2 adjacent deletions give a total of 1.
  let num_reversion_substitutions = private_nuc_mutations.reversion_substitutions.len();
  let num_labeled_substitutions = private_nuc_mutations.labeled_substitutions.len();
  let num_unlabeled_substitutions = private_nuc_mutations.unlabeled_substitutions.len();
  let deletion_ranges = find_deletion_ranges(&private_nuc_mutations.private_deletions);
  let total_deletion_ranges = deletion_ranges.len();

  let weighted_total = 0.0
    + config.weight_reversion_substitutions * num_reversion_substitutions as f64
    + config.weight_labeled_substitutions * num_labeled_substitutions as f64
    + config.weight_unlabeled_substitutions * num_unlabeled_substitutions as f64
    + total_deletion_ranges as f64;

  // the score hits 100 if the excess mutations equals the cutoff value
  let score = (clamp_min(weighted_total - config.typical, 0.0) * 100.0) / config.cutoff;
  let status = QcStatus::from_score(score);

  Some(QcResultPrivateMutations {
    score,
    status,
    num_reversion_substitutions,
    num_labeled_substitutions,
    num_unlabeled_substitutions,
    total_deletion_ranges,
    weighted_total,
    excess: weighted_total - config.typical,
    cutoff: config.cutoff,
  })
}

/// Finds all contiguous ranges of private nucleotide deletions.
///
/// By contrast with nucleotide deletions (the `.deletions` field in the `AnalysisResult`), which are listed in the
/// form of ranges, private nucleotide deletions are listed
/// individually. We compute the ranges for private deletions here.
///
fn find_deletion_ranges(dels: &[NucDel]) -> Vec<NucRange> {
  if dels.is_empty() {
    return vec![];
  }

  let mut ranges = Vec::<NucRange>::new();
  let n_dels = dels.len();

  // if no gaps, return empty list of ranges
  if n_dels == 0 {
    return ranges;
  }

  // init current range with length 1 and previous position at the first deletion
  let mut pos_prev = dels[0].pos.as_isize();
  let mut length = 1;

  // loop over all subsequent deletions
  for i in 1..n_dels {
    let pos_curr = dels[i].pos.as_isize();

    if pos_curr - pos_prev != 1 {
      // If the current position is not adjacent to the previous,
      // then close the current range (end is at previous gap+1)
      let begin = dels[i - length].pos;
      let end = dels[i - 1].pos + 1;

      ranges.push(NucRange {
        range: Range::new(begin, end),
        letter: Nuc::Gap,
      });

      // Start a new range
      length = 1;
    } else {
      // Extend the current range
      length += 1;
    }
    pos_prev = pos_curr;
  }

  // close they last range
  let begin = dels[n_dels - length].pos;
  let end = dels[n_dels - 1].pos + 1;

  ranges.push(NucRange {
    range: Range::new(begin, end),
    letter: Nuc::Gap,
  });

  ranges
}
