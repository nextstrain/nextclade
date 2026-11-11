use crate::alphabet::nuc::Nuc;
use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDel;
use crate::coord::position::{NucRefGlobalPosition, PositionLike};
use crate::coord::range::Range;
use crate::qc::qc_config::QcRulesConfigPrivateMutations;
use crate::qc::qc_run::{QcRule, QcStatus};
use num::traits::clamp_min;
use serde::{Deserialize, Serialize};

/// Result of the private mutations QC rule.
///
/// Private mutations are mutations present in the query sequence but absent from the nearest
/// reference tree node. Excessive private mutations indicate sequencing errors or contamination.
/// Different mutation categories carry different weights. Score reaches 100 when the weighted
/// excess above `typical` equals `cutoff`.
#[derive(Clone, Debug, Default, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct QcResultPrivateMutations {
  /// Numeric QC score for this rule (0-100+)
  pub score: f64,
  /// Quality category derived from the score
  pub status: QcStatus,
  /// Number of reversion substitutions (back to reference state, weighted separately)
  pub num_reversion_substitutions: usize,
  /// Number of labeled substitutions (known phylogenetically, weighted separately)
  pub num_labeled_substitutions: usize,
  /// Number of unlabeled substitutions (unknown, weighted at full penalty)
  pub num_unlabeled_substitutions: usize,
  /// Number of contiguous deletion ranges (adjacent deletions counted as one range)
  pub total_deletion_ranges: usize,
  /// Weighted sum of all private mutation categories
  pub weighted_total: f64,
  /// Excess above the typical number of private mutations (weightedTotal - typical)
  pub excess: f64,
  /// Cutoff from the dataset configuration at which the score reaches 100
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

  let counts = PrivateMutationCounts::count(private_nuc_mutations, |_| true);
  let weighted_total = counts.weighted_total(config);

  // the score hits 100 if the excess mutations equals the cutoff value
  let score = (clamp_min(weighted_total - *config.typical, 0.0) * 100.0) / *config.cutoff;
  let status = QcStatus::from_score(score);

  Some(QcResultPrivateMutations {
    score,
    status,
    num_reversion_substitutions: counts.reversion_substitutions,
    num_labeled_substitutions: counts.labeled_substitutions,
    num_unlabeled_substitutions: counts.unlabeled_substitutions,
    total_deletion_ranges: counts.deletion_ranges,
    weighted_total,
    excess: weighted_total - *config.typical,
    cutoff: *config.cutoff,
  })
}

/// Private nucleotide mutations, counted by the categories that the private mutations QC rule weighs.
///
/// Substitutions count individually, but deletions count as contiguous ranges: 2 adjacent substitutions give a total
/// of 2, but 2 adjacent deletions give a total of 1.
#[derive(Clone, Copy, Debug, Default, PartialEq, Eq)]
pub struct PrivateMutationCounts {
  pub reversion_substitutions: usize,
  pub labeled_substitutions: usize,
  pub unlabeled_substitutions: usize,
  pub deletion_ranges: usize,
}

impl PrivateMutationCounts {
  /// Count the private mutations at the positions that `is_counted` accepts. A deletion range counts when all its
  /// positions are accepted.
  pub fn count(private_nuc_mutations: &PrivateNucMutations, is_counted: impl Fn(NucRefGlobalPosition) -> bool) -> Self {
    let PrivateNucMutations {
      reversion_substitutions,
      labeled_substitutions,
      unlabeled_substitutions,
      private_deletions,
      ..
    } = private_nuc_mutations;
    Self {
      reversion_substitutions: reversion_substitutions.iter().filter(|sub| is_counted(sub.pos)).count(),
      labeled_substitutions: labeled_substitutions
        .iter()
        .filter(|sub| is_counted(sub.substitution.pos))
        .count(),
      unlabeled_substitutions: unlabeled_substitutions.iter().filter(|sub| is_counted(sub.pos)).count(),
      deletion_ranges: find_deletion_ranges(private_deletions)
        .iter()
        .filter(|del| del.range.iter().all(&is_counted))
        .count(),
    }
  }

  /// Weighted total of the private mutations QC rule: the substitutions of each category multiplied by the weight of
  /// the category, plus the deletion ranges.
  pub fn weighted_total(&self, config: &QcRulesConfigPrivateMutations) -> f64 {
    *config.weight_reversion_substitutions * self.reversion_substitutions as f64
      + *config.weight_labeled_substitutions * self.labeled_substitutions as f64
      + *config.weight_unlabeled_substitutions * self.unlabeled_substitutions as f64
      + self.deletion_ranges as f64
  }
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

#[cfg(test)]
mod tests {
  use super::*;
  use crate::pretty_assert_ulps_eq;
  use pretty_assertions::assert_eq;

  #[test]
  fn test_qc_rule_private_mutations_counts_all() {
    let expected = PrivateMutationCounts {
      reversion_substitutions: 1,
      labeled_substitutions: 1,
      unlabeled_substitutions: 2,
      deletion_ranges: 2,
    };
    assert_eq!(
      expected,
      PrivateMutationCounts::count(&helpers::private_mutations(), |_| true)
    );
  }

  // A deletion range counts only when all its positions are accepted: the range 50-51 straddles the cutoff.
  #[test]
  fn test_qc_rule_private_mutations_counts_accepted_positions() {
    let expected = PrivateMutationCounts {
      reversion_substitutions: 1,
      labeled_substitutions: 1,
      unlabeled_substitutions: 1,
      deletion_ranges: 0,
    };
    let is_counted = |pos: NucRefGlobalPosition| pos.as_usize() < 51;
    assert_eq!(
      expected,
      PrivateMutationCounts::count(&helpers::private_mutations(), is_counted)
    );
  }

  // Oracle: weights of `QcRulesConfigPrivateMutations::example()` (reversions 1, labeled 2, unlabeled 1, deletion
  // ranges 1): 1 * 1 + 2 * 1 + 1 * 2 + 2 = 7.
  #[test]
  fn test_qc_rule_private_mutations_weighted_total() {
    let counts = PrivateMutationCounts::count(&helpers::private_mutations(), |_| true);
    let config = QcRulesConfigPrivateMutations::example();
    pretty_assert_ulps_eq!(7.0, counts.weighted_total(&config), max_ulps = 1);
  }

  mod helpers {
    use crate::alphabet::nuc::Nuc;
    use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
    use crate::analyze::nuc_del::NucDel;
    use crate::analyze::nuc_sub::{NucSub, NucSubLabeled};
    use crate::coord::position::NucRefGlobalPosition;
    use crate::o;

    /// Reversion at 0-based 10, labeled substitution at 20, unlabeled substitutions at 30 and 60, deletion ranges
    /// [50, 52) and [70, 71).
    pub fn private_mutations() -> PrivateNucMutations {
      let sub = |s: &str| -> NucSub { s.parse().unwrap() };
      let del = |pos: isize| NucDel {
        pos: NucRefGlobalPosition::from(pos),
        ref_nuc: Nuc::A,
      };
      PrivateNucMutations {
        reversion_substitutions: vec![sub("G11A")],
        labeled_substitutions: vec![NucSubLabeled {
          substitution: sub("C21T"),
          labels: vec![o!("21A")],
        }],
        unlabeled_substitutions: vec![sub("A31G"), sub("T61C")],
        private_deletions: vec![del(50), del(51), del(70)],
        ..PrivateNucMutations::default()
      }
    }
  }
}
