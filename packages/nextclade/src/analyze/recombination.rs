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
pub(crate) const WILDTYPE: usize = 0;
pub(crate) const RECOMBINANT: usize = 1;

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
pub(crate) fn intervals_sorted_disjoint_nonempty(intervals: &[NucRefGlobalRange], len: usize) -> bool {
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
  pub(crate) fn log_emission(&self, obs: RecombinationObs) -> [f64; 2] {
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
pub(crate) fn log_sum_exp_2(a: f64, b: f64) -> f64 {
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
