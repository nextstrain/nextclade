//! HMM-based recombination detection.
//!
//! A two-state hidden Markov model (wildtype, recombinant) decoded with Viterbi. Each reference
//! site emits one of three observations relative to the sequence's inferred parent (its tree
//! attachment point): not mutated (`Ref`), mutated (`Mut`), or no usable information (`Missing`).
//! `Missing` emits probability 1 in both states (marginalization over missing data), so it adds no
//! emission evidence while transitions still cross it and the decoded state persists across missing
//! runs. Contiguous runs of the recombinant state, trimmed so their endpoints fall on covered
//! positions, are reported as putative recombinant intervals.
//!
//! The method and default parameters follow Marco Molari's prototype
//! <https://github.com/mmolari/recomb_inference> and issue #1768.

use crate::analyze::letter_ranges::NucRange;
use crate::analyze::nuc_del::NucDelRange;
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
/// `params` are always valid: [`RecombinationHmmParams`] has private fields and can only be built
/// through [`RecombinationHmmParams::new`], which enforces the model invariants.
pub fn find_recombinant_regions(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<NucRefGlobalRange> {
  let is_recombinant = viterbi_decode(obs, params);
  let intervals = extract_recombinant_intervals(&is_recombinant);
  let regions = trim_intervals_to_covered(intervals, obs);

  // Postcondition: reported regions are well-formed (non-empty, sorted, disjoint, within bounds) and
  // their endpoints carry evidence (are not `Missing`). These are the invariants downstream output and
  // the web viewer rely on; a violation is a decoder/extraction bug, not a bad input.
  debug_assert!(
    intervals_sorted_disjoint_nonempty(&regions, obs.len()),
    "recombinant regions must be non-empty, sorted, disjoint and within bounds: {regions:?}"
  );
  debug_assert!(
    regions.iter().all(|r| {
      let covered = |i: usize| obs.get(i).is_some_and(|o| *o != RecombinationObs::Missing);
      covered(r.begin.as_usize()) && covered(r.end.as_usize() - 1)
    }),
    "recombinant region endpoints must fall on covered positions: {regions:?}"
  );
  regions
}

/// Whether a list of reference ranges is well-formed as a set of decoded regions: every range is
/// non-empty (`begin < end`), stays within `[0, len)`, and the ranges are sorted and pairwise
/// disjoint (`prev.end <= next.begin`). Debug-assertion helper only.
fn intervals_sorted_disjoint_nonempty(intervals: &[NucRefGlobalRange], len: usize) -> bool {
  let mut prev_end = 0;
  intervals.iter().all(|r| {
    let (begin, end) = (r.begin.as_usize(), r.end.as_usize());
    let ok = begin < end && end <= len && begin >= prev_end;
    prev_end = end;
    ok
  })
}

/// Trim each interval so its endpoints fall on covered positions, dropping leading and trailing
/// `Missing` runs (uncovered flanks and deletions relative to the reference). Internal `Missing`
/// stretches stay bridged: the recombinant call already spans them, and the issue asks specifically
/// to avoid annotating leading and trailing deletion ranges, not internal ones. An interval with no
/// covered position (all `Missing`) carries no evidence and is dropped.
fn trim_intervals_to_covered(intervals: Vec<NucRefGlobalRange>, obs: &[RecombinationObs]) -> Vec<NucRefGlobalRange> {
  let covered = |i: usize| obs.get(i).is_some_and(|o| *o != RecombinationObs::Missing);
  intervals
    .into_iter()
    .filter_map(|range| {
      let (begin, end) = (range.begin.as_usize(), range.end.as_usize());
      let first = (begin..end).find(|&i| covered(i))?;
      let last = (begin..end).rev().find(|&i| covered(i))?;
      Some(NucRefGlobalRange::from_usize(first, last + 1))
    })
    .collect()
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

/// Assemble the non-comparable reference ranges handed to [`build_observations`] as `missing`.
///
/// These are all the positions that carry no usable evidence relative to the parent: missing (`N`)
/// runs, non-ACGTN ambiguous runs, deletions, and placement-masked sites. The placement mask is
/// included because a masked position that differs from the parent would otherwise be scored as `Mut`
/// and could manufacture a false recombinant call at a homoplasic site. Extracted from the
/// per-sequence pipeline so this chaining is guarded by a direct test rather than an inline closure.
pub fn recombination_missing_ranges(
  missing: &[NucRange],
  non_acgtns: &[NucRange],
  deletions: &[NucDelRange],
  masked: &[NucRefGlobalRange],
) -> Vec<NucRefGlobalRange> {
  missing
    .iter()
    .map(|r| r.range().clone())
    .chain(non_acgtns.iter().map(|r| r.range().clone()))
    .chain(deletions.iter().map(|d| d.range().clone()))
    .chain(masked.iter().cloned())
    .collect()
}

/// Build the per-site observation vector in reference coordinates.
///
/// A position is `Mut` at a private substitution (mutations relative to the parent, which include
/// reversions), `Missing` where it is uncovered (outside the alignment) or carries no comparable
/// base (N, ambiguous character, deletion, or placement-masked site), and `Ref` otherwise.
/// `Missing` is final: a non-comparable position stays `Missing` even if a mutation also maps to it,
/// because missing data must not contribute to the likelihood.
pub fn build_observations(
  ref_len: usize,
  alignment_range: &NucRefGlobalRange,
  missing_ranges: &[NucRefGlobalRange],
  mutated_positions: &[NucRefGlobalPosition],
) -> Vec<RecombinationObs> {
  let mut obs = vec![RecombinationObs::Missing; ref_len];

  // 1. Covered positions start as Ref.
  for pos in alignment_range.iter() {
    if let Some(slot) = obs.get_mut(pos.as_usize()) {
      *slot = RecombinationObs::Ref;
    }
  }

  // 2. Substitutions relative to the parent. Applied before missing so that
  //    non-comparable positions (step 3) take precedence.
  for pos in mutated_positions {
    if let Some(slot) = obs.get_mut(pos.as_usize()) {
      *slot = RecombinationObs::Mut;
    }
  }

  // 3. Non-comparable positions are Missing (final). N, deletion, ambiguous,
  //    placement-masked, or outside alignment. This stage is last so it
  //    overrides any mutation at a non-comparable position (missing data must
  //    not contribute to the likelihood).
  for range in missing_ranges {
    for pos in range.iter() {
      if let Some(slot) = obs.get_mut(pos.as_usize()) {
        *slot = RecombinationObs::Missing;
      }
    }
  }

  // Postcondition: one observation per reference position, so the decoded state vector aligns with
  // reference coordinates and out-of-range mutations/ranges never grow the vector.
  debug_assert_eq!(
    ref_len,
    obs.len(),
    "observation vector must have one entry per reference position"
  );
  obs
}

/// Emission and transition parameters for the two-state recombination HMM.
///
/// All three are probabilities and must lie in the open interval `(0, 1)`; the closed endpoints
/// produce `log(0) = -inf` in the decoder.
///
/// Fields are private and reachable only through [`RecombinationHmmParams::new`], which enforces the
/// model invariants, so an invalid instance cannot be constructed. Read access is through the
/// getters. `Deserialize` is derived plain: this type is only ever deserialized from Nextclade's own
/// already-validated output (the WASM boundary and `ResultsJson`), never from user input, which
/// enters through [`RecombinationConfig`].
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationHmmParams {
  /// Transition rate: probability of switching state between adjacent sites.
  gamma: f64,
  /// Mutation emission probability in the wildtype state (background divergence).
  mu_w: f64,
  /// Mutation emission probability in the recombinant state (elevated divergence).
  mu_r: f64,
}

/// Whether a value is a usable HMM probability: finite and strictly inside the open interval
/// `(0, 1)`. The closed endpoints are excluded because they produce `log(0) = -inf` in the decoder.
/// Single definition of the probability domain, shared by parameter validation and tree estimation.
pub(crate) fn is_hmm_probability(x: f64) -> bool {
  x.is_finite() && x > 0.0 && x < 1.0
}

impl RecombinationHmmParams {
  /// Construct validated parameters. This is the only sanctioned constructor: it enforces the model
  /// invariants once, at resolution time, so the decoder can assume validity. See [`Self::validate`]
  /// for the full contract.
  pub fn new(gamma: f64, mu_w: f64, mu_r: f64) -> Result<Self, Report> {
    let params = Self { gamma, mu_w, mu_r };
    params.validate()?;
    Ok(params)
  }

  /// Transition rate: probability of switching state between adjacent sites.
  pub const fn gamma(&self) -> f64 {
    self.gamma
  }

  /// Mutation emission probability in the wildtype state (background divergence).
  pub const fn mu_w(&self) -> f64 {
    self.mu_w
  }

  /// Mutation emission probability in the recombinant state (elevated divergence).
  pub const fn mu_r(&self) -> f64 {
    self.mu_r
  }

  /// Single source of truth for the model invariants. Every field must be a probability in the open
  /// interval `(0, 1)` (the closed endpoints produce `log(0) = -inf`); the model must be sticky
  /// (`gamma < 0.5`, so switching is rarer than staying, otherwise the states alternate and no stable
  /// interval is decoded); and the recombinant emission rate must exceed the wildtype rate
  /// (`mu_r > mu_w`), otherwise the two states are indistinguishable.
  fn validate(&self) -> Result<(), Report> {
    let Self { gamma, mu_w, mu_r } = *self;
    for (name, value) in [("gamma", gamma), ("muW", mu_w), ("muR", mu_r)] {
      if !is_hmm_probability(value) {
        return make_error!(
          "Recombination HMM parameter `{name}` must be in the open interval (0, 1), but got {value}"
        );
      }
    }
    if gamma >= 0.5 {
      return make_error!(
        "Recombination HMM requires gamma < 0.5 (state switching must be rarer than staying), but got gamma={gamma}"
      );
    }
    if mu_r <= mu_w {
      return make_error!("Recombination HMM requires muR > muW (elevated recombinant divergence), but got muW={mu_w} and muR={mu_r}");
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

/// A single putative recombinant interval with its range and nucleotide length.
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationRegion {
  pub range: NucRefGlobalRange,
  pub length: usize,
}

/// Per-sequence recombination detection result: the detected regions and their summary statistics.
///
/// Always contains at least one region. When detection runs but finds no recombinant intervals the
/// caller produces `None` rather than an empty `RecombinationResult`.
#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationResult {
  /// Putative recombinant intervals.
  pub regions: Vec<RecombinationRegion>,

  /// Number of recombinant regions.
  pub total_regions: usize,

  /// Total length of all recombinant regions, in nucleotides.
  pub total_length: usize,

  /// The longest recombinant region.
  pub longest_region: RecombinationRegion,
}

impl RecombinationResult {
  /// Summarize a list of decoded recombinant ranges. Returns `None` when the list is empty
  /// (detection ran but found no recombinant intervals).
  pub fn from_ranges(ranges: Vec<NucRefGlobalRange>) -> Option<Self> {
    if ranges.is_empty() {
      return None;
    }
    let regions: Vec<RecombinationRegion> = ranges
      .into_iter()
      .map(|range| {
        let length = range.len();
        RecombinationRegion { range, length }
      })
      .collect();
    let total_regions = regions.len();
    let total_length = regions.iter().map(|r| r.length).sum();
    let longest_region = regions.iter().max_by_key(|r| r.length).unwrap().clone();
    Some(Self {
      regions,
      total_regions,
      total_length,
      longest_region,
    })
  }
}

/// Dataset configuration for recombination detection, as it appears in `pathogen.json`.
///
/// Each parameter is optional and resolved independently: a value given here is used verbatim,
/// otherwise a fallback is computed from the reference and reference tree (`gamma = 1 / ref_len`,
/// `mu_w`/`mu_r` estimated from the tree). An absent config object, or one with `enabled` omitted,
/// leaves the feature enabled (see `RecombinationConfig::is_enabled`).
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RecombinationConfig {
  /// Whether recombination detection runs for this dataset.
  ///
  /// Three states: `None` (field absent) is the default-on behavior; `Some(true)` is an explicit
  /// opt-in; `Some(false)` disables detection. The explicit opt-in is distinguished from the default
  /// so that a dataset that asks for detection but cannot support it (a tree too thin to estimate the
  /// parameters) surfaces one skip warning, while the silent default stays silent.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub enabled: Option<bool>,

  /// State transition rate override. When absent, defaults to `1 / ref_len`.
  /// Must be in the open interval (0, 1) and less than 0.5. The runtime enforces this; the schema
  /// bound is inclusive because `schemars` cannot express exclusive bounds.
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub gamma: Option<OrderedFloat<f64>>,

  /// Wildtype mutation emission probability override. When absent, estimated from the tree.
  /// Must be in the open interval (0, 1). The runtime enforces this; the schema bound is inclusive
  /// because `schemars` cannot express exclusive bounds.
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub mu_w: Option<OrderedFloat<f64>>,

  /// Recombinant mutation emission probability override. When absent, estimated from the tree.
  /// Must be in the open interval (0, 1) and greater than `muW`. The runtime enforces this; the
  /// schema bound is inclusive because `schemars` cannot express exclusive bounds.
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub mu_r: Option<OrderedFloat<f64>>,
}

impl RecombinationConfig {
  /// Effective enablement for an optional config: enabled unless explicitly disabled (`Some(false)`).
  /// An absent config object, or one with `enabled` omitted, is default-on.
  pub fn is_enabled(config: Option<&RecombinationConfig>) -> bool {
    config.is_none_or(|c| c.enabled != Some(false))
  }

  /// Whether detection was explicitly requested (`enabled: true`), as opposed to left on by default.
  /// Only an explicit request warrants a skip warning when the tree cannot support detection.
  pub fn is_explicitly_enabled(config: Option<&RecombinationConfig>) -> bool {
    config.and_then(|c| c.enabled) == Some(true)
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

  // Postcondition: exactly one decoded state per observation.
  debug_assert_eq!(
    obs.len(),
    is_recombinant.len(),
    "decoded state vector must match observation length"
  );
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

  // Postcondition: maximal runs are non-empty, sorted, disjoint and within the decoded vector.
  debug_assert!(
    intervals_sorted_disjoint_nonempty(&regions, is_recombinant.len()),
    "extracted intervals must be non-empty, sorted, disjoint and within bounds: {regions:?}"
  );
  regions
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::alphabet::nuc::Nuc;
  use pretty_assertions::assert_eq;
  use rand::rngs::StdRng;
  use rand::{Rng, SeedableRng};
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
  #[trace]
  fn test_recombination_find_regions(#[case] input: &str, #[case] expected: &[(usize, usize)]) {
    let regions = find_recombinant_regions(&obs(input), &test_params());
    assert_eq!(ranges(expected), regions);
  }

  #[rustfmt::skip]
  #[rstest]
  // Trailing Missing (uncovered flank or deletion) must not extend the reported interval past the
  // last covered position; leading Missing must not push the start earlier. Internal Missing bridges.
  #[case::trailing_missing_trimmed("RRRRRMMMMMMMMMMMMMMMXXXXX",      &[(5, 20)])]
  #[case::internal_missing_bridged("RRRRRMMMMMMMMMMMMMMMXXXXXMMMMMMMMMMMMMMMRRRRR", &[(5, 40)])]
  #[trace]
  fn test_recombination_intervals_trimmed_to_covered(#[case] input: &str, #[case] expected: &[(usize, usize)]) {
    let regions = find_recombinant_regions(&obs(input), &test_params());
    assert_eq!(ranges(expected), regions);
  }

  #[test]
  fn test_recombination_regions_are_within_bounds_sorted_and_disjoint() {
    // Two Mut blocks separated by a Ref run long enough to justify two state switches
    // (a mid-sequence Ref stretch costs 2 switches, ~5.88 nats, unlike a single end flank).
    let input = obs("RRRRRMMMMMMMMMMMMMMMRRRRRRRRRRRRMMMMMMMMMMMMMMMRRRRR");
    let regions = find_recombinant_regions(&input, &test_params());
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
  fn test_recombination_new_rejects_high_gamma() {
    // Valid probability but not a sticky HMM: switching is at least as likely as staying.
    let err = RecombinationHmmParams::new(0.5, 0.005, 0.05).unwrap_err().to_string();
    assert!(err.contains("gamma < 0.5"), "error `{err}` should require gamma < 0.5");
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
      RecombinationHmmParams { gamma: 5e-4, mu_w: 0.005, mu_r: 0.05 },
      params
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::zero(         0.0,               false)]
  #[case::one(          1.0,               false)]
  #[case::negative(    -0.1,               false)]
  #[case::above_one(    1.5,               false)]
  #[case::nan(          f64::NAN,          false)]
  #[case::pos_inf(      f64::INFINITY,     false)]
  #[case::neg_inf(      f64::NEG_INFINITY, false)]
  #[case::tiny(         1e-9,              true)]
  #[case::half(         0.5,               true)]
  #[case::near_one(     0.999_999,         true)]
  fn test_recombination_is_hmm_probability_bounds(#[case] value: f64, #[case] expected: bool) {
    assert_eq!(expected, is_hmm_probability(value));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::absent(None,                                                                                      true)]
  #[case::default(Some(RecombinationConfig::default()),                                                     true)]
  #[case::explicit_on(Some(RecombinationConfig { enabled: Some(true),  ..RecombinationConfig::default() }), true)]
  #[case::explicit_off(Some(RecombinationConfig { enabled: Some(false), ..RecombinationConfig::default() }), false)]
  fn test_recombination_config_is_enabled_default_on(#[case] config: Option<RecombinationConfig>, #[case] expected: bool) {
    assert_eq!(expected, RecombinationConfig::is_enabled(config.as_ref()));
  }

  #[rustfmt::skip]
  #[rstest]
  // is_explicitly_enabled is true ONLY for `enabled: true`; the default-on states (absent config or
  // omitted `enabled`) are not explicit, so they do not warrant a skip warning.
  #[case::absent(None,                                                                                       false)]
  #[case::default(Some(RecombinationConfig::default()),                                                      false)]
  #[case::explicit_on(Some(RecombinationConfig { enabled: Some(true),  ..RecombinationConfig::default() }),  true)]
  #[case::explicit_off(Some(RecombinationConfig { enabled: Some(false), ..RecombinationConfig::default() }), false)]
  fn test_recombination_config_is_explicitly_enabled(#[case] config: Option<RecombinationConfig>, #[case] expected: bool) {
    assert_eq!(expected, RecombinationConfig::is_explicitly_enabled(config.as_ref()));
  }

  #[rustfmt::skip]
  #[rstest]
  // `enabled` is Option<bool>: absent or omitted deserializes to None (default-on), only an explicit
  // value is Some. `is_enabled` treats None and Some(true) as enabled, Some(false) as disabled.
  #[case::empty_object("{}",                    None,        true)]
  #[case::enabled_omitted(r#"{"gamma": 0.01}"#, None,        true)]
  #[case::enabled_true(r#"{"enabled": true}"#,  Some(true),  true)]
  #[case::enabled_false(r#"{"enabled": false}"#, Some(false), false)]
  fn test_recombination_config_serde_default_enabled(#[case] json: &str, #[case] enabled: Option<bool>, #[case] is_enabled: bool) {
    let config: RecombinationConfig = serde_json::from_str(json).unwrap();
    assert_eq!(enabled, config.enabled);
    assert_eq!(is_enabled, RecombinationConfig::is_enabled(Some(&config)));
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
  fn test_recombination_build_observations_missing_wins_over_mut_and_ignores_out_of_range() {
    use RecombinationObs::{Missing, Ref};
    let ref_len = 8;
    let alignment_range = NucRefGlobalRange::from_usize(0, 8);
    let missing_ranges = vec![NucRefGlobalRange::from_usize(2, 5)]; // positions 2, 3, 4 missing
    // A mutation inside a missing range (position 3) resolves to Missing: non-comparable positions
    // are final and must not contribute to the likelihood. A mutation outside the reference (position
    // 20) is ignored rather than panicking or extending the vector.
    let mutated: Vec<NucRefGlobalPosition> = [3, 20]
      .into_iter()
      .map(|p| NucRefGlobalPosition::from(p as isize))
      .collect();

    let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

    let expected = vec![Ref, Ref, Missing, Missing, Missing, Ref, Ref, Ref];
    assert_eq!(expected, observed);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty(                &[],               10, true)]
  #[case::single(               &[(2, 5)],         10, true)]
  #[case::sorted_disjoint(      &[(2, 5), (7, 9)], 10, true)]
  #[case::touching_endpoints(   &[(2, 5), (5, 9)], 10, true)]  // half-open: prev.end == next.begin is disjoint
  #[case::empty_range(          &[(5, 5)],         10, false)] // begin == end
  #[case::out_of_bounds(        &[(2, 12)],        10, false)] // end > len
  #[case::unsorted(             &[(7, 9), (2, 5)], 10, false)]
  #[case::overlapping(          &[(2, 6), (5, 9)], 10, false)] // next.begin < prev.end
  fn test_recombination_intervals_sorted_disjoint_nonempty(
    #[case] pairs: &[(usize, usize)],
    #[case] len: usize,
    #[case] expected: bool,
  ) {
    assert_eq!(expected, intervals_sorted_disjoint_nonempty(&ranges(pairs), len));
  }

  #[test]
  fn test_recombination_result_summary() {
    let input = ranges(&[(10, 25), (40, 50)]);
    let result = RecombinationResult::from_ranges(input).unwrap();
    assert_eq!(2, result.regions.len());
    assert_eq!(NucRefGlobalRange::from_usize(10, 25), result.regions[0].range);
    assert_eq!(15, result.regions[0].length);
    assert_eq!(NucRefGlobalRange::from_usize(40, 50), result.regions[1].range);
    assert_eq!(10, result.regions[1].length);
    assert_eq!(2, result.total_regions);
    assert_eq!(25, result.total_length); // 15 + 10
    assert_eq!(NucRefGlobalRange::from_usize(10, 25), result.longest_region.range);
    assert_eq!(15, result.longest_region.length);
  }

  #[test]
  fn test_recombination_result_empty_returns_none() {
    assert!(RecombinationResult::from_ranges(vec![]).is_none());
  }

  fn nuc_range(begin: usize, end: usize) -> NucRange {
    NucRange {
      range: NucRefGlobalRange::from_usize(begin, end),
      letter: Nuc::N,
    }
  }

  // T2 wiring (guards C2): the assembled missing set must contain every input range, including the
  // placement-masked ranges. Removing the `masked` term from `recombination_missing_ranges` drops
  // the masked range and fails this test, so the mask chaining cannot silently regress.
  #[test]
  fn test_recombination_missing_ranges_includes_masked() {
    let missing = vec![nuc_range(0, 2)];
    let non_acgtns = vec![nuc_range(10, 11)];
    let deletions = vec![NucDelRange::from_usize(20, 22)];
    let masked = ranges(&[(30, 33)]);

    let assembled = recombination_missing_ranges(&missing, &non_acgtns, &deletions, &masked);

    // Order is missing, then non-ACGTN, then deletions, then masked.
    let expected = ranges(&[(0, 2), (10, 11), (20, 22), (30, 33)]);
    assert_eq!(expected, assembled);
    assert!(
      assembled.contains(&NucRefGlobalRange::from_usize(30, 33)),
      "assembled missing set must contain the placement-masked range"
    );
  }

  // T2 precedence (guards C4): fed through the same chain as `nextclade_run_one`, a position that is
  // both masked and mutated resolves to `Missing`; an unmasked mutation resolves to `Mut`; positions
  // outside the alignment are `Missing`; and the vector length equals `ref_len`. Reverting C4 (Missing
  // before Mut) makes the masked+mutated position decode to `Mut` and fails this test.
  #[test]
  fn test_recombination_build_observations_masked_mutation_is_missing() {
    use RecombinationObs::{Missing, Mut, Ref};
    let ref_len = 10;
    let alignment_range = NucRefGlobalRange::from_usize(1, 9); // positions 0 and 9 outside the alignment
    let masked = ranges(&[(4, 5)]); // position 4 is placement-masked
    let missing_ranges = recombination_missing_ranges(&[], &[], &[], &masked);
    // Position 4 is masked and mutated; position 6 is mutated but not masked.
    let mutated: Vec<NucRefGlobalPosition> = [4, 6]
      .into_iter()
      .map(|p| NucRefGlobalPosition::from(p as isize))
      .collect();

    let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

    let expected = vec![Missing, Ref, Ref, Ref, Missing, Ref, Mut, Ref, Ref, Missing];
    assert_eq!(expected, observed);
    assert_eq!(ref_len, observed.len());
  }

  // T3 Property A: structural invariants of the decoded regions hold for any observation vector and any
  // valid parameters. Property B: a planted recombinant block is recovered. Parameters are built valid
  // by construction (gamma < 0.5, 0 < mu_w < mu_r < 1) and through `new().unwrap()` -- a failure there
  // means the model preconditions drifted.
  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(1000))]

    #[test]
    fn test_prop_recombination_regions_well_formed(
      observations in proptest::collection::vec(
        proptest::prop_oneof![
          proptest::prelude::Just(RecombinationObs::Ref),
          proptest::prelude::Just(RecombinationObs::Mut),
          proptest::prelude::Just(RecombinationObs::Missing),
        ],
        1..500_usize,
      ),
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      // gamma < 0.5; mu_w in (0, 0.5); mu_r = mu_w + offset in (mu_w, 1). All satisfy `new` by construction.
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let regions = find_recombinant_regions(&observations, &params);

      let mut prev_end = 0;
      for region in &regions {
        let (begin, end) = (region.begin.as_usize(), region.end.as_usize());
        proptest::prop_assert!(begin < end, "empty region {begin}..{end}");
        proptest::prop_assert!(end <= observations.len(), "region {begin}..{end} out of bounds");
        proptest::prop_assert!(begin >= prev_end, "regions unsorted or overlapping at {begin}");
        proptest::prop_assert_ne!(observations[begin], RecombinationObs::Missing, "begin endpoint is Missing");
        proptest::prop_assert_ne!(observations[end - 1], RecombinationObs::Missing, "end endpoint is Missing");
        prev_end = end;
      }
    }

    #[test]
    fn test_prop_recombination_recovers_planted_block(seed in proptest::prelude::any::<u64>()) {
      // Strong separation so recovery is near-certain: a 200-site recombinant block at mu_r = 0.6 in a
      // wildtype background at mu_w = 0.01. Emissions are sampled from a seeded RNG (the forward model);
      // the decoder under test is Viterbi, a different algorithm, so this is not circular.
      let params = RecombinationHmmParams::new(0.01, 0.01, 0.6).unwrap();
      let len = 600_usize;
      let block = 200_usize..400;
      let mut rng = StdRng::seed_from_u64(seed);
      let observations: Vec<RecombinationObs> = (0..len)
        .map(|i| {
          let rate = if block.contains(&i) { 0.6 } else { 0.01 };
          if rng.gen_bool(rate) {
            RecombinationObs::Mut
          } else {
            RecombinationObs::Ref
          }
        })
        .collect();

      let regions = find_recombinant_regions(&observations, &params);

      // At least one decoded region overlaps the planted block's core [250, 350). Overlap only, never
      // exact per-site equality: Viterbi recovery is probabilistic even under strong signal.
      let (core_begin, core_end) = (250_usize, 350);
      let overlaps = regions.iter().any(|r| {
        let (begin, end) = (r.begin.as_usize(), r.end.as_usize());
        begin < core_end && core_begin < end
      });
      proptest::prop_assert!(overlaps, "no decoded region overlaps the planted block; regions={:?}", regions);
    }
  }

  #[test]
  fn test_recombination_metamorphic_all_ref_yields_no_regions() {
    // An all-Ref vector carries no recombinant signal, so no region is decoded, for any valid params.
    let params = RecombinationHmmParams::new(0.01, 0.01, 0.6).unwrap();
    let observations = vec![RecombinationObs::Ref; 500];
    assert_eq!(
      Vec::<NucRefGlobalRange>::new(),
      find_recombinant_regions(&observations, &params)
    );
  }
}
