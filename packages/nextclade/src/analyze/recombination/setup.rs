//! Per-dataset setup of recombination detection, resolved once when the dataset loads.

use crate::analyze::recombination::call_qc::RecombinationCallQcConfig;
use crate::analyze::recombination::config::RecombinationConfig;
use crate::analyze::recombination::estimate::resolve_recombination_params;
use crate::analyze::recombination::params::RecombinationHmmParams;
use crate::make_error;
use crate::qc::qc_config::QcConfig;
use crate::tree::tree::AuspiceGraph;
use eyre::{Report, WrapErr};

/// Resolve the recombination detection settings of a dataset. `None` when detection is off.
///
/// When detection is on, every reason that blocks it is an error that names the cause: no reference tree, an invalid
/// setting, a parameter that the tree cannot estimate, or no private mutations QC rule.
pub fn resolve_recombination_setup(
  is_enabled: bool,
  config: Option<&RecombinationConfig>,
  graph: Option<&AuspiceGraph>,
  qc_config: Option<&QcConfig>,
  ref_len: usize,
) -> Result<Option<RecombinationSetup>, Report> {
  if !is_enabled {
    return Ok(None);
  }
  resolve_enabled(config, graph, qc_config, ref_len)
    .wrap_err(
      "Recombination detection is enabled for this dataset, but cannot run. To analyze without it, remove \
       `recombination.enabled` from pathogen.json or pass `--without-recombination`",
    )
    .map(Some)
}

/// Recombination detection settings of one dataset.
#[derive(Clone, Debug, PartialEq)]
pub struct RecombinationSetup {
  /// HMM parameters
  pub params: RecombinationHmmParams,
  /// Settings of the checks of the decoded calls
  pub call_qc: RecombinationCallQcConfig,
}

fn resolve_enabled(
  config: Option<&RecombinationConfig>,
  graph: Option<&AuspiceGraph>,
  qc_config: Option<&QcConfig>,
  ref_len: usize,
) -> Result<RecombinationSetup, Report> {
  let Some(graph) = graph else {
    return make_error!(
      "No reference tree is available, and recombination detection requires one to derive parent-relative mutations"
    );
  };
  let default_config = RecombinationConfig::default();
  let config = config.unwrap_or(&default_config);
  let params = resolve_recombination_params(Some(config), graph, ref_len)?;
  let call_qc = resolve_call_qc(config, qc_config)?;
  Ok(RecombinationSetup { params, call_qc })
}

fn resolve_call_qc(
  config: &RecombinationConfig,
  qc_config: Option<&QcConfig>,
) -> Result<RecombinationCallQcConfig, Report> {
  let max_region_missing_fraction =
    validate_fraction("maxRegionMissingFraction", config.max_region_missing_fraction.0)?;
  let max_recombinant_fraction = validate_fraction("maxRecombinantFraction", config.max_recombinant_fraction.0)?;
  let Some(private_mutations) = qc_config
    .map(|qc_config| &qc_config.private_mutations)
    .filter(|private_mutations| private_mutations.enabled)
  else {
    return make_error!(
      "Recombination detection checks the rest of each sequence outside the recombinant regions with the private \
       mutations QC rule, but the rule is absent or disabled. Configure `qc.privateMutations` in pathogen.json"
    );
  };
  Ok(RecombinationCallQcConfig {
    min_region_length: config.min_region_length,
    max_region_missing_fraction,
    max_recombinant_fraction,
    private_mutations: private_mutations.clone(),
  })
}

/// Validate a fraction in `pathogen.json`: it must be in the closed interval [0, 1].
fn validate_fraction(name: &str, value: f64) -> Result<f64, Report> {
  if !(0.0..=1.0).contains(&value) {
    return make_error!(
      "`recombination.{name}` in pathogen.json must be in the closed interval [0, 1], but got {value}"
    );
  }
  Ok(value)
}
