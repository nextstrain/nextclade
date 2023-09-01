use clap::Parser;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[allow(clippy::struct_excessive_bools)]
#[derive(Parser, Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeSeqSortParams {
  /// Minimum value of the normalized index hit being considered for assignment
  #[clap(long)]
  #[clap(default_value_t = NextcladeSeqSortParams::default().min_normalized_hit)]
  pub min_normalized_hit: f64,

  /// Minimum number of the index hits required for assignment
  #[clap(long)]
  #[clap(default_value_t = NextcladeSeqSortParams::default().min_total_hits)]
  pub min_total_hits: u64,
}

#[allow(clippy::derivable_impls)]
impl Default for NextcladeSeqSortParams {
  fn default() -> Self {
    Self {
      min_normalized_hit: 0.3,
      min_total_hits: 10,
    }
  }
}
