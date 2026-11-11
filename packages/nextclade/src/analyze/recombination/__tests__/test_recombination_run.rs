//! Per-sequence entry point: decoding followed by the region and sequence checks.
//!
//! Test parameters (see `test_params`): a switch costs ln(0.95 / 0.05) ~ 2.94 nats, a `Mut` adds ln(0.5 / 0.05) ~ 2.30
//! nats toward the recombinant state, a `Ref` adds ln(0.95 / 0.5) ~ 0.64 nats toward the wildtype state. An interior
//! block of 3 or more adjacent `Mut` outweighs the two switches, and the block does not extend into flanking `Ref`.
//! A `Mut` with 4 `Ref` on each side forms no region.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::__tests__::recombination_test_helpers::ranges;
  use crate::analyze::recombination::result::RecombinationResult;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  const REF_LEN: usize = 40;

  // Block of 6 `Mut` at [15, 21): length 6 passes the region checks, 6 / 40 of the alignment passes the coverage
  // check, and without other mutations the rest passes.
  #[test]
  fn test_recombination_run_reports_supported_region() {
    let expected = RecombinationResult::from_ranges(ranges(&[(15, 21)]));
    assert_eq!(expected, helpers::run(&[15, 16, 17, 18, 19, 20]));
  }

  #[rustfmt::skip]
  #[rstest]
  // No private substitutions: no call is possible.
  #[case::no_substitutions(  &[])]
  // Block of 3 `Mut` at [15, 18): decoded, but shorter than the minimal length 4.
  #[case::short_region(      &[15, 16, 17])]
  // Block at [15, 21) plus 7 isolated mutations outside it: `Lm` = 34 covered sites, threshold (2 + 6) * 34 / 40 =
  // 6.8, and the weighted total 7 of the rest reaches it.
  #[case::rest_not_fitting(  &[0, 5, 10, 15, 16, 17, 18, 19, 20, 25, 30, 35, 39])]
  #[trace]
  fn test_recombination_run_reports_no_call(#[case] positions: &[usize]) {
    assert_eq!(None, helpers::run(positions));
  }

  mod helpers {
    use super::REF_LEN;
    use crate::alphabet::nuc::Nuc;
    use crate::analyze::find_private_nuc_mutations::PrivateNucMutations;
    use crate::analyze::nuc_sub::NucSub;
    use crate::analyze::recombination::__tests__::recombination_test_helpers::test_params;
    use crate::analyze::recombination::call_qc::RecombinationCallQcConfig;
    use crate::analyze::recombination::result::RecombinationResult;
    use crate::analyze::recombination::run::{RecombinationRunInput, run_recombination};
    use crate::analyze::recombination::setup::RecombinationSetup;
    use crate::coord::position::NucRefGlobalPosition;
    use crate::coord::range::NucRefGlobalRange;
    use crate::qc::qc_config::QcRulesConfigPrivateMutations;
    use ordered_float::OrderedFloat;

    /// Run detection on a fully covered sequence of `REF_LEN` sites with unlabeled private substitutions at the given
    /// 0-based positions.
    pub fn run(positions: &[usize]) -> Option<RecombinationResult> {
      let setup = RecombinationSetup {
        params: test_params(),
        call_qc: RecombinationCallQcConfig {
          min_region_length: 4,
          max_region_missing_fraction: 0.5,
          max_recombinant_fraction: 2.0 / 3.0,
          private_mutations: QcRulesConfigPrivateMutations {
            typical: OrderedFloat(2.0),
            cutoff: OrderedFloat(6.0),
            ..QcRulesConfigPrivateMutations::example()
          },
        },
      };
      let substitutions: Vec<NucSub> = positions
        .iter()
        .map(|pos| NucSub {
          pos: NucRefGlobalPosition::from(*pos as isize),
          ref_nuc: Nuc::A,
          qry_nuc: Nuc::G,
        })
        .collect();
      let private_nuc_mutations = PrivateNucMutations {
        private_substitutions: substitutions.clone(),
        unlabeled_substitutions: substitutions,
        ..PrivateNucMutations::default()
      };
      let alignment_range = NucRefGlobalRange::from_usize(0, REF_LEN);
      run_recombination(
        &setup,
        &RecombinationRunInput {
          ref_len: REF_LEN,
          alignment_range: &alignment_range,
          private_nuc_mutations: &private_nuc_mutations,
          missing: &[],
          non_acgtns: &[],
          deletions: &[],
          masked_ranges: &[],
        },
      )
    }
  }
}
