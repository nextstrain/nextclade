//! The two-state recombination HMM model: its three parameters and their invariants.
//!
//! `gamma` is the transition rate, `mu_w` and `mu_r` the wildtype and recombinant mutation emission
//! probabilities. All three are probabilities in the open interval `(0, 1)`; the model is sticky
//! (`gamma < 0.5`) and the recombinant emission rate is elevated (`mu_r > mu_w`). These invariants are
//! enforced on every construction path, so the decoder can assume validity.

use crate::analyze::recombination::observations::RecombinationObs;
use crate::make_error;
use eyre::Report;
use serde::{Deserialize, Serialize};

/// Two hidden states, used as indices into per-site score and emission arrays.
pub(crate) const WILDTYPE: usize = 0;
pub(crate) const RECOMBINANT: usize = 1;

/// Whether a value is a usable HMM probability: finite and strictly inside the open interval
/// `(0, 1)`. The closed endpoints are excluded because they produce `log(0) = -inf` in the decoder.
/// Single definition of the probability domain, shared by parameter validation and tree estimation.
pub(crate) fn is_hmm_probability(x: f64) -> bool {
  x.is_finite() && x > 0.0 && x < 1.0
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
  pub(crate) fn compute_log_emission(&self, obs: RecombinationObs) -> [f64; 2] {
    match obs {
      RecombinationObs::Ref => [(1.0 - self.mu_w).ln(), (1.0 - self.mu_r).ln()],
      RecombinationObs::Mut => [self.mu_w.ln(), self.mu_r.ln()],
      // Marginalize over missing data: emission probability 1 in both states (log 0).
      RecombinationObs::Missing => [0.0, 0.0],
    }
  }
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
