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

use crate::coord::position::{NucRefGlobalPosition, PositionLike};
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
/// returned intervals are the maximal runs of the recombinant state, as 0-based half-open ranges,
/// with each interval trimmed so its first and last positions carry evidence (are not `Missing`).
///
/// `params` are assumed valid; construct them through [`RecombinationHmmParams::new`], which is the
/// only path that reaches this function in production (a `debug_assert` guards the invariant).
pub fn find_recombinant_regions(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<NucRefGlobalRange> {
  debug_assert!(
    params.is_valid(),
    "recombination HMM params must be valid probabilities: {params:?}"
  );
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

/// Build the per-site observation vector in reference coordinates.
///
/// A position is `Mut` at a private substitution (mutations relative to the parent, which include
/// reversions), `Missing` where it is uncovered (outside the alignment) or carries no comparable
/// base (N, ambiguous character, or deletion), and `Ref` otherwise.
pub fn build_observations(
  ref_len: usize,
  alignment_range: &NucRefGlobalRange,
  missing_ranges: &[NucRefGlobalRange],
  mutated_positions: &[NucRefGlobalPosition],
) -> Vec<RecombinationObs> {
  let mut obs = vec![RecombinationObs::Missing; ref_len];

  // Covered positions start as Ref.
  for pos in alignment_range.iter() {
    if let Some(slot) = obs.get_mut(pos.as_usize()) {
      *slot = RecombinationObs::Ref;
    }
  }

  // Uncovered or non-comparable positions are Missing.
  for range in missing_ranges {
    for pos in range.iter() {
      if let Some(slot) = obs.get_mut(pos.as_usize()) {
        *slot = RecombinationObs::Missing;
      }
    }
  }

  // Substitutions relative to the parent are Mut.
  for pos in mutated_positions {
    if let Some(slot) = obs.get_mut(pos.as_usize()) {
      *slot = RecombinationObs::Mut;
    }
  }

  obs
}

/// Emission and transition parameters for the two-state recombination HMM.
///
/// All three are probabilities and must lie in the open interval `(0, 1)`; the closed endpoints
/// produce `log(0) = -inf` in the decoder.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationHmmParams {
  /// Transition rate: probability of switching state between adjacent sites.
  pub gamma: f64,
  /// Mutation emission probability in the wildtype state (background divergence).
  pub mu_w: f64,
  /// Mutation emission probability in the recombinant state (elevated divergence).
  pub mu_r: f64,
}

impl RecombinationHmmParams {
  /// Construct validated parameters. This is the only sanctioned constructor: it enforces the model
  /// invariants once, at resolution time, so the decoder can assume validity. Every field must be a
  /// probability in the open interval `(0, 1)` (the closed endpoints produce `log(0) = -inf`), and
  /// the recombinant emission rate must exceed the wildtype rate (`mu_r > mu_w`), otherwise the two
  /// states are indistinguishable.
  pub fn new(gamma: f64, mu_w: f64, mu_r: f64) -> Result<Self, Report> {
    for (name, value) in [("gamma", gamma), ("muW", mu_w), ("muR", mu_r)] {
      if !(value.is_finite() && value > 0.0 && value < 1.0) {
        return make_error!(
          "Recombination HMM parameter `{name}` must be in the open interval (0, 1), but got {value}"
        );
      }
    }
    if mu_r <= mu_w {
      return make_error!(
        "Recombination HMM requires muR > muW (elevated recombinant divergence), but got muW={mu_w} and muR={mu_r}"
      );
    }
    Ok(Self { gamma, mu_w, mu_r })
  }

  /// Whether the parameters satisfy the model invariants. Used only for debug assertions.
  fn is_valid(&self) -> bool {
    [self.gamma, self.mu_w, self.mu_r]
      .iter()
      .all(|&v| v.is_finite() && v > 0.0 && v < 1.0)
      && self.mu_r > self.mu_w
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

/// Per-sequence recombination detection result: the detected regions and their summary statistics.
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationResult {
  /// Putative recombinant intervals, as 0-based half-open reference ranges.
  pub regions: Vec<NucRefGlobalRange>,

  /// Number of recombinant regions.
  pub total_regions: usize,

  /// Total length of all recombinant regions, in nucleotides.
  pub total_length: usize,

  /// Length of the longest recombinant region, in nucleotides.
  pub longest_region: usize,
}

impl RecombinationResult {
  /// Summarize a list of decoded recombinant regions.
  pub fn from_regions(regions: Vec<NucRefGlobalRange>) -> Self {
    let total_regions = regions.len();
    let total_length = regions.iter().map(NucRefGlobalRange::len).sum();
    let longest_region = regions.iter().map(NucRefGlobalRange::len).max().unwrap_or(0);
    Self {
      regions,
      total_regions,
      total_length,
      longest_region,
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
    Self {
      enabled: true,
      gamma: None,
      mu_w: None,
      mu_r: None,
    }
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
    RecombinationHmmParams {
      gamma: 0.05,
      mu_w: 0.05,
      mu_r: 0.5,
    }
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
    pairs
      .iter()
      .map(|&(b, e)| NucRefGlobalRange::from_usize(b, e))
      .collect()
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
      assert!(
        begin >= prev_end,
        "regions overlap or are unsorted at {begin} (prev end {prev_end})"
      );
      prev_end = end;
    }
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::gamma_zero(0.0,  0.005, 0.05, "gamma")]
  #[case::gamma_one( 1.0,  0.005, 0.05, "gamma")]
  #[case::mu_w_zero( 5e-4, 0.0,   0.05, "muW")]
  #[case::mu_r_one(  5e-4, 0.005, 1.0,  "muR")]
  #[case::mu_w_neg(  5e-4, -0.1,  0.05, "muW")]
  fn test_recombination_new_rejects_out_of_range_params(
    #[case] gamma: f64,
    #[case] mu_w: f64,
    #[case] mu_r: f64,
    #[case] offending: &str,
  ) {
    let err = RecombinationHmmParams::new(gamma, mu_w, mu_r).unwrap_err().to_string();
    assert!(err.contains(offending), "error `{err}` should name the offending parameter `{offending}`");
    assert!(err.contains("open interval (0, 1)"), "error `{err}` should state the (0, 1) contract");
  }

  #[test]
  fn test_recombination_new_rejects_non_elevated_recombinant_rate() {
    // Valid probabilities, but muR does not exceed muW: the two states are indistinguishable.
    let err = RecombinationHmmParams::new(5e-4, 0.05, 0.05).unwrap_err().to_string();
    assert!(err.contains("muR > muW"), "error `{err}` should require muR > muW");
  }

  #[test]
  fn test_recombination_new_accepts_valid_params() {
    let params = RecombinationHmmParams::new(5e-4, 0.005, 0.05).unwrap();
    assert_eq!(
      RecombinationHmmParams {
        gamma: 5e-4,
        mu_w: 0.005,
        mu_r: 0.05
      },
      params
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::absent(None,                                              true)]
  #[case::default(Some(RecombinationConfig::default()),            true)]
  #[case::explicit_on(Some(RecombinationConfig { enabled: true,  ..RecombinationConfig::default() }), true)]
  #[case::explicit_off(Some(RecombinationConfig { enabled: false, ..RecombinationConfig::default() }), false)]
  fn test_recombination_config_is_enabled_default_on(#[case] config: Option<RecombinationConfig>, #[case] expected: bool) {
    assert_eq!(expected, RecombinationConfig::is_enabled(config.as_ref()));
  }

  #[rstest]
  #[case::empty_object("{}", true)]
  #[case::enabled_omitted(r#"{"gamma": 0.01}"#, true)]
  #[case::enabled_false(r#"{"enabled": false}"#, false)]
  fn test_recombination_config_serde_default_enabled(#[case] json: &str, #[case] expected: bool) {
    let config: RecombinationConfig = serde_json::from_str(json).unwrap();
    assert_eq!(expected, config.enabled);
  }

  #[test]
  fn test_recombination_build_observations_maps_coverage_and_mutations() {
    use RecombinationObs::{Missing, Mut, Ref};
    let ref_len = 10;
    let alignment_range = NucRefGlobalRange::from_usize(1, 9); // positions 0 and 9 uncovered
    let missing_ranges = vec![NucRefGlobalRange::from_usize(3, 5)]; // positions 3, 4
    let mutated: Vec<NucRefGlobalPosition> = [2, 6]
      .into_iter()
      .map(|p| NucRefGlobalPosition::from(p as isize))
      .collect();

    let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

    let expected = vec![Missing, Ref, Mut, Missing, Missing, Ref, Mut, Ref, Ref, Missing];
    assert_eq!(expected, observed);
  }

  #[test]
  fn test_recombination_result_summary() {
    let regions = ranges(&[(10, 25), (40, 50)]);
    let result = RecombinationResult::from_regions(regions.clone());
    assert_eq!(regions, result.regions);
    assert_eq!(2, result.total_regions);
    assert_eq!(25, result.total_length); // 15 + 10
    assert_eq!(15, result.longest_region);
  }

  #[test]
  fn test_recombination_result_summary_empty() {
    let result = RecombinationResult::from_regions(vec![]);
    assert_eq!(0, result.total_regions);
    assert_eq!(0, result.total_length);
    assert_eq!(0, result.longest_region);
  }
}
