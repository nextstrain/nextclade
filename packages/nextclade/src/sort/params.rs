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

  /// Maximum score difference between two adjacent dataset matches, after which the less fitting datasets
  /// are not considered.
  ///
  /// This argument will truncate the list of datasets considered for a detection, such that if there is a large enough
  /// difference in score ("gap") in the list, all datasets that are worse than the dataset before the gap are removed
  /// from consideration. This allows, in situation when there's 2 or more groups of similar datasets, to filter-out
  /// the groups that are worse than the best group.
  #[clap(long)]
  #[clap(default_value_t = NextcladeSeqSortParams::default().max_score_gap)]
  pub max_score_gap: f64,

  /// Whether to consider all datasets
  ///
  /// By default, only the top matching dataset is considered. When this flag is provided,
  /// all datasets reaching the matching criteria are considered.
  #[clap(long)]
  #[clap(default_value_t = NextcladeSeqSortParams::default().all_matches)]
  pub all_matches: bool,
}

#[allow(clippy::derivable_impls)]
impl Default for NextcladeSeqSortParams {
  fn default() -> Self {
    Self {
      min_score: 0.1,
      min_hits: 5,
      all_matches: false,
      max_score_gap: 0.2,
    }
  }
}
