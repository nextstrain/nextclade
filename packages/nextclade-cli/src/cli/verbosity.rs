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
    if self.silent {
      // --verbosity=<level> and --silent take priority over -v and -q
      LevelFilter::Off
    } else {
      let ilevel = level_to_int(self.verbosity);
      let ilevel = ilevel.saturating_add(self.verbose);
      let ilevel = ilevel.saturating_sub(self.quiet);
      level_from_int(ilevel)
    }
  }
}

const fn level_to_int(level: LevelFilter) -> u8 {
  match level {
    LevelFilter::Off => 0,
    LevelFilter::Error => 1,
    LevelFilter::Warn => 2,
    LevelFilter::Info => 3,
    LevelFilter::Debug => 4,
    LevelFilter::Trace => 5,
  }
}

const fn level_from_int(verbosity: u8) -> LevelFilter {
  match verbosity {
    0 => LevelFilter::Off,
    1 => LevelFilter::Error,
    2 => LevelFilter::Warn,
    3 => LevelFilter::Info,
    4 => LevelFilter::Debug,
    5.. => LevelFilter::Trace,
  }
}
