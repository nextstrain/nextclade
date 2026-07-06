//! HMM-based recombination detection.
//!
//! A two-state hidden Markov model (wildtype, recombinant) decoded with Viterbi. Each reference
//! site emits one of three observations relative to the sequence's inferred parent (its tree
//! attachment point): not mutated (`Ref`), mutated (`Mut`), or no usable information (`Missing`).
//! Contiguous runs of the recombinant state are reported as putative recombinant intervals.
//!
//! Ported from Marco Molari's prototype <https://github.com/mmolari/recomb_inference>. The prototype
//! is strictly binary; the only structural addition here is the `Missing` observation, which emits
//! probability 1 in both states (standard HMM marginalization over missing data). It contributes no
//! emission evidence while transitions still cross it, so the decoded state persists across missing
//! runs. On fully covered input the `Missing` branch never fires and the decoded path matches the
//! prototype exactly.

use crate::coord::range::NucRefGlobalRange;
use crate::make_error;
use eyre::Report;
use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};

/// Two hidden states, used as indices into per-site score and emission arrays.
const WILDTYPE: usize = 0;
const RECOMBINANT: usize = 1;

/// Decode putative recombinant intervals from a per-site observation vector.
///
/// The observation vector is in reference coordinates, one entry per reference position. The
/// returned intervals are the maximal runs of the recombinant state, as 0-based half-open ranges.
pub fn find_recombinant_regions(
  obs: &[RecombinationObs],
  params: &RecombinationHmmParams,
) -> Result<Vec<NucRefGlobalRange>, Report> {
  params.validate()?;
  let is_recombinant = viterbi_decode(obs, params);
  Ok(extract_recombinant_intervals(&is_recombinant))
}

/// Per-site observation for the recombination HMM, in reference coordinates.
#[repr(u8)]
#[derive(Debug, Clone, Copy, Eq, PartialEq)]
pub enum RecombinationObs {
  /// Covered position that matches the parent (not mutated).
  Ref,
  /// Covered position that differs from the parent (mutated).
  Mut,
  /// No usable information: N, deletion, ambiguous character, or outside the alignment.
  Missing,
}

/// Emission and transition parameters for the two-state recombination HMM.
///
/// All three are probabilities and must lie in the open interval `(0, 1)`; the closed endpoints
/// produce `log(0) = -inf` in the decoder.
#[derive(Debug, Clone, Copy, PartialEq)]
pub struct RecombinationHmmParams {
  /// Transition rate: probability of switching state between adjacent sites.
  pub gamma: f64,
  /// Mutation emission probability in the wildtype state (background divergence).
  pub mu_w: f64,
  /// Mutation emission probability in the recombinant state (elevated divergence).
  pub mu_r: f64,
}

impl RecombinationHmmParams {
  fn validate(&self) -> Result<(), Report> {
    for (name, value) in [("gamma", self.gamma), ("mu_w", self.mu_w), ("mu_r", self.mu_r)] {
      if !(value > 0.0 && value < 1.0) {
        return make_error!("Recombination HMM parameter `{name}` must be in the open interval (0, 1), but got {value}");
      }
    }
    Ok(())
  }

  /// Log-space emission scores `[wildtype, recombinant]` for one observation.
  fn log_emission(&self, obs: RecombinationObs) -> [f64; 2] {
    match obs {
      RecombinationObs::Ref => [(1.0 - self.mu_w).ln(), (1.0 - self.mu_r).ln()],
      RecombinationObs::Mut => [self.mu_w.ln(), self.mu_r.ln()],
      // Marginalize over missing data: emission probability 1 in both states (log 0).
      RecombinationObs::Missing => [0.0, 0.0],
    }
  }
}

/// Dataset configuration for recombination detection, as it appears in `pathogen.json`.
///
/// Each parameter is optional and resolved independently: a value given here is used verbatim,
/// otherwise a fallback is computed from the reference and reference tree (`gamma = 1 / ref_len`,
/// `mu_w`/`mu_r` estimated from the tree). An absent config object, or one with `enabled` omitted,
/// leaves the feature enabled (see `RecombinationConfig::is_enabled`).
#[derive(Clone, Debug, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RecombinationConfig {
  /// Whether recombination detection runs for this dataset. Enabled by default.
  pub enabled: bool,

  /// State transition rate override. When absent, defaults to `1 / ref_len`.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub gamma: Option<OrderedFloat<f64>>,

  /// Wildtype mutation emission probability override. When absent, estimated from the tree.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub mu_w: Option<OrderedFloat<f64>>,

  /// Recombinant mutation emission probability override. When absent, estimated from the tree.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub mu_r: Option<OrderedFloat<f64>>,
}

