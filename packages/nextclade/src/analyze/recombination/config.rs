//! Configuration of recombination detection: the dataset settings in `pathogen.json`, the switches of the
//! command-line interface, and the decision whether detection runs.

use clap::Parser;
use ordered_float::OrderedFloat;
use serde::{Deserialize, Serialize};
use smart_default::SmartDefault;

/// Decide whether recombination detection runs for a dataset.
///
/// The user's choice (`--with-recombination`, `--without-recombination`) overrides `recombination.enabled` of the
/// dataset. Without either, detection is off.
pub fn is_recombination_enabled(user: &RecombinationUserParams, config: Option<&RecombinationConfig>) -> bool {
  user.choice().unwrap_or_else(|| config.is_some_and(|config| config.enabled))
}

/// Dataset configuration for recombination detection (`recombination` in `pathogen.json`).
///
/// A given HMM parameter is used verbatim; an absent one is computed from the reference tree and the reference length.
#[derive(Clone, Debug, SmartDefault, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RecombinationConfig {
  /// Whether recombination detection runs for this dataset. The command-line flags `--with-recombination` and
  /// `--without-recombination` override it. When detection runs and the dataset cannot support it, the dataset fails
  /// to load.
  pub enabled: bool,

  /// State transition rate of the HMM. Absent = `0.01 / L`, where `L` is the reference length. Must be in (0, 0.5).
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 0.5))]
  pub gamma: Option<OrderedFloat<f64>>,

  /// Mutation emission probability in the wildtype state. Absent = estimated from the tree. Must be in (0, 1).
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub mu_w: Option<OrderedFloat<f64>>,

  /// Mutation emission probability in the recombinant state. Absent = estimated from the tree. Must be in (0, 1) and
  /// greater than `muW`.
  #[serde(skip_serializing_if = "Option::is_none")]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub mu_r: Option<OrderedFloat<f64>>,

  /// Minimal span of a recombinant region, in nucleotides. A shorter region is dropped.
  #[default = 50]
  pub min_region_length: usize,

  /// Maximal fraction of missing sites (`N`, other ambiguity codes, deletions, placement-masked sites) in the span of
  /// a recombinant region. A region with a higher fraction is dropped. Must be in [0, 1].
  #[default(OrderedFloat(0.5))]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub max_region_missing_fraction: OrderedFloat<f64>,

  /// Maximal total span of the recombinant regions of a sequence, as a fraction of the span of its alignment range.
  /// Above it, a sequence is recombinant almost everywhere, carries no localized signal, and gets no call. Must be in
  /// [0, 1].
  #[default(OrderedFloat(2.0 / 3.0))]
  #[schemars(range(min = 0.0, max = 1.0))]
  pub max_recombinant_fraction: OrderedFloat<f64>,
}

/// Recombination detection switches of the command-line interface. They override `recombination.enabled` of the
/// dataset (`pathogen.json`).
#[derive(Parser, Clone, Copy, Debug, Default, Eq, PartialEq, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
#[serde(default)]
pub struct RecombinationUserParams {
  /// Run recombination detection, also for datasets that do not enable it (`recombination.enabled` in
  /// `pathogen.json`). Analysis fails for a dataset that cannot support detection.
  #[clap(long, conflicts_with = "without_recombination")]
  pub with_recombination: bool,

  /// Do not run recombination detection, also for datasets that enable it (`recombination.enabled` in
  /// `pathogen.json`).
  #[clap(long)]
  pub without_recombination: bool,
}

impl RecombinationUserParams {
  /// The user's choice: `Some(true)` = on, `Some(false)` = off, `None` = the dataset decides.
  pub const fn choice(&self) -> Option<bool> {
    match (self.with_recombination, self.without_recombination) {
      (true, false) => Some(true),
      (false, true) => Some(false),
      // `clap` rejects the two flags together
      _ => None,
    }
  }
}
