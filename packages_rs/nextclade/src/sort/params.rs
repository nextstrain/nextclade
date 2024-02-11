use clap::Parser;
use schemars::JsonSchema;
use serde::{Deserialize, Serialize};

#[allow(clippy::struct_excessive_bools)]
#[derive(Parser, Debug, Clone, Serialize, Deserialize, JsonSchema)]
#[serde(rename_all = "camelCase")]
pub struct NextcladeSeqSortParams {
  /// Minimum value of the score being considered for a detection
  #[clap(long)]
  #[clap(default_value_t = NextcladeSeqSortParams::default().min_score)]
  pub min_score: f64,

  /// Minimum number of the index hits required for a detection
  #[clap(long)]
  #[clap(default_value_t = NextcladeSeqSortParams::default().min_hits)]
  pub min_hits: u64,
}

#[allow(clippy::derivable_impls)]
impl Default for NextcladeSeqSortParams {
  fn default() -> Self {
    Self {
      min_score: 0.1,
      min_hits: 10,
    }
  }
}
