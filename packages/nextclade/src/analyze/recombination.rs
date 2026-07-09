//! HMM-based recombination detection.
//!
//! A two-state hidden Markov model (wildtype, recombinant) decoded with Viterbi and optionally
//! scored with forward-backward. Each reference site emits one of three observations relative to
//! the sequence's inferred parent (its tree attachment point): not mutated (`Ref`), mutated
//! (`Mut`), or no usable information (`Missing`). `Missing` emits probability 1 in both states
//! (marginalization over missing data), so it adds no emission evidence while transitions still
//! cross it and the decoded state persists across missing runs. Contiguous runs of the recombinant
//! state, trimmed so their endpoints fall on covered positions, are reported as putative
//! recombinant intervals. When forward-backward is run, each interval receives a confidence score
//! (mean posterior marginal probability of the recombinant state).

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
/// stretches stay bridged: the recombinant call already spans them, and only leading and trailing
/// deletion ranges should be excluded from the annotation, not internal ones. An interval with no
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

/// Effective recombination HMM parameters used for a run.
///
/// All three are probabilities between 0 and 1 (exclusive). `gamma` is the transition rate, `muW` and
/// `muR` are the wildtype and recombinant mutation emission probabilities, with `muR` greater than
/// `muW`.
//
// Fields are private and every construction path enforces the model invariants: `new` validates
// directly, and deserialization routes through `RecombinationHmmParamsRaw` + `TryFrom` so a JSON
// document cannot produce an invalid instance either. Read access is through the getters.
#[derive(Debug, Clone, Copy, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase", try_from = "RecombinationHmmParamsRaw")]
pub struct RecombinationHmmParams {
  /// Transition rate: probability of switching state between adjacent sites.
  gamma: f64,
  /// Mutation emission probability in the wildtype state (background divergence).
  mu_w: f64,
  /// Mutation emission probability in the recombinant state (elevated divergence).
  mu_r: f64,
}

/// Unvalidated wire form of [`RecombinationHmmParams`]. Deserialization goes through this type and the
/// [`TryFrom`] below so the model invariants hold for values parsed from JSON, not only those built
/// with [`RecombinationHmmParams::new`].
#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct RecombinationHmmParamsRaw {
  gamma: f64,
  mu_w: f64,
  mu_r: f64,
}

impl TryFrom<RecombinationHmmParamsRaw> for RecombinationHmmParams {
  type Error = Report;
  fn try_from(raw: RecombinationHmmParamsRaw) -> Result<Self, Self::Error> {
    Self::new(raw.gamma, raw.mu_w, raw.mu_r)
  }
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
      return make_error!(
        "Recombination HMM requires muR > muW (elevated recombinant divergence), but got muW={mu_w} and muR={mu_r}"
      );
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

/// A single putative recombinant interval with its range, nucleotide length, and optional
/// forward-backward confidence score.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct RecombinationRegion {
  pub range: NucRefGlobalRange,
  pub length: usize,
  /// Mean posterior P(recombinant) from forward-backward within this interval.
  #[serde(default, skip_serializing_if = "Option::is_none")]
  pub confidence: Option<f64>,
}