impl Default for RecombinationConfig {
  fn default() -> Self {
    Self { enabled: true, gamma: None, mu_w: None, mu_r: None }
  }
}

impl RecombinationConfig {
  /// Effective enablement for an optional config: absent config counts as enabled (default-on).
  pub fn is_enabled(config: Option<&RecombinationConfig>) -> bool {
    config.is_none_or(|c| c.enabled)
  }
}

/// Viterbi decoding in log-space. Returns, per site, whether the most likely state is recombinant.
fn viterbi_decode(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<bool> {
  let n = obs.len();
  if n == 0 {
    return vec![];
  }

  // Symmetric transition matrix: staying in a state costs `log(1 - gamma)`, switching costs `log(gamma)`.
  let log_stay = (1.0 - params.gamma).ln();
  let log_switch = params.gamma.ln();
  let log_trans = |from: usize, to: usize| if from == to { log_stay } else { log_switch };

  // Uniform initial prior over the two states.
  let log_prior = 0.5_f64.ln();

  // `score[l][k]` = log-probability of the best path ending in state `k` at site `l`.
  // `back[l][k]` = the state at site `l - 1` on that best path.
  let mut score = vec![[f64::NEG_INFINITY; 2]; n];
  let mut back = vec![[WILDTYPE; 2]; n];

  let emit0 = params.log_emission(obs[0]);
  score[0] = [log_prior + emit0[WILDTYPE], log_prior + emit0[RECOMBINANT]];

  for l in 1..n {
    let emit = params.log_emission(obs[l]);
    for to in [WILDTYPE, RECOMBINANT] {
      let from_wildtype = score[l - 1][WILDTYPE] + log_trans(WILDTYPE, to);
      let from_recombinant = score[l - 1][RECOMBINANT] + log_trans(RECOMBINANT, to);
      let (best_prev, best_score) = if from_recombinant > from_wildtype {
        (RECOMBINANT, from_recombinant)
      } else {
        (WILDTYPE, from_wildtype)
      };
      score[l][to] = emit[to] + best_score;
      back[l][to] = best_prev;
    }
  }

  // Backtrace from the highest-scoring final state.
  let mut is_recombinant = vec![false; n];
  let mut state = if score[n - 1][RECOMBINANT] > score[n - 1][WILDTYPE] {
    RECOMBINANT
  } else {
    WILDTYPE
  };
  is_recombinant[n - 1] = state == RECOMBINANT;
  for l in (0..n - 1).rev() {
    state = back[l + 1][state];
    is_recombinant[l] = state == RECOMBINANT;
  }
  is_recombinant
}

/// Extract maximal runs of the recombinant state as 0-based half-open reference ranges.
fn extract_recombinant_intervals(is_recombinant: &[bool]) -> Vec<NucRefGlobalRange> {
  let mut regions = vec![];
  let mut begin: Option<usize> = None;
  for (i, &recombinant) in is_recombinant.iter().enumerate() {
    match (recombinant, begin) {
      (true, None) => begin = Some(i),
      (false, Some(start)) => {
        regions.push(NucRefGlobalRange::from_usize(start, i));
        begin = None;
      }
      _ => {}
    }
  }
  if let Some(start) = begin {
    regions.push(NucRefGlobalRange::from_usize(start, is_recombinant.len()));
  }
  regions
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::coord::position::PositionLike;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  // Test-scale parameters chosen so short fixtures decode with clean interval boundaries. At
  // genome scale gamma ~ 1/L makes state switches so costly that boundaries only resolve over
  // hundreds of sites (correct sticky-state behavior), which cannot be exercised on L~50 inputs.
  // Here the per-site signals are:
  //   switch cost      c   = ln((1-gamma)/gamma) = ln(0.95/0.05) ~ 2.94 nats
  //   Mut -> recombinant    = ln(mu_r/mu_w)      = ln(0.5/0.05)  ~ 2.30 nats
  //   Ref -> wildtype       = ln((1-mu_w)/(1-mu_r)) = ln(0.95/0.5) ~ 0.64 nats
  // so a block needs > ~3 Mut to overcome one switch (> ~6 to open and close an interval), and a
  // flank needs > ~5 Ref to justify switching back to wildtype.
  fn test_params() -> RecombinationHmmParams {
    RecombinationHmmParams { gamma: 0.05, mu_w: 0.05, mu_r: 0.5 }
  }

  /// Build an observation vector from a compact string: `R`=Ref, `M`=Mut, `X`=Missing.
  fn obs(s: &str) -> Vec<RecombinationObs> {
    s.chars()
      .map(|c| match c {
        'R' => RecombinationObs::Ref,
        'M' => RecombinationObs::Mut,
        'X' => RecombinationObs::Missing,
        other => panic!("unexpected observation char: {other}"),
      })
      .collect()
  }

  fn ranges(pairs: &[(usize, usize)]) -> Vec<NucRefGlobalRange> {
    pairs.iter().map(|&(b, e)| NucRefGlobalRange::from_usize(b, e)).collect()
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty(                       "",                                            &[])]
  #[case::all_ref(                     "RRRRRRRRRRRRRRRRRRRR",                        &[])]
  #[case::all_mut(                     "MMMMMMMMMM",                                  &[(0, 10)])]
  #[case::single_mut_flanked_stays_ref("RRRRRRRRRRMRRRRRRRRRR",                       &[])]
  #[case::dense_block(                 "RRRRRRRRRRMMMMMMMMMMMMMMMRRRRRRRRRR",         &[(10, 25)])]
  #[case::missing_run_no_interval(     "RRRRRRRRRRXXXXXRRRRRRRRRR",                   &[])]
  #[case::state_persists_across_missing("RRRRRMMMMMMMMMMMMMMMXXXXXMMMMMMMMMMMMMMMRRRRR", &[(5, 40)])]
  #[trace]
  fn test_recombination_find_regions(#[case] input: &str, #[case] expected: &[(usize, usize)]) {
    let regions = find_recombinant_regions(&obs(input), &test_params()).unwrap();
    assert_eq!(ranges(expected), regions);
  }

  #[test]
  fn test_recombination_regions_are_within_bounds_sorted_and_disjoint() {
    // Two Mut blocks separated by a Ref run long enough to justify two state switches
    // (a mid-sequence Ref stretch costs 2 switches, ~5.88 nats, unlike a single end flank).
    let input = obs("RRRRRMMMMMMMMMMMMMMMRRRRRRRRRRRRMMMMMMMMMMMMMMMRRRRR");
    let regions = find_recombinant_regions(&input, &test_params()).unwrap();
    assert_eq!(2, regions.len());
    let mut prev_end = 0;
    for region in &regions {
      let begin = region.begin.as_usize();
      let end = region.end.as_usize();
      assert!(begin < end, "empty region {begin}..{end}");
      assert!(end <= input.len(), "region end {end} exceeds length {}", input.len());
      assert!(begin >= prev_end, "regions overlap or are unsorted at {begin} (prev end {prev_end})");
      prev_end = end;
    }
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::gamma_zero( RecombinationHmmParams { gamma: 0.0,  mu_w: 0.005, mu_r: 0.05 })]
  #[case::gamma_one(  RecombinationHmmParams { gamma: 1.0,  mu_w: 0.005, mu_r: 0.05 })]
  #[case::mu_w_zero(  RecombinationHmmParams { gamma: 5e-4, mu_w: 0.0,   mu_r: 0.05 })]
  #[case::mu_r_one(   RecombinationHmmParams { gamma: 5e-4, mu_w: 0.005, mu_r: 1.0  })]
  #[case::mu_w_neg(   RecombinationHmmParams { gamma: 5e-4, mu_w: -0.1,  mu_r: 0.05 })]
  fn test_recombination_rejects_out_of_range_params(#[case] params: RecombinationHmmParams) {
    assert!(find_recombinant_regions(&[RecombinationObs::Mut], &params).is_err());
  }
}
