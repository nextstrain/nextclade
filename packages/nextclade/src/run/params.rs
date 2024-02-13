use crate::align::params::{AlignPairwiseParams, AlignPairwiseParamsOptional};
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
}

#[derive(Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeInputParams {
  pub general: NextcladeGeneralParams,
  pub tree_builder: TreeBuilderParams,
  pub alignment: AlignPairwiseParams,
}

impl NextcladeInputParams {
  pub fn from_optional(
    params: &NextcladeInputParamsOptional,
    virus_properties: &VirusProperties,
  ) -> Result<Self, Report> {
    // FIXME: this code is repetitive and error prone
    let general = {
      // Start with defaults
      let mut general_params = NextcladeGeneralParams::default();
      // Merge params coming from virus_properties
      if let Some(general_params_from_file) = &virus_properties.general_params {
        general_params.merge_opt(general_params_from_file.clone());
      }
      // Merge incoming params
      if let Some(general_params_incoming) = &params.general {
        general_params.merge_opt(general_params_incoming.clone());
      }
      general_params
    };

    let alignment = {
      // Start with defaults
      let mut alignment_params = AlignPairwiseParams::default();
      // Merge params coming from virus_properties
      if let Some(alignment_params_from_file) = &virus_properties.alignment_params {
        alignment_params.merge_opt(alignment_params_from_file.clone());
      }
      // Merge incoming params
      if let Some(alignment_params_incoming) = &params.alignment {
        alignment_params.merge_opt(alignment_params_incoming.clone());
      }
      alignment_params
    };

    alignment.validate()?;

    let tree_builder = {
      // Start with defaults
      let mut tree_builder_params = TreeBuilderParams::default();
      // Merge params coming from virus_properties
      if let Some(tree_builder_params_from_file) = &virus_properties.tree_builder_params {
        tree_builder_params.merge_opt(tree_builder_params_from_file.clone());
      }
      // Merge incoming params
      if let Some(tree_builder_params_incoming) = &params.tree_builder {
        tree_builder_params.merge_opt(tree_builder_params_incoming.clone());
      }
      tree_builder_params
    };

    Ok(Self {
      general,
      tree_builder,
      alignment,
    })
  }
}
