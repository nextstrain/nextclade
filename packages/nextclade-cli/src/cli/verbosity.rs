//! Inspired by clap-verbosity-flag:
//! https://github.com/rust-cli/clap-verbosity-flag
use clap::builder::{PossibleValuesParser, TypedValueParser};
use clap::{ArgAction, Args};
use log::LevelFilter;

#[derive(Args, Debug, Clone)]
pub struct Verbosity {
  /// Set verbosity level of console output
  #[clap(long, global = true, value_parser = PossibleValuesParser::new(["off", "error", "warn", "info", "debug", "trace"])
      .map(|s| s.parse::<LevelFilter>().unwrap()))]
  #[clap(conflicts_with = "quiet", conflicts_with = "verbose", conflicts_with = "silent")]
  #[clap(default_value = "warn")]
  #[clap(display_order = 900)]
  pub verbosity: LevelFilter,

  /// Disable all console output. Same as `--verbosity=off`
  #[clap(long, global = true)]
  #[clap(conflicts_with = "quiet", conflicts_with = "verbose", conflicts_with = "verbosity")]
  #[clap(display_order = 901)]
  pub silent: bool,

  /// Make console output more verbose. Add multiple occurrences to increase verbosity further.
  #[clap(long, short = 'v', action = ArgAction::Count, global = true)]
  #[clap(conflicts_with = "quiet", conflicts_with = "verbosity", conflicts_with = "silent")]
  #[clap(display_order = 902)]
  pub verbose: u8,

  /// Make console output more quiet. Add multiple occurrences to make output even more quiet.
  #[clap(long, short = 'q', action = ArgAction::Count, global = true)]
  #[clap(conflicts_with = "verbose", conflicts_with = "verbosity")]
  #[clap(display_order = 903)]
  pub quiet: u8,
}

impl Verbosity {
  pub const fn get_filter_level(&self) -> LevelFilter {
    // --verbosity=<level> and --silent take priority over -v and -q
    if self.silent {
      LevelFilter::Off
    } else {
      self.verbosity
    }
  }
}
