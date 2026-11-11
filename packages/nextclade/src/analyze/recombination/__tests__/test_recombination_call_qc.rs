//! Call checks of decoded recombinant regions: the region checks and the sequence checks, with the boundary values
//! of their thresholds.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::{obs, ranges};
  use crate::analyze::recombination::call_qc::{
    RecombinationCallQcConfig, SequenceQcInput, check_sequence, compute_missing_fraction, filter_regions,
    is_region_supported, is_rest_consistent_with_tree,
  };
  use crate::coord::range::NucRefGlobalRange;
  use crate::pretty_assert_ulps_eq;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  // Small thresholds keep the fixtures short: regions need a span of at least 4 and at most half of their sites
  // missing.
  fn call_qc() -> RecombinationCallQcConfig {
    RecombinationCallQcConfig {
      min_region_length: 4,
      max_region_missing_fraction: 0.5,
      max_recombinant_fraction: 2.0 / 3.0,
      private_mutations: helpers::private_mutations_qc(),
    }
  }

  // Oracle: the fraction of `X` (Missing) in the region span, counted by hand.
  #[rustfmt::skip]
  #[rstest]
  #[case::no_missing(  "RMMMR",  (1, 4), 0.0)]
  #[case::half(        "RMXXM",  (1, 5), 0.5)]
  #[case::all_missing( "RXXXR",  (1, 4), 1.0)]
  #[case::outside(     "XXMMXX", (2, 4), 0.0)]
  #[trace]
  fn test_recombination_call_qc_missing_fraction(
    #[case] observations: &str,
    #[case] (begin, end): (usize, usize),
    #[case] expected: f64,
  ) {
    let region = NucRefGlobalRange::from_usize(begin, end);
    pretty_assert_ulps_eq!(expected, compute_missing_fraction(&region, &obs(observations)), max_ulps = 1);
  }

  // Region = the whole observation string. Boundaries: span 4 (= minimum) passes, span 3 fails; missing fraction 0.5
  // (= maximum) passes, 0.6 fails. A region that fails on missing data fails also when it is long enough.
  #[rustfmt::skip]
  #[rstest]
  #[case::min_length(              "MMMM",       true)]
  #[case::below_min_length(        "MMM",        false)]
  #[case::max_missing(             "MXXM",       true)]
  #[case::above_max_missing(       "MXXXM",      false)]
  #[case::long_but_mostly_missing( "MXXXXXXXXM", false)]
  #[case::below_max_missing(       "MXMXM",      true)]
  #[trace]
  fn test_recombination_call_qc_region_supported(#[case] observations: &str, #[case] expected: bool) {
    let observations = obs(observations);
    let region = NucRefGlobalRange::from_usize(0, observations.len());
    assert_eq!(expected, is_region_supported(&region, &observations, &call_qc()));
  }

  #[test]
  fn test_recombination_call_qc_filter_regions_keeps_supported_in_order() {
    //                      0         1         2
    //                      0123456789012345678901234
    let observations = obs("RMMMMRRMMMRRMXXXMRRMXXMRR");
    //                       [--]  [-]  [---]  [--]
    let regions = ranges(&[(1, 5), (7, 10), (12, 17), (19, 23)]);
    // (7, 10) is too short; (12, 17) has 3 of 5 sites missing.
    let expected = ranges(&[(1, 5), (19, 23)]);
    assert_eq!(expected, filter_regions(regions, &observations, &call_qc()));
  }

  // 300 covered sites and no private mutations, so only the coverage check can drop the call. Boundary: regions that
  // span 200 of 300 sites (= 2/3) pass, 201 fail.
  #[rustfmt::skip]
  #[rstest]
  #[case::at_max(    &[(0, 100), (150, 250)], true)]
  #[case::above_max( &[(0, 101), (150, 250)], false)]
  #[case::small(     &[(0, 50)],              true)]
  #[trace]
  fn test_recombination_call_qc_sequence_coverage(#[case] pairs: &[(usize, usize)], #[case] is_kept: bool) {
    let observations = obs(&"R".repeat(300));
    let alignment_range = NucRefGlobalRange::from_usize(0, 300);
    let private_nuc_mutations = helpers::private_mutations(&[], &[], &[]);
    let sequence = SequenceQcInput {
      obs: &observations,
      alignment_range: &alignment_range,
      private_nuc_mutations: &private_nuc_mutations,
    };
    let expected = if is_kept { ranges(pairs) } else { vec![] };
    assert_eq!(expected, check_sequence(ranges(pairs), &sequence, &call_qc()));
  }

  // 100 covered sites, one region [0, 50), so `Lm` = 50 covered sites outside it. With `typical` 2 and `cutoff` 6, the
  // rest fails at a weighted total of at least (2 + 6) * 50 / 100 = 4. Mutations inside the region do not count.
  // Weights: unlabeled 1, labeled 2, deletion range 1.
  #[rustfmt::skip]
  #[rstest]
  #[case::below_threshold(       (vec![60, 61, 62],     vec![],   vec![]),       true)]
  #[case::at_threshold(          (vec![60, 61, 62, 63], vec![],   vec![]),       false)]
  #[case::inside_not_counted(    (vec![5, 6, 7, 60],    vec![],   vec![]),       true)]
  #[case::labeled_weighted(      (vec![60, 61],         vec![70], vec![]),       false)]
  #[case::deletion_range_counted((vec![60, 61, 62],     vec![],   vec![80, 81]), false)]
  #[case::deletion_inside(       (vec![60, 61, 62],     vec![],   vec![20, 21]), true)]
  #[trace]
  fn test_recombination_call_qc_rest_of_sequence(
    #[case] (unlabeled, labeled, deletions): (Vec<usize>, Vec<usize>, Vec<usize>),
    #[case] is_consistent: bool,
  ) {
    let observations = obs(&"R".repeat(100));
    let alignment_range = NucRefGlobalRange::from_usize(0, 100);
    let private_nuc_mutations = helpers::private_mutations(&unlabeled, &labeled, &deletions);
    let sequence = SequenceQcInput {
      obs: &observations,
      alignment_range: &alignment_range,
      private_nuc_mutations: &private_nuc_mutations,
    };
    let regions = ranges(&[(0, 50)]);
    assert_eq!(
      is_consistent,
      is_rest_consistent_with_tree(&regions, &sequence, &helpers::private_mutations_qc())
    );
  }

  // Missing sites outside the region shorten the rest: with 25 of the 50 sites outside the region missing, `Lm` = 25
  // and the threshold is (2 + 6) * 25 / 100 = 2. Without covered sites outside the region the threshold is 0, so the
  // rest gives no evidence that the sequence fits the tree, and fails also without mutations.
  #[rustfmt::skip]
  #[rstest]
  #[case::short_rest_below(    ("R".repeat(75) + &"X".repeat(25), vec![60]),     true)]
  #[case::short_rest_at(       ("R".repeat(75) + &"X".repeat(25), vec![60, 61]), false)]
  #[case::no_rest_no_mutations(("R".repeat(50) + &"X".repeat(50), vec![]),       false)]
  #[trace]
  fn test_recombination_call_qc_rest_of_sequence_scales_with_covered_sites(
    #[case] (observations, unlabeled): (String, Vec<usize>),
    #[case] is_consistent: bool,
  ) {
    let observations = obs(&observations);
    let alignment_range = NucRefGlobalRange::from_usize(0, 100);
    let private_nuc_mutations = helpers::private_mutations(&unlabeled, &[], &[]);
    let sequence = SequenceQcInput {
      obs: &observations,
      alignment_range: &alignment_range,
      private_nuc_mutations: &private_nuc_mutations,
    };
    let regions = ranges(&[(0, 50)]);
    assert_eq!(
      is_consistent,
      is_rest_consistent_with_tree(&regions, &sequence, &helpers::private_mutations_qc())
    );
  }

  mod helpers {
    use crate::alphabet::nuc::Nuc;
    use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
    use crate::analyze::nuc_del::NucDel;
    use crate::analyze::nuc_sub::{NucSub, NucSubLabeled};
    use crate::coord::position::NucRefGlobalPosition;
    use crate::o;
    use crate::qc::qc_config::QcRulesConfigPrivateMutations;
    use ordered_float::OrderedFloat;

    /// Private mutations QC rule with `typical` 2 and `cutoff` 6, and weights unlabeled 1, labeled 2, reversion 1.
    pub fn private_mutations_qc() -> QcRulesConfigPrivateMutations {
      QcRulesConfigPrivateMutations {
        typical: OrderedFloat(2.0),
        cutoff: OrderedFloat(6.0),
        ..QcRulesConfigPrivateMutations::example()
      }
    }

    /// Private mutations at 0-based positions: unlabeled and labeled substitutions, and single-site deletions.
    pub fn private_mutations(unlabeled: &[usize], labeled: &[usize], deletions: &[usize]) -> PrivateNucMutations {
      let sub = |pos: &usize| NucSub {
        pos: NucRefGlobalPosition::from(*pos as isize),
        ref_nuc: Nuc::A,
        qry_nuc: Nuc::G,
      };
      let unlabeled_substitutions: Vec<NucSub> = unlabeled.iter().map(sub).collect();
      let labeled_substitutions: Vec<NucSubLabeled> = labeled
        .iter()
        .map(|pos| NucSubLabeled {
          substitution: sub(pos),
          labels: vec![o!("A")],
        })
        .collect();
      let private_substitutions = unlabeled.iter().chain(labeled).map(sub).collect();
      let private_deletions = deletions
        .iter()
        .map(|pos| NucDel {
          pos: NucRefGlobalPosition::from(*pos as isize),
          ref_nuc: Nuc::A,
        })
        .collect();
      PrivateNucMutations {
        private_substitutions,
        private_deletions,
        labeled_substitutions,
        unlabeled_substitutions,
        ..PrivateNucMutations::default()
      }
    }
  }
}
