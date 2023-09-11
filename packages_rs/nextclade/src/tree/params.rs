use clap::Parser;
use optfield::optfield;
use serde::{Deserialize, Serialize};

// NOTE: The `optfield` attribute creates a struct that have the same fields, but which are wrapped into `Option`,
// as well as adds a method `.merge_opt(&opt)` to the original struct, which merges values from the optional counterpart
// into self (mutably).
#[allow(clippy::struct_excessive_bools)]
#[optfield(pub TreeBuilderParamsOptional, attrs, doc, field_attrs, field_doc, merge_fn = pub)]
#[derive(Parser, Debug, Clone, Serialize, Deserialize, schemars::JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct TreeBuilderParams {
  /// Disable greedy tree builder algorithm
  #[clap(long)]
  #[clap(num_args=0..=1, default_missing_value = "true")]
  pub without_greedy_tree_builder: bool,

  #[clap(long)]
  pub masked_muts_weight: f64,
}

#[allow(clippy::derivable_impls)]
impl Default for TreeBuilderParams {
  fn default() -> Self {
    Self {
      without_greedy_tree_builder: false,
      masked_muts_weight: 0.5,
    }
  }
}
