use crate::io::console::{CliColorMode, use_color, use_color_for_backtrace};
use crate::io::fs::filename_maybe;
use crate::utils::datetime::{date_format_precise, date_now};
use crate::utils::eyre::eyre_init;
use console::style;
use env_logger::Env;
use log::{Level, LevelFilter, Record};
use std::io::Write;

fn get_file_line(record: &Record) -> String {
  let file = record.file().and_then(filename_maybe);
  let raw = match (file, record.line()) {
    (Some(file), None) => format!("{file}:"),
    (Some(file), Some(line)) => format!("{file}:{line}:"),
    _ => "".to_owned(),
  };
  style(raw).dim().to_string()
}

fn log_level_str(record: &Record) -> String {
  let mut level_str = record.level().to_string();
  level_str.truncate(1);
  level_str
}

fn color_log_level(record: &Record) -> String {
  let level_str = match record.level() {
    Level::Error => style(log_level_str(record)).red(),
    Level::Warn => style(log_level_str(record)).yellow(),
    Level::Info => style(log_level_str(record)).cyan().dim(),
    Level::Debug => style(log_level_str(record)).green().dim(),
    Level::Trace => style(log_level_str(record)).dim(),
  };
  format!("{}{}{}", style("[").dim(), level_str, style("]").dim())
}

pub fn setup_logger(log_level: LevelFilter) {
  env_logger::Builder::from_env(Env::default().default_filter_or("warn"))
    .filter_level(log_level)
    .format(|buf, record| {
      let file_line = get_file_line(record);
      let level = color_log_level(record);
      let date = style(date_format_precise(&date_now())).dim().to_string();
      let args = record.args();
      writeln!(buf, "{date} {level} {file_line} {args}")?;
      Ok(())
    })
    .init();
}

pub fn global_init(config: &GlobalInitConfig) {
  owo_colors::set_override(use_color(config.colors));
  console::set_colors_enabled(use_color(config.colors));
  eyre_init(use_color(config.colors) || use_color_for_backtrace(config.colors));
  setup_logger(config.log_level);
}

#[derive(Clone, Debug)]
pub struct GlobalInitConfig {
  pub colors: CliColorMode,
  pub log_level: LevelFilter,
}

impl Default for GlobalInitConfig {
  fn default() -> Self {
    Self {
      colors: CliColorMode::default(),
      log_level: LevelFilter::Warn,
    }
  }
}
