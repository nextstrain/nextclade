//! Inspired by clap-verbosity-flag:
//! https://github.com/rust-cli/clap-verbosity-flag
use clap::Args;
use lazy_static::lazy_static;
use log::{Level, LevelFilter};
use std::fmt::{Display, Formatter, Result};
use std::marker::PhantomData;

lazy_static! {
  static ref VERBOSITIES: &'static [&'static str] = &["off", "error", "warn", "info", "debug", "trace"];
}

#[derive(Args, Debug, Clone)]
pub struct Verbosity<L: LogLevel = ErrorLevel> {
  /// Set verbosity level of console output [default: warn]
  #[clap(long, global = true, possible_values(VERBOSITIES.iter()))]
  #[clap(conflicts_with = "quiet", conflicts_with = "verbose", conflicts_with = "silent")]
  #[clap(display_order = 900)]
  pub verbosity: Option<LevelFilter>,

  /// Disable all console output. Same as `--verbosity=off`
  #[clap(long, global = true)]
  #[clap(conflicts_with = "quiet", conflicts_with = "verbose", conflicts_with = "verbosity")]
  #[clap(display_order = 901)]
  pub silent: bool,

  /// Make console output more verbose. Add multiple occurrences to increase verbosity further.
  #[clap(long, short = 'v', parse(from_occurrences), global = true)]
  #[clap(conflicts_with = "quiet", conflicts_with = "verbosity", conflicts_with = "silent")]
  #[clap(display_order = 902)]
  pub verbose: i8,

  /// Make console output more quiet. Add multiple occurrences to make output even more quiet.
  #[clap(long, short = 'q', parse(from_occurrences), global = true)]
  #[clap(conflicts_with = "verbose", conflicts_with = "verbosity")]
  #[clap(display_order = 903)]
  pub quiet: i8,

  #[clap(skip)]
  pub phantom: PhantomData<L>,
}

impl<L: LogLevel> Verbosity<L> {
  pub fn get_filter_level(&self) -> LevelFilter {
    // --verbosity=<level> and --silent take priority over -v and -q
    if self.silent {
      LevelFilter::Off
    } else {
      match self.verbosity {
        Some(verbosity) => verbosity,
        None => self.log_level_filter(),
      }
    }
  }

  /// Get the log level.
  ///
  /// `None` means all output is disabled.
  pub fn log_level(&self) -> Option<Level> {
    level_enum(self.verbosity())
  }

  /// Get the log level filter.
  pub fn log_level_filter(&self) -> LevelFilter {
    level_enum(self.verbosity()).map_or(LevelFilter::Off, |l| l.to_level_filter())
  }

  /// If the user requested complete silence (i.e. not just no-logging).
  pub fn is_silent(&self) -> bool {
    self.log_level().is_none()
  }

  fn verbosity(&self) -> i8 {
    level_value(L::default()) - self.quiet + self.verbose
  }
}

const fn level_value(level: Option<Level>) -> i8 {
  match level {
    None => -1,
    Some(Level::Error) => 0,
    Some(Level::Warn) => 1,
    Some(Level::Info) => 2,
    Some(Level::Debug) => 3,
    Some(Level::Trace) => 4,
  }
}

const fn level_enum(verbosity: i8) -> Option<Level> {
  match verbosity {
    i8::MIN..=-1 => None,
    0 => Some(Level::Error),
    1 => Some(Level::Warn),
    2 => Some(Level::Info),
    3 => Some(Level::Debug),
    4..=i8::MAX => Some(Level::Trace),
  }
}

impl<L: LogLevel> Display for Verbosity<L> {
  fn fmt(&self, f: &mut Formatter<'_>) -> Result {
    write!(f, "{}", self.verbosity())
  }
}

pub trait LogLevel {
  fn default() -> Option<Level>;
}

#[derive(Copy, Clone, Debug, Default)]
pub struct ErrorLevel;

impl LogLevel for ErrorLevel {
  fn default() -> Option<Level> {
    Some(Level::Error)
  }
}

#[derive(Copy, Clone, Debug, Default)]
pub struct WarnLevel;

impl LogLevel for WarnLevel {
  fn default() -> Option<Level> {
    Some(Level::Warn)
  }
}

#[derive(Copy, Clone, Debug, Default)]
pub struct InfoLevel;

impl LogLevel for InfoLevel {
  fn default() -> Option<Level> {
    Some(Level::Info)
  }
}
