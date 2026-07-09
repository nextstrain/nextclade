//! Two-state recombination HMM: `gamma` (transition rate), `mu_w` and `mu_r` (emission
//! probabilities). All in (0, 1); sticky (`gamma < 0.5`); elevated recombinant rate (`mu_r > mu_w`).
//! Invariants enforced on every construction path.

use crate::analyze::recombination::observations::RecombinationObs;
use crate::make_error;
use eyre::Report;
use serde::{Deserialize, Serialize};

/// Two hidden states, used as indices into per-site score and emission arrays.
pub(crate) const WILDTYPE: usize = 0;
pub(crate) const RECOMBINANT: usize = 1;

/// Finite and strictly in (0, 1). Endpoints produce `log(0) = -inf` in the decoder.
pub(crate) fn is_hmm_probability(x: f64) -> bool {
  x.is_finite() && x > 0.0 && x < 1.0
}

/// Validated recombination HMM parameters. `gamma` (transition), `muW`/`muR` (emission),
/// all in (0, 1), `muR > muW`.
//
// Private fields. `new` validates directly; deserialization routes through `TryFrom`.
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

impl RecombinationHmmParams {
  /// Construct validated parameters. Only sanctioned constructor.
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

  /// Model invariants: all fields in (0, 1), `gamma < 0.5` (sticky), `mu_r > mu_w` (elevated).
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
  pub(crate) fn compute_log_emission(&self, obs: RecombinationObs) -> [f64; 2] {
    match obs {
      RecombinationObs::Ref => [(1.0 - self.mu_w).ln(), (1.0 - self.mu_r).ln()],
      RecombinationObs::Mut => [self.mu_w.ln(), self.mu_r.ln()],
      // Marginalize over missing data: emission probability 1 in both states (log 0).
      RecombinationObs::Missing => [0.0, 0.0],
    }
  }
}

/// Unvalidated wire form. Deserialization goes through this + `TryFrom` to enforce invariants.
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