/// Per-sequence recombination detection result: the detected regions and their summary statistics.
///
/// Always contains at least one region. When detection runs but finds no recombinant intervals the
/// caller produces `None` rather than an empty `RecombinationResult`.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
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
  /// Summarize decoded recombinant ranges with optional per-interval confidence scores.
  /// Returns `None` when the list is empty (detection ran but found no recombinant intervals).
  pub fn from_ranges(ranges: Vec<NucRefGlobalRange>, confidences: Option<&[f64]>) -> Option<Self> {
    if ranges.is_empty() {
      return None;
    }
    debug_assert!(
      confidences.is_none_or(|c| c.len() == ranges.len()),
      "confidences length must match ranges length"
    );
    let regions: Vec<RecombinationRegion> = ranges
      .into_iter()
      .enumerate()
      .map(|(i, range)| {
        let length = range.len();
        let confidence = confidences.map(|c| c[i]);
        RecombinationRegion {
          range,
          length,
          confidence,
        }
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

/// Default minimum number of private substitutions a sequence must carry for detection to run.
///
/// One private substitution is the smallest count that can carry any recombinant evidence: a sequence
/// with zero private substitutions has an all-`Ref`/`Missing` observation vector, so the recombinant
/// state can never outscore wildtype and the result is always empty. Skipping that case is exact, not
/// a heuristic. Raising the threshold above 1 trades sensitivity for speed and is a per-dataset choice.
pub const DEFAULT_MIN_PRIVATE_SUBS_TO_RUN: usize = 1;

/// Dataset configuration for recombination detection, as it appears in `pathogen.json`.
///
/// Each field is optional. The HMM parameters are resolved independently: a value given here is used
/// verbatim, otherwise a fallback is computed from the reference and reference tree. An absent config
/// object, or one with `enabled` omitted, leaves the feature enabled (see `is_enabled`).
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RecombinationConfig {
  /// Whether recombination detection runs for this dataset.
  ///
  /// When the field is absent, detection is on by default; `true` opts in explicitly; `false` disables
  /// it. An explicit `true` is treated as a hard requirement: if the dataset cannot support detection
  /// (for example it has no reference tree, or a tree too thin to estimate the parameters), that is a
  /// dataset-level error rather than a silent skip. The default-on case skips silently instead.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub enabled: Option<bool>,

  /// Minimum number of private substitutions (relative to the inferred parent) a sequence must carry
  /// for detection to run on it. Sequences below this threshold produce no recombination result.
  /// Defaults to 1 when absent, which skips only sequences that carry no recombinant signal at all.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub min_private_subs_to_run: Option<usize>,

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
  /// An explicit request that cannot be honored is an error, not a silent skip.
  pub fn is_explicitly_enabled(config: Option<&RecombinationConfig>) -> bool {
    config.and_then(|c| c.enabled) == Some(true)
  }

  /// The configured minimum private-substitution count to run detection, or the default when unset.
  pub fn min_private_subs_to_run(config: Option<&RecombinationConfig>) -> usize {
    config
      .and_then(|c| c.min_private_subs_to_run)
      .unwrap_or(DEFAULT_MIN_PRIVATE_SUBS_TO_RUN)
  }
}

/// Numerically stable log(exp(a) + exp(b)) for two values.
fn log_sum_exp_2(a: f64, b: f64) -> f64 {
  let (max, min) = if a >= b { (a, b) } else { (b, a) };
  if max == f64::NEG_INFINITY {
    return f64::NEG_INFINITY;
  }
  max + (min - max).exp().ln_1p()
}

/// Forward-backward algorithm in log-space. Returns, per site, the full posterior distribution
/// `[P(wildtype | observations), P(recombinant | observations)]`.
///
/// Exposing both states (rather than only the recombinant marginal) keeps the alpha/beta recurrence
/// in a single implementation and lets tests check the posteriors against an independent brute-force
/// marginalization, instead of re-deriving the same math in the test.
pub(crate) fn forward_backward_posteriors(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<[f64; 2]> {
  let n = obs.len();
  if n == 0 {
    return vec![];
  }

  let log_stay = (1.0 - params.gamma).ln();
  let log_switch = params.gamma.ln();
  let log_prior = 0.5_f64.ln();

  // Forward pass: log_alpha[l][k] = log P(s_1..s_l, h_l = k)
  let mut log_alpha = vec![[f64::NEG_INFINITY; 2]; n];
  let emit0 = params.log_emission(obs[0]);
  log_alpha[0] = [log_prior + emit0[WILDTYPE], log_prior + emit0[RECOMBINANT]];

  for l in 1..n {
    let emit = params.log_emission(obs[l]);
    log_alpha[l][WILDTYPE] = emit[WILDTYPE]
      + log_sum_exp_2(
        log_alpha[l - 1][WILDTYPE] + log_stay,
        log_alpha[l - 1][RECOMBINANT] + log_switch,
      );
    log_alpha[l][RECOMBINANT] = emit[RECOMBINANT]
      + log_sum_exp_2(
        log_alpha[l - 1][WILDTYPE] + log_switch,
        log_alpha[l - 1][RECOMBINANT] + log_stay,
      );
  }

  // Backward pass: log_beta[l][k] = log P(s_{l+1}..s_n | h_l = k)
  let mut log_beta = vec![[0.0; 2]; n];

  for l in (0..n - 1).rev() {
    let emit_next = params.log_emission(obs[l + 1]);
    log_beta[l][WILDTYPE] = log_sum_exp_2(
      log_stay + emit_next[WILDTYPE] + log_beta[l + 1][WILDTYPE],
      log_switch + emit_next[RECOMBINANT] + log_beta[l + 1][RECOMBINANT],
    );
    log_beta[l][RECOMBINANT] = log_sum_exp_2(
      log_switch + emit_next[WILDTYPE] + log_beta[l + 1][WILDTYPE],
      log_stay + emit_next[RECOMBINANT] + log_beta[l + 1][RECOMBINANT],
    );
  }

  // Posteriors: P(h_l = k | s) = exp(log_alpha[l][k] + log_beta[l][k] - normalizer)
  let mut posteriors = vec![[0.0; 2]; n];
  for l in 0..n {
    let log_w = log_alpha[l][WILDTYPE] + log_beta[l][WILDTYPE];
    let log_r = log_alpha[l][RECOMBINANT] + log_beta[l][RECOMBINANT];
    let log_normalizer = log_sum_exp_2(log_w, log_r);
    posteriors[l] = [(log_w - log_normalizer).exp(), (log_r - log_normalizer).exp()];
  }

  debug_assert_eq!(obs.len(), posteriors.len(), "posteriors must match observation length");
  posteriors
}

/// Forward-backward algorithm in log-space. Returns per-site P(recombinant | observations), the
/// recombinant marginal used to score decoded intervals. Thin projection of
/// [`forward_backward_posteriors`] so the recurrence has a single implementation.
pub(crate) fn forward_backward_marginals(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<f64> {
  forward_backward_posteriors(obs, params)
    .into_iter()
    .map(|posterior| posterior[RECOMBINANT])
    .collect()
}

/// Mean P(recombinant) within each interval, as a confidence score per region.
pub(crate) fn compute_interval_confidences(marginals: &[f64], intervals: &[NucRefGlobalRange]) -> Vec<f64> {
  intervals
    .iter()
    .map(|r| {
      let (begin, end) = (r.begin.as_usize(), r.end.as_usize());
      let count = end - begin;
      if count == 0 {
        return 0.0;
      }
      let sum: f64 = marginals[begin..end].iter().sum();
      sum / count as f64
    })
    .collect()
}

/// Viterbi decoding in log-space. Returns, per site, whether the most likely state is recombinant.
pub(crate) fn viterbi_decode(obs: &[RecombinationObs], params: &RecombinationHmmParams) -> Vec<bool> {
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
  use crate::{assert_error, pretty_assert_abs_diff_eq};
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
    RecombinationHmmParams::new(0.05, 0.05, 0.5).unwrap()
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
  #[case::gamma_zero(0.0,  0.005, 0.05, "Recombination HMM parameter `gamma` must be in the open interval (0, 1), but got 0")]
  #[case::gamma_one( 1.0,  0.005, 0.05, "Recombination HMM parameter `gamma` must be in the open interval (0, 1), but got 1")]
  #[case::mu_w_zero( 5e-4, 0.0,   0.05, "Recombination HMM parameter `muW` must be in the open interval (0, 1), but got 0")]
  #[case::mu_r_one(  5e-4, 0.005, 1.0,  "Recombination HMM parameter `muR` must be in the open interval (0, 1), but got 1")]
  #[case::mu_w_neg(  5e-4, -0.1,  0.05, "Recombination HMM parameter `muW` must be in the open interval (0, 1), but got -0.1")]
  fn test_recombination_new_rejects_out_of_range_params(
    #[case] gamma: f64,
    #[case] mu_w: f64,
    #[case] mu_r: f64,
    #[case] expected: &str,
  ) {
    assert_error!(RecombinationHmmParams::new(gamma, mu_w, mu_r), expected);
  }

  #[test]
  fn test_recombination_new_rejects_high_gamma() {
    // Valid probability but not a sticky HMM: switching is at least as likely as staying.
    assert_error!(
      RecombinationHmmParams::new(0.5, 0.005, 0.05),
      "Recombination HMM requires gamma < 0.5 (state switching must be rarer than staying), but got gamma=0.5"
    );
  }

  #[test]
  fn test_recombination_new_rejects_non_elevated_recombinant_rate() {
    // Valid probabilities, but muR does not exceed muW: the two states are indistinguishable.
    assert_error!(
      RecombinationHmmParams::new(5e-4, 0.05, 0.05),
      "Recombination HMM requires muR > muW (elevated recombinant divergence), but got muW=0.05 and muR=0.05"
    );
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

  #[test]
  fn test_recombination_hmm_params_try_from_rejects_invalid() {
    // Deserialization routes through TryFrom, which enforces the same invariants as `new`:
    // gamma >= 0.5 is not a sticky HMM.
    let raw = RecombinationHmmParamsRaw {
      gamma: 0.7,
      mu_w: 0.05,
      mu_r: 0.2,
    };
    assert_error!(
      RecombinationHmmParams::try_from(raw),
      "Recombination HMM requires gamma < 0.5 (state switching must be rarer than staying), but got gamma=0.7"
    );
  }

  #[test]
  fn test_recombination_hmm_params_deserialize_rejects_invalid() {
    // The serde path fails too (message carries serde's positional suffix, so only assert it errors).
    let json = r#"{"gamma":0.7,"muW":0.05,"muR":0.2}"#;
    serde_json::from_str::<RecombinationHmmParams>(json).expect_err("serde should reject invalid params");
  }

  #[test]
  fn test_recombination_hmm_params_deserialize_roundtrip_valid() {
    let params = RecombinationHmmParams::new(5e-4, 0.005, 0.05).unwrap();
    let json = serde_json::to_string(&params).unwrap();
    let back: RecombinationHmmParams = serde_json::from_str(&json).unwrap();
    assert_eq!(params, back);
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

  fn region(begin: usize, end: usize, confidence: Option<f64>) -> RecombinationRegion {
    RecombinationRegion {
      range: NucRefGlobalRange::from_usize(begin, end),
      length: end - begin,
      confidence,
    }
  }

  #[test]
  fn test_recombination_result_summary() {
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25), (40, 50)]), None).unwrap();
    let expected = RecombinationResult {
      regions: vec![region(10, 25, None), region(40, 50, None)],
      total_regions: 2,
      total_length: 25, // 15 + 10
      longest_region: region(10, 25, None),
    };
    assert_eq!(expected, result);
  }

  #[test]
  fn test_recombination_result_empty_returns_none() {
    assert!(RecombinationResult::from_ranges(vec![], None).is_none());
  }

  fn nuc_range(begin: usize, end: usize) -> NucRange {
    NucRange {
      range: NucRefGlobalRange::from_usize(begin, end),
      letter: Nuc::N,
    }
  }

  // The assembled missing set must contain every input range, including the placement-masked ranges.
  // Dropping the `masked` term from `recombination_missing_ranges` would fail this test, so the mask
  // chaining cannot silently regress.
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

  // Fed through the same chain as `nextclade_run_one`, a position that is both masked and mutated
  // resolves to `Missing`; an unmasked mutation resolves to `Mut`; positions outside the alignment are
  // `Missing`; and the vector length equals `ref_len`. If missing ranges stopped taking precedence over
  // mutations, the masked+mutated position would decode to `Mut` and fail this test.
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

  // Two properties: structural invariants of the decoded regions hold for any observation vector and
  // any valid parameters, and a planted recombinant block is recovered. Parameters are built valid by
  // construction (gamma < 0.5, 0 < mu_w < mu_r < 1) and through `new().unwrap()` -- a failure there
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

  // --- Forward-backward and confidence tests ---

  #[rustfmt::skip]
  #[rstest]
  #[case::equal(      0.0,   0.0,                2.0_f64.ln()                   )] // ln(exp(0)+exp(0)) = ln(2)
  #[case::large_diff( 100.0, 0.0,                100.0                          )] // dominated by max
  #[case::one_neg_inf(5.0,   f64::NEG_INFINITY,  5.0                            )]
  #[case::symmetric(  3.0,   5.0,                5.0 + (-2.0_f64).exp().ln_1p() )]
  #[trace]
  fn test_recombination_log_sum_exp_2(#[case] a: f64, #[case] b: f64, #[case] expected: f64) {
    pretty_assert_abs_diff_eq!(expected, log_sum_exp_2(a, b), epsilon = 1e-12);
  }

  #[test]
  fn test_recombination_log_sum_exp_2_both_neg_inf() {
    let result = log_sum_exp_2(f64::NEG_INFINITY, f64::NEG_INFINITY);
    assert!(
      result.is_infinite() && result.is_sign_negative(),
      "expected -inf, got {result}"
    );
  }

  #[test]
  fn test_recombination_log_sum_exp_2_matches_naive() {
    for &(a, b) in &[
      (1.0_f64, 2.0_f64),
      (0.0, 0.0),
      (-1.0, -2.0),
      (10.0, 10.0),
      (-50.0, -51.0),
    ] {
      let naive = (a.exp() + b.exp()).ln();
      pretty_assert_abs_diff_eq!(naive, log_sum_exp_2(a, b), epsilon = 1e-10);
    }
  }

  #[test]
  fn test_recombination_forward_backward_empty() {
    assert!(forward_backward_marginals(&[], &test_params()).is_empty());
  }

  #[test]
  fn test_recombination_forward_backward_all_ref_near_zero() {
    let marginals = forward_backward_marginals(&obs("RRRRRRRRRRRRRRRRRRRR"), &test_params());
    for &m in &marginals {
      assert!(m < 0.1, "all-Ref site should have low P(recombinant), got {m}");
    }
  }

  #[test]
  fn test_recombination_forward_backward_all_mut_near_one() {
    let marginals = forward_backward_marginals(&obs("MMMMMMMMMMMMMMMMMMMM"), &test_params());
    for &m in &marginals {
      assert!(m > 0.9, "all-Mut site should have high P(recombinant), got {m}");
    }
  }

  #[test]
  fn test_recombination_forward_backward_dense_block() {
    let marginals = forward_backward_marginals(&obs("RRRRRRRRRRMMMMMMMMMMMMMMMRRRRRRRRRR"), &test_params());
    // Interior of Mut block [12..23] should have high marginals.
    for &m in &marginals[12..23] {
      assert!(m > 0.8, "interior Mut site should be high, got {m}");
    }
    // Ref flanks [0..5] and [29..34] should have low marginals.
    for &m in &marginals[0..5] {
      assert!(m < 0.2, "Ref flank site should be low, got {m}");
    }
    for &m in &marginals[29..34] {
      assert!(m < 0.2, "Ref flank site should be low, got {m}");
    }
  }

  #[test]
  fn test_recombination_forward_backward_missing_run_persists() {
    // Mut block with Missing run in the middle -- marginals should stay elevated across the hole.
    let marginals = forward_backward_marginals(&obs("RRRRRMMMMMMMMMMMMMMMXXXXXMMMMMMMMMMMMMMMRRRRR"), &test_params());
    // Middle of the Missing run (positions 22-23) should still show elevated marginals.
    for &m in &marginals[22..24] {
      assert!(
        m > 0.5,
        "Missing-bridged site should maintain elevated marginal, got {m}"
      );
    }
  }

  #[test]
  fn test_recombination_forward_backward_marginals_sum_to_one() {
    // P(wildtype) + P(recombinant) = 1 at every site. We compute the wildtype marginal separately
    // to verify the normalization.
    let observations = obs("RRRRRRMMMMMMMMMMMRRRRRR");
    let params = test_params();
    let n = observations.len();

    let log_stay = (1.0 - params.gamma).ln();
    let log_switch = params.gamma.ln();
    let log_prior = 0.5_f64.ln();

    let mut log_alpha = vec![[f64::NEG_INFINITY; 2]; n];
    let emit0 = params.log_emission(observations[0]);
    log_alpha[0] = [log_prior + emit0[WILDTYPE], log_prior + emit0[RECOMBINANT]];
    for l in 1..n {
      let emit = params.log_emission(observations[l]);
      log_alpha[l][WILDTYPE] = emit[WILDTYPE]
        + log_sum_exp_2(
          log_alpha[l - 1][WILDTYPE] + log_stay,
          log_alpha[l - 1][RECOMBINANT] + log_switch,
        );
      log_alpha[l][RECOMBINANT] = emit[RECOMBINANT]
        + log_sum_exp_2(
          log_alpha[l - 1][WILDTYPE] + log_switch,
          log_alpha[l - 1][RECOMBINANT] + log_stay,
        );
    }

    let mut log_beta = vec![[0.0; 2]; n];
    for l in (0..n - 1).rev() {
      let emit_next = params.log_emission(observations[l + 1]);
      log_beta[l][WILDTYPE] = log_sum_exp_2(
        log_stay + emit_next[WILDTYPE] + log_beta[l + 1][WILDTYPE],
        log_switch + emit_next[RECOMBINANT] + log_beta[l + 1][RECOMBINANT],
      );
      log_beta[l][RECOMBINANT] = log_sum_exp_2(
        log_switch + emit_next[WILDTYPE] + log_beta[l + 1][WILDTYPE],
        log_stay + emit_next[RECOMBINANT] + log_beta[l + 1][RECOMBINANT],
      );
    }

    for l in 0..n {
      let log_w = log_alpha[l][WILDTYPE] + log_beta[l][WILDTYPE];
      let log_r = log_alpha[l][RECOMBINANT] + log_beta[l][RECOMBINANT];
      let log_norm = log_sum_exp_2(log_w, log_r);
      let p_w = (log_w - log_norm).exp();
      let p_r = (log_r - log_norm).exp();
      pretty_assert_abs_diff_eq!(1.0, p_w + p_r, epsilon = 1e-10);
    }
  }

  #[test]
  fn test_recombination_compute_interval_confidences_single() {
    let marginals = vec![0.1, 0.2, 0.9, 0.95, 0.92, 0.3, 0.1];
    let intervals = ranges(&[(2, 5)]);
    let confidences = compute_interval_confidences(&marginals, &intervals);
    // Mean of [0.9, 0.95, 0.92] = 2.77 / 3 = 0.9233...
    assert_eq!(1, confidences.len());
    pretty_assert_abs_diff_eq!(0.923_333_333, confidences[0], epsilon = 1e-8);
  }

  #[test]
  fn test_recombination_compute_interval_confidences_multiple() {
    let marginals = vec![0.9, 0.8, 0.1, 0.1, 0.7, 0.85];
    let intervals = ranges(&[(0, 2), (4, 6)]);
    let confidences = compute_interval_confidences(&marginals, &intervals);
    assert_eq!(2, confidences.len());
    pretty_assert_abs_diff_eq!(0.85, confidences[0], epsilon = 1e-10); // mean(0.9, 0.8)
    pretty_assert_abs_diff_eq!(0.775, confidences[1], epsilon = 1e-10); // mean(0.7, 0.85)
  }

  #[test]
  fn test_recombination_result_with_confidences() {
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25), (40, 50)]), Some(&[0.95, 0.82])).unwrap();
    let expected = RecombinationResult {
      regions: vec![region(10, 25, Some(0.95)), region(40, 50, Some(0.82))],
      total_regions: 2,
      total_length: 25,
      longest_region: region(10, 25, Some(0.95)),
    };
    assert_eq!(expected, result);
  }

  #[test]
  fn test_recombination_result_serde_round_trip_with_confidences() {
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25)]), Some(&[0.95])).unwrap();
    let json = serde_json::to_string(&result).unwrap();
    assert!(json.contains("confidence"), "JSON should contain confidence: {json}");
    let deserialized: RecombinationResult = serde_json::from_str(&json).unwrap();
    assert_eq!(result.regions[0].confidence, deserialized.regions[0].confidence);
  }

  #[test]
  fn test_recombination_result_serde_round_trip_without_confidences() {
    let result = RecombinationResult::from_ranges(ranges(&[(10, 25)]), None).unwrap();
    let json = serde_json::to_string(&result).unwrap();
    assert!(
      !json.contains("confidence"),
      "JSON should omit confidence when None: {json}"
    );
    let deserialized: RecombinationResult = serde_json::from_str(&json).unwrap();
    assert_eq!(None, deserialized.regions[0].confidence);
  }

  // Property: forward-backward marginals are always in [0, 1] for any valid params and observations.
  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(500))]

    #[test]
    fn test_prop_recombination_forward_backward_marginals_bounded(
      observations in proptest::collection::vec(
        proptest::prop_oneof![
          proptest::prelude::Just(RecombinationObs::Ref),
          proptest::prelude::Just(RecombinationObs::Mut),
          proptest::prelude::Just(RecombinationObs::Missing),
        ],
        1..200_usize,
      ),
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let marginals = forward_backward_marginals(&observations, &params);
      proptest::prop_assert_eq!(observations.len(), marginals.len());
      for (l, &m) in marginals.iter().enumerate() {
        proptest::prop_assert!((0.0..=1.0).contains(&m), "marginal at {l} out of [0,1]: {m}");
      }
    }
  }

  #[test]
  fn test_recombination_integration_confidence_populated_when_regions_exist() {
    let observations = obs("RRRRRRRRRRMMMMMMMMMMMMMMMRRRRRRRRRR");
    let params = test_params();
    let regions = find_recombinant_regions(&observations, &params);
    assert!(!regions.is_empty(), "should find at least one region");
    let marginals = forward_backward_marginals(&observations, &params);
    let confidences = compute_interval_confidences(&marginals, &regions);
    assert_eq!(regions.len(), confidences.len());
    for &c in &confidences {
      assert!(c > 0.5, "confidence for a strong Mut block should be high, got {c}");
    }
  }

  #[test]
  fn test_recombination_integration_no_confidence_when_no_regions() {
    let observations = obs("RRRRRRRRRRRRRRRRRRRR");
    let params = test_params();
    let regions = find_recombinant_regions(&observations, &params);
    assert!(regions.is_empty());
    assert!(RecombinationResult::from_ranges(regions, None).is_none());
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::absent(         None,                                   1)]
  #[case::field_omitted(  Some(RecombinationConfig::default()),   1)]
  #[case::explicit_one(   Some(cfg_min_subs(1)),                  1)]
  #[case::explicit_three( Some(cfg_min_subs(3)),                  3)]
  #[case::explicit_zero(  Some(cfg_min_subs(0)),                  0)]
  fn test_recombination_config_min_private_subs_to_run(#[case] config: Option<RecombinationConfig>, #[case] expected: usize) {
    assert_eq!(expected, RecombinationConfig::min_private_subs_to_run(config.as_ref()));
  }

  fn cfg_min_subs(n: usize) -> RecombinationConfig {
    RecombinationConfig {
      min_private_subs_to_run: Some(n),
      ..RecombinationConfig::default()
    }
  }

  /// Total log-probability of a hidden-state path under the model: uniform prior, per-site emissions,
  /// and per-step transitions. Independent of the Viterbi implementation, so it is a valid oracle.
  fn path_log_prob(obs: &[RecombinationObs], states: &[bool], params: &RecombinationHmmParams) -> f64 {
    let log_stay = (1.0 - params.gamma()).ln();
    let log_switch = params.gamma().ln();
    let state_idx = |recombinant: bool| if recombinant { RECOMBINANT } else { WILDTYPE };
    let mut total = 0.5_f64.ln() + params.log_emission(obs[0])[state_idx(states[0])];
    for l in 1..obs.len() {
      total += if states[l] == states[l - 1] {
        log_stay
      } else {
        log_switch
      };
      total += params.log_emission(obs[l])[state_idx(states[l])];
    }
    total
  }

  #[rstest]
  #[case::all_ref("RRRRRRRR")]
  #[case::all_mut("MMMMMMMM")]
  #[case::single_mut("RRRMRRRR")]
  #[case::block("RRMMMMRR")]
  #[case::two_blocks("MMRRMMRR")]
  #[case::with_missing("RRMMXXMMRR")]
  #[case::alternating("RMRMRMRM")]
  fn test_recombination_viterbi_matches_bruteforce_oracle(#[case] input: &str) {
    // For short vectors, enumerate all 2^L hidden-state paths and confirm the Viterbi-decoded path
    // achieves the maximum path log-probability. This pins decoder optimality (recurrence, backtrace,
    // initialization) against an independent brute-force search, not against the decoder itself.
    let params = test_params();
    let observations = obs(input);
    let n = observations.len();
    assert!(n <= 12, "brute-force oracle is only tractable for short vectors");

    let decoded = viterbi_decode(&observations, &params);
    let decoded_score = path_log_prob(&observations, &decoded, &params);

    let best_score = (0..(1_u32 << n))
      .map(|mask| {
        let path: Vec<bool> = (0..n).map(|i| (mask >> i) & 1 == 1).collect();
        path_log_prob(&observations, &path, &params)
      })
      .fold(f64::NEG_INFINITY, f64::max);

    pretty_assert_abs_diff_eq!(best_score, decoded_score, epsilon = 1e-9);
  }

  // Viterbi optimality as a property: over random short observation vectors AND random valid
  // parameters, the decoded path attains the maximum log-probability among all 2^L hidden paths. The
  // fixed-case oracle above pins a handful of vectors at one parameter set; randomizing both the
  // observations and the transition/emission costs exercises the tie policy and recurrence across the
  // whole parameter regime, not just the test-scale point. Brute force is an independent oracle (an
  // exhaustive search, not the Viterbi recurrence), so agreement is a real correctness signal.
  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(256))]

    #[test]
    fn test_prop_recombination_viterbi_matches_bruteforce(
      observations in proptest::collection::vec(
        proptest::prop_oneof![
          proptest::prelude::Just(RecombinationObs::Ref),
          proptest::prelude::Just(RecombinationObs::Mut),
          proptest::prelude::Just(RecombinationObs::Missing),
        ],
        1..=12_usize,
      ),
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let decoded = viterbi_decode(&observations, &params);
      let decoded_score = path_log_prob(&observations, &decoded, &params);

      let n = observations.len();
      let best_score = (0..(1_u32 << n))
        .map(|mask| {
          let path: Vec<bool> = (0..n).map(|i| (mask >> i) & 1 == 1).collect();
          path_log_prob(&observations, &path, &params)
        })
        .fold(f64::NEG_INFINITY, f64::max);

      proptest::prop_assert!(
        (best_score - decoded_score).abs() < 1e-9,
        "viterbi path not optimal: decoded={decoded_score} best={best_score}"
      );
    }
  }

  proptest::proptest! {
    #![proptest_config(proptest::prelude::ProptestConfig::with_cases(512))]

    // log_sum_exp_2 reproduces the naive log(exp(a) + exp(b)) on a range where the naive form does not
    // overflow, so the numerically stable kernel is pinned to its mathematical definition.
    #[test]
    fn test_prop_recombination_log_sum_exp_2_matches_naive(a in -30.0_f64..30.0, b in -30.0_f64..30.0) {
      let naive = (a.exp() + b.exp()).ln();
      let lse = log_sum_exp_2(a, b);
      proptest::prop_assert!((naive - lse).abs() < 1e-9, "naive={naive} lse={lse}");
    }

    // log_sum_exp_2 is symmetric in its arguments (bit-identical under swap) and never falls below the
    // larger operand, both required for the forward-backward recursions that consume it.
    #[test]
    fn test_prop_recombination_log_sum_exp_2_commutative_and_lower_bounded(a in -1e6_f64..1e6, b in -1e6_f64..1e6) {
      proptest::prop_assert_eq!(log_sum_exp_2(a, b).to_bits(), log_sum_exp_2(b, a).to_bits());
      proptest::prop_assert!(log_sum_exp_2(a, b) >= a.max(b), "lse below max for a={a} b={b}");
    }

    // build_observations always emits exactly one observation per reference position (so the decoded
    // state vector stays in reference coordinates), and every position inside a missing range resolves
    // to Missing regardless of any mutation mapped there -- missing data must not enter the likelihood.
    // Out-of-range mutations and ranges are absorbed without panicking or growing the vector.
    #[test]
    fn test_prop_recombination_build_observations_length_and_missing_precedence(
      ref_len in 1_usize..300,
      align_a in 0_usize..300,
      align_b in 0_usize..300,
      missing in proptest::collection::vec((0_usize..350, 0_usize..350), 0..20),
      muts in proptest::collection::vec(0_usize..350, 0..40),
    ) {
      let (lo, hi) = (align_a.min(align_b), align_a.max(align_b));
      let alignment_range = NucRefGlobalRange::from_usize(lo, hi);
      let missing_ranges: Vec<NucRefGlobalRange> = missing
        .iter()
        .map(|&(x, y)| NucRefGlobalRange::from_usize(x.min(y), x.max(y)))
        .collect();
      let mutated: Vec<NucRefGlobalPosition> = muts.iter().map(|&p| NucRefGlobalPosition::from(p as isize)).collect();

      let observed = build_observations(ref_len, &alignment_range, &missing_ranges, &mutated);

      proptest::prop_assert_eq!(observed.len(), ref_len);
      for range in &missing_ranges {
        // Clamp the range to the reference so an out-of-range missing range checks only its in-bounds part.
        let end = range.end.as_usize().min(ref_len);
        let begin = range.begin.as_usize().min(end);
        for (offset, obs_at) in observed[begin..end].iter().enumerate() {
          proptest::prop_assert_eq!(*obs_at, RecombinationObs::Missing, "missing precedence violated at {}", begin + offset);
        }
      }
    }

    // RecombinationResult summary fields are consistent with the input ranges: region count matches,
    // total length is the sum of per-region lengths, each region length equals its range span, and the
    // longest region has the maximum length. An empty range list produces None, not an empty result.
    #[test]
    fn test_prop_recombination_result_summary_consistent(
      items in proptest::collection::vec((0_usize..1000, 1_usize..500, 0.0_f64..=1.0), 1..30),
    ) {
      let ranges: Vec<NucRefGlobalRange> = items
        .iter()
        .map(|&(begin, span, _)| NucRefGlobalRange::from_usize(begin, begin + span))
        .collect();
      let confidences: Vec<f64> = items.iter().map(|&(_, _, c)| c).collect();

      let result = RecombinationResult::from_ranges(ranges.clone(), Some(&confidences)).unwrap();

      proptest::prop_assert_eq!(result.total_regions, ranges.len());
      proptest::prop_assert_eq!(result.regions.len(), ranges.len());
      // Expected totals derive from the generated spans (each range is `begin..begin + span`, so its
      // length is `span`), an oracle independent of the `NucRefGlobalRange::len` used in production.
      let expected_total: usize = items.iter().map(|&(_, span, _)| span).sum();
      proptest::prop_assert_eq!(result.total_length, expected_total);
      let max_len = items.iter().map(|&(_, span, _)| span).max().unwrap();
      proptest::prop_assert_eq!(result.longest_region.length, max_len);
      for (region, range) in result.regions.iter().zip(&ranges) {
        proptest::prop_assert_eq!(region.length, range.len());
        proptest::prop_assert_eq!(&region.range, range);
      }
      proptest::prop_assert!(RecombinationResult::from_ranges(vec![], None).is_none());
    }

    // An all-Missing observation vector carries no emission evidence, so with a uniform prior and
    // symmetric transitions the posterior is exactly 0.5 at every site for any valid parameters. This
    // is an analytic fixed point of forward-backward independent of length, complementing the bounded
    // marginals property.
    #[test]
    fn test_prop_recombination_forward_backward_all_missing_marginals_half(
      len in 1_usize..200,
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let observations = vec![RecombinationObs::Missing; len];
      let marginals = forward_backward_marginals(&observations, &params);
      for (l, &m) in marginals.iter().enumerate() {
        proptest::prop_assert!((m - 0.5).abs() < 1e-9, "all-Missing marginal at {} not 0.5: {}", l, m);
      }
    }

    // A per-interval confidence is the mean posterior within the interval, so it must lie between the
    // minimum and maximum marginal over that interval (and stay in [0, 1] when the marginals do). A
    // summary that averaged the wrong slice would escape these bounds.
    #[test]
    fn test_prop_recombination_compute_interval_confidences_bounded_by_slice(
      marginals in proptest::collection::vec(0.0_f64..=1.0, 1..200),
      raw_intervals in proptest::collection::vec((proptest::prelude::any::<usize>(), proptest::prelude::any::<usize>()), 0..8),
    ) {
      let n = marginals.len();
      let intervals: Vec<NucRefGlobalRange> = raw_intervals
        .iter()
        .map(|&(a, b)| {
          let begin = a % n;
          let end = begin + 1 + (b % (n - begin));
          NucRefGlobalRange::from_usize(begin, end)
        })
        .collect();

      let confidences = compute_interval_confidences(&marginals, &intervals);

      proptest::prop_assert_eq!(confidences.len(), intervals.len());
      for (conf, iv) in confidences.iter().zip(&intervals) {
        let slice = &marginals[iv.begin.as_usize()..iv.end.as_usize()];
        let mn = slice.iter().copied().fold(f64::INFINITY, f64::min);
        let mx = slice.iter().copied().fold(f64::NEG_INFINITY, f64::max);
        proptest::prop_assert!(*conf >= mn - 1e-12 && *conf <= mx + 1e-12, "conf {} outside [{}, {}]", conf, mn, mx);
        proptest::prop_assert!((0.0..=1.0).contains(conf), "conf {} out of [0, 1]", conf);
      }
    }

    // Valid parameters survive a JSON round-trip, including the TryFrom validation on the way back in,
    // recovering each rate to within a couple of ULPs. The round-trip is not bit-exact: serde_json's
    // default float parser (the `float_roundtrip` feature is off) reparses the shortest decimal to
    // within one ULP, so the correct invariant is ULP-bounded closeness, not equality. The fixed-value
    // example pins one point; this covers the whole valid regime.
    #[test]
    fn test_prop_recombination_params_serde_roundtrip(
      gamma in 1e-6_f64..0.5,
      mu_w in 1e-6_f64..0.5,
      offset in 1e-6_f64..0.5,
    ) {
      let params = RecombinationHmmParams::new(gamma, mu_w, mu_w + offset).unwrap();
      let json = serde_json::to_string(&params).unwrap();
      let back: RecombinationHmmParams = serde_json::from_str(&json).unwrap();
      proptest::prop_assert!(approx::ulps_eq!(params.gamma(), back.gamma(), max_ulps = 2), "gamma drift: {} vs {}", params.gamma(), back.gamma());
      proptest::prop_assert!(approx::ulps_eq!(params.mu_w(), back.mu_w(), max_ulps = 2), "muW drift: {} vs {}", params.mu_w(), back.mu_w());
      proptest::prop_assert!(approx::ulps_eq!(params.mu_r(), back.mu_r(), max_ulps = 2), "muR drift: {} vs {}", params.mu_r(), back.mu_r());
    }
  }
}
