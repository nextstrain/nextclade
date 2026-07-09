//! Dataset configuration for recombination detection, as it appears in `pathogen.json`.

use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};

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
