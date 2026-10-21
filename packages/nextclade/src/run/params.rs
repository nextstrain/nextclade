use crate::align::params::{AlignPairwiseParams, AlignPairwiseParamsOptional};
use crate::analyze::aa_changes_find_for_cds::{AaChangesParams, AaChangesParamsOptional};
use crate::analyze::virus_properties::VirusProperties;
use crate::run::params_general::{NextcladeGeneralParams, NextcladeGeneralParamsOptional};
use crate::tree::params::{TreeBuilderParams, TreeBuilderParamsOptional};
use clap::Parser;
use eyre::Report;
use serde::{Deserialize, Serialize};

#[derive(Parser, Debug, Default, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeInputParamsOptional {
  #[clap(flatten, next_help_heading = "General parameters")]
  pub general: Option<NextcladeGeneralParamsOptional>,

  #[clap(flatten, next_help_heading = "Phylogenetic tree parameters")]
  pub tree_builder: Option<TreeBuilderParamsOptional>,

  #[clap(flatten, next_help_heading = "Alignment parameters")]
  pub alignment: Option<AlignPairwiseParamsOptional>,

  #[clap(flatten, next_help_heading = "Amino acid related parameters")]
  pub aa_changes: Option<AaChangesParamsOptional>,
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeInputParams {
  pub general: NextcladeGeneralParams,
  pub tree_builder: TreeBuilderParams,
  pub alignment: AlignPairwiseParams,
  pub aa_changes: AaChangesParams,
}

impl NextcladeInputParams {
  /// Resolve parameters from the user (`params`: CLI arguments) and from the dataset (`virus_properties`: `pathogen.json`).
  ///
  /// Each parameter takes the value from the first source that sets it: user, then dataset, then the base values.
  pub fn from_optional(
    params: &NextcladeInputParamsOptional,
    virus_properties: &VirusProperties,
  ) -> Result<Self, Report> {
    let general = resolve_params(
      NextcladeGeneralParams::default(),
      &virus_properties.general_params,
      &params.general,
      NextcladeGeneralParams::merge_opt,
    );

    let preset = params
      .alignment
      .as_ref()
      .and_then(|a| a.alignment_preset)
      .unwrap_or_default();

    let alignment = resolve_params(
      AlignPairwiseParams::from_preset(preset)?,
      &virus_properties.alignment_params,
      &params.alignment,
      AlignPairwiseParams::merge_opt,
    );

    alignment.validate()?;

    let tree_builder = resolve_params(
      TreeBuilderParams::default(),
      &virus_properties.tree_builder_params,
      &params.tree_builder,
      TreeBuilderParams::merge_opt,
    );

    let aa_changes = resolve_params(
      AaChangesParams::default(),
      &virus_properties.aa_changes_params,
      &params.aa_changes,
      AaChangesParams::merge_opt,
    );

    Ok(Self {
      general,
      tree_builder,
      alignment,
      aa_changes,
    })
  }
}

/// Merge the parameters set by the dataset, then the parameters set by the user, into `base`.
fn resolve_params<P, O: Clone>(
  mut base: P,
  from_dataset: &Option<O>,
  from_user: &Option<O>,
  merge: impl Fn(&mut P, O),
) -> P {
  for source in [from_dataset, from_user].into_iter().flatten() {
    merge(&mut base, source.clone());
  }
  base
}
