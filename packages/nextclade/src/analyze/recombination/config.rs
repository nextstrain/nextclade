//! Dataset configuration for recombination detection, as it appears in `pathogen.json`.

use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};

/// Minimum private substitutions for detection to run. Zero subs = all-Ref/Missing observation
/// vector, so the recombinant state can never outscore wildtype. Skipping is exact, not heuristic.
pub const DEFAULT_MIN_PRIVATE_SUBS_TO_RUN: usize = 1;

/// Dataset configuration for recombination detection (`pathogen.json`).
///
/// Each field is optional. A given value is used verbatim; otherwise a fallback is computed from the
/// reference tree. Absent config or omitted `enabled` leaves detection on (see `is_enabled`).
#[derive(Clone, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RecombinationConfig {
  /// Whether recombination detection runs. Absent = on by default; `true` = explicit opt-in (failure
  /// to support detection is an error, not a silent skip); `false` = disabled.
  #[serde(skip_serializing_if = "Option::is_none")]
  pub enabled: Option<bool>,

  /// Minimum private substitutions for detection to run. Defaults to 1 (skips sequences with no
  /// recombinant signal).
  #[serde(skip_serializing_if = "Option::is_none")]
  pub min_private_subs_to_run: Option<usize>,

  /// State transition rate override. Absent = `1 / ref_len`. Must be in (0, 0.5).
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 0.5))]
  pub gamma: Option<OrderedFloat<f64>>,

  /// Wildtype emission probability override. Absent = estimated from tree. Must be in (0, 1).
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub mu_w: Option<OrderedFloat<f64>>,

  /// Recombinant emission probability override. Absent = estimated from tree. Must be in (0, 1)
  /// and greater than `muW`.
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub mu_r: Option<OrderedFloat<f64>>,
}

impl RecombinationConfig {
  /// Enabled unless explicitly disabled (`Some(false)`). Absent config = default-on.
  pub fn is_enabled(config: Option<&RecombinationConfig>) -> bool {
    config.is_none_or(|c| c.enabled != Some(false))
  }

  /// Whether detection was explicitly requested (`enabled: true`). An explicit request that cannot
  /// be honored is an error, not a silent skip.
  pub fn is_explicitly_enabled(config: Option<&RecombinationConfig>) -> bool {
    config.and_then(|c| c.enabled) == Some(true)
  }

  /// Configured minimum private-sub count, or default when unset.
  pub fn min_private_subs_to_run(config: Option<&RecombinationConfig>) -> usize {
    config
      .and_then(|c| c.min_private_subs_to_run)
      .unwrap_or(DEFAULT_MIN_PRIVATE_SUBS_TO_RUN)
  }
}
