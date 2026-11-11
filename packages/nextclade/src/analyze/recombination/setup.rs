//! Per-dataset setup of recombination detection, resolved once when the dataset loads.

use crate::analyze::recombination::config::RecombinationConfig;
use crate::analyze::recombination::estimate::resolve_recombination_params;
use crate::analyze::recombination::params::RecombinationHmmParams;
use crate::make_error;
use crate::tree::tree::AuspiceGraph;
use eyre::{Report, WrapErr};

/// Resolve the recombination detection settings of a dataset. `None` when detection is off.
///
/// When detection is on, every reason that blocks it is an error that names the cause: no reference tree, an invalid
/// parameter override, or a parameter that the tree cannot estimate.
pub fn resolve_recombination_setup(
  is_enabled: bool,
  config: Option<&RecombinationConfig>,
  graph: Option<&AuspiceGraph>,
  ref_len: usize,
) -> Result<Option<RecombinationSetup>, Report> {
  if !is_enabled {
    return Ok(None);
  }
  resolve_enabled(config, graph, ref_len)
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
}

fn resolve_enabled(
  config: Option<&RecombinationConfig>,
  graph: Option<&AuspiceGraph>,
  ref_len: usize,
) -> Result<RecombinationSetup, Report> {
  let Some(graph) = graph else {
    return make_error!(
      "No reference tree is available, and recombination detection requires one to derive parent-relative mutations"
    );
  };
  let params = resolve_recombination_params(config, graph, ref_len)?;
  Ok(RecombinationSetup { params })
}
