//! Golden-master parity tests for the recombination HMM against the `recomb_inference` Python
//! prototype (https://github.com/mmolari/recomb_inference).
//!
//! Pins `viterbi_decode` to `viterbi_recombination` and `compute_forward_backward_marginals` to
//! `forward_backward_recombination_logexp`. Binary observations only (`0 = Ref`, `1 = Mut`);
//! `Missing`-state handling is covered by unit and property tests.
//!
//! Fixtures in `__fixtures__/gm_recombination_{inputs,outputs}.json`; see the capture script header
//! for regeneration.
//!
//! The prototype adds `eps = 1e-10` before `log()` to guard `log(0)`. The Rust port validates params
//! into `(0, 1)` instead. This perturbs prototype marginals, most at genome scale (`muW = 5e-4`).
//! Tolerances below are the tightest that absorb the perturbation. Viterbi matches exactly.

#[cfg(test)]
mod tests {
  use crate::analyze::recombination::decode::viterbi_decode;
  use helpers::{fb_max_diff, input_case, observations, output_case};
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::test_all_ref("gm_test_all_ref")]
  #[case::test_all_mut("gm_test_all_mut")]
  #[case::test_single_mut("gm_test_single_mut")]
  #[case::test_short_block("gm_test_short_block")]
  #[case::test_alternating("gm_test_alternating")]
  #[case::test_dense_block("gm_test_dense_block")]
  #[case::test_two_blocks("gm_test_two_blocks")]
  #[case::test_sparse("gm_test_sparse")]
  #[case::mid_planted_block("gm_mid_planted_block")]
  #[case::genome_all_ref("gm_genome_all_ref")]
  #[case::genome_planted_block("gm_genome_planted_block")]
  #[case::genome_sparse("gm_genome_sparse")]
  #[trace]
  fn test_gm_recombination_viterbi_matches_prototype(#[case] name: &str) {
    let input = input_case(name);
    let expected = output_case(name);
    assert_eq!(name, input.name);
    assert_eq!(name, expected.name);

    let obs = observations(&input.mutations);
    let decoded = viterbi_decode(&obs, &input.params);

    // Prototype: 1 = recombinant, 0 = wildtype. Rust: true = recombinant.
    let expected_recombinant: Vec<bool> = expected.viterbi_states.iter().map(|&s| s == 1).collect();
    assert_eq!(expected_recombinant, decoded);
  }

  // muW >= 0.01: `eps` smoothing negligible, marginals match near machine precision.
  #[rustfmt::skip]
  #[rstest]
  #[case::test_all_ref("gm_test_all_ref")]
  #[case::test_all_mut("gm_test_all_mut")]
  #[case::test_single_mut("gm_test_single_mut")]
  #[case::test_short_block("gm_test_short_block")]
  #[case::test_alternating("gm_test_alternating")]
  #[case::test_dense_block("gm_test_dense_block")]
  #[case::test_two_blocks("gm_test_two_blocks")]
  #[case::test_sparse("gm_test_sparse")]
  #[case::mid_planted_block("gm_mid_planted_block")]
  #[trace]
  fn test_gm_recombination_forward_backward_matches_prototype(#[case] name: &str) {
    let max_diff = fb_max_diff(name);
    assert!(
      max_diff < 1e-9,
      "case {name}: max |Δ P(recombinant)| = {max_diff:e} exceeds tolerance"
    );
  }

  // muW = 5e-4: `eps` is a larger relative perturbation, deviation grows to ~1e-8.
  // Looser tolerance covers the smoothing artifact only.
  #[rustfmt::skip]
  #[rstest]
  #[case::genome_all_ref("gm_genome_all_ref")]
  #[case::genome_planted_block("gm_genome_planted_block")]
  #[case::genome_sparse("gm_genome_sparse")]
  #[trace]
  fn test_gm_recombination_forward_backward_matches_prototype_genome_scale(#[case] name: &str) {
    let max_diff = fb_max_diff(name);
    assert!(
      max_diff < 1e-7,
      "case {name}: max |Δ P(recombinant)| = {max_diff:e} exceeds tolerance"
    );
  }

  mod helpers {
    use crate::analyze::recombination::forward_backward::compute_forward_backward_marginals;
    use crate::analyze::recombination::observations::RecombinationObs;
    use crate::analyze::recombination::params::RecombinationHmmParams;
    use serde::Deserialize;

    const INPUTS_JSON: &str = include_str!("__fixtures__/gm_recombination_inputs.json");
    const OUTPUTS_JSON: &str = include_str!("__fixtures__/gm_recombination_outputs.json");

    /// HMM params + binary observation vector for one case.
    #[derive(Deserialize)]
    pub struct GmInputCase {
      pub name: String,
      pub params: RecombinationHmmParams,
      /// 0 = Ref, 1 = Mut.
      pub mutations: Vec<u8>,
    }

    /// Prototype's Viterbi path + forward-backward marginals for one case.
    #[derive(Deserialize)]
    #[serde(rename_all = "camelCase")]
    pub struct GmOutputCase {
      pub name: String,
      /// 0 = wildtype, 1 = recombinant.
      pub viterbi_states: Vec<u8>,
      /// P(recombinant | obs) per site.
      pub fb_marginals: Vec<f64>,
    }

    #[derive(Deserialize)]
    struct GmCases<T> {
      cases: Vec<T>,
    }

    pub fn input_case(name: &str) -> GmInputCase {
      let inputs: GmCases<GmInputCase> = serde_json::from_str(INPUTS_JSON).unwrap();
      inputs.cases.into_iter().find(|c| c.name == name).unwrap()
    }

    pub fn output_case(name: &str) -> GmOutputCase {
      let outputs: GmCases<GmOutputCase> = serde_json::from_str(OUTPUTS_JSON).unwrap();
      outputs.cases.into_iter().find(|c| c.name == name).unwrap()
    }

    pub fn observations(mutations: &[u8]) -> Vec<RecombinationObs> {
      mutations
        .iter()
        .map(|&m| match m {
          0 => RecombinationObs::Ref,
          1 => RecombinationObs::Mut,
          other => panic!("golden input observation must be 0 (Ref) or 1 (Mut), got {other}"),
        })
        .collect()
    }

    /// Max absolute marginal difference vs prototype for one case.
    pub fn fb_max_diff(name: &str) -> f64 {
      let input = input_case(name);
      let expected = output_case(name);

      let obs = observations(&input.mutations);
      let actual = compute_forward_backward_marginals(&obs, &input.params);
      assert_eq!(expected.fb_marginals.len(), actual.len());

      expected
        .fb_marginals
        .iter()
        .zip(&actual)
        .map(|(e, a)| (e - a).abs())
        .fold(0.0_f64, f64::max)
    }
  }
}
