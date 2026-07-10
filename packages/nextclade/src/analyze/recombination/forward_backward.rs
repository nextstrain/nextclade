//! Forward-backward scoring of decoded intervals.
//!
//! Log-space forward-backward computes per-site `P(recombinant | observations)`. Each decoded
//! interval gets a confidence score: its mean posterior marginal.

use crate::analyze::recombination::observations::RecombinationObs;
use crate::analyze::recombination::params::{RECOMBINANT, RecombinationHmmParams, WILDTYPE};
use crate::coord::position::PositionLike;
use crate::coord::range::NucRefGlobalRange;

/// Numerically stable log(exp(a) + exp(b)) for two values.
pub(crate) fn compute_log_sum_exp_2(a: f64, b: f64) -> f64 {
  let (max, min) = if a >= b { (a, b) } else { (b, a) };
  if max == f64::NEG_INFINITY {
    return f64::NEG_INFINITY;
  }
  max + (min - max).exp().ln_1p()
}

/// Forward-backward in log-space. Returns per-site `[P(wildtype), P(recombinant)]`.
///
/// Exposing both states keeps the recurrence in one implementation and lets tests compare against
/// brute-force marginalization.
pub(crate) fn compute_forward_backward_posteriors(
  obs: &[RecombinationObs],
  params: &RecombinationHmmParams,
) -> Vec<[f64; 2]> {
  let n = obs.len();
  if n == 0 {
    return vec![];
  }

  let log_stay = (1.0 - params.gamma()).ln();
  let log_switch = params.gamma().ln();
  let log_prior = 0.5_f64.ln();

  // Forward pass: log_alpha[l][k] = log P(s_1..s_l, h_l = k)
  let mut log_alpha = vec![[f64::NEG_INFINITY; 2]; n];
  let emit0 = params.compute_log_emission(obs[0]);
  log_alpha[0] = [log_prior + emit0[WILDTYPE], log_prior + emit0[RECOMBINANT]];

  for l in 1..n {
    let emit = params.compute_log_emission(obs[l]);
    log_alpha[l][WILDTYPE] = emit[WILDTYPE]
      + compute_log_sum_exp_2(
        log_alpha[l - 1][WILDTYPE] + log_stay,
        log_alpha[l - 1][RECOMBINANT] + log_switch,
      );
    log_alpha[l][RECOMBINANT] = emit[RECOMBINANT]
      + compute_log_sum_exp_2(
        log_alpha[l - 1][WILDTYPE] + log_switch,
        log_alpha[l - 1][RECOMBINANT] + log_stay,
      );
  }

  // Backward pass: log_beta[l][k] = log P(s_{l+1}..s_n | h_l = k)
  let mut log_beta = vec![[0.0; 2]; n];

  for l in (0..n - 1).rev() {
    let emit_next = params.compute_log_emission(obs[l + 1]);
    log_beta[l][WILDTYPE] = compute_log_sum_exp_2(
      log_stay + emit_next[WILDTYPE] + log_beta[l + 1][WILDTYPE],
      log_switch + emit_next[RECOMBINANT] + log_beta[l + 1][RECOMBINANT],
    );
    log_beta[l][RECOMBINANT] = compute_log_sum_exp_2(
      log_switch + emit_next[WILDTYPE] + log_beta[l + 1][WILDTYPE],
      log_stay + emit_next[RECOMBINANT] + log_beta[l + 1][RECOMBINANT],
    );
  }

  // Posteriors: P(h_l = k | s) = exp(log_alpha[l][k] + log_beta[l][k] - normalizer)
  let mut posteriors = vec![[0.0; 2]; n];
  for l in 0..n {
    let log_w = log_alpha[l][WILDTYPE] + log_beta[l][WILDTYPE];
    let log_r = log_alpha[l][RECOMBINANT] + log_beta[l][RECOMBINANT];
    let log_normalizer = compute_log_sum_exp_2(log_w, log_r);
    posteriors[l] = [(log_w - log_normalizer).exp(), (log_r - log_normalizer).exp()];
  }

  debug_assert_eq!(obs.len(), posteriors.len(), "posteriors must match observation length");
  posteriors
}

/// Per-site P(recombinant | observations). Thin projection of
/// [`compute_forward_backward_posteriors`].
pub(crate) fn compute_forward_backward_marginals(
  obs: &[RecombinationObs],
  params: &RecombinationHmmParams,
) -> Vec<f64> {
  compute_forward_backward_posteriors(obs, params)
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
      debug_assert!(
        count > 0,
        "interval must be non-empty (decoder postcondition), got empty {begin}..{end}"
      );
      let sum: f64 = marginals[begin..end].iter().sum();
      sum / count as f64
    })
    .collect()
}
