use std::env;
use std::io::Write;

use crate::utils::datetime::{date_format_precise, date_now};
use color_eyre::owo_colors::OwoColorize;
use env_logger::Env;
use log::{Level, LevelFilter, Record};

fn get_current_exe_filename() -> Option<String> {
  env::current_exe().ok()?.file_name()?.to_str()?.to_owned().into()
}

fn get_file_line(record: &Record<'_>) -> String {
  match (record.file(), record.line()) {
    (Some(file), None) => file.to_owned(),
    (Some(file), Some(line)) => format!("{:}:{:}", file, line),
    _ => "".to_owned(),
  }
}

fn log_level_str(record: &Record<'_>) -> String {
  let mut level_str = record.level().to_string();
  level_str.truncate(5);
  format!("{:<5}", level_str)
}

fn color_log_level(record: &Record<'_>) -> String {
  match record.level() {
    Level::Error => log_level_str(record).red().to_string(),
    Level::Warn => log_level_str(record).yellow().to_string(),
    Level::Info => log_level_str(record).cyan().to_string(),
    Level::Debug => log_level_str(record),
    Level::Trace => log_level_str(record).dimmed().to_string(),
  }
}

pub fn setup_logger(filter_level: LevelFilter) {
  env_logger::Builder::from_env(Env::default().default_filter_or("warn"))
    .filter_level(filter_level)
    .format(|buf, record| {
      let current_exe = get_current_exe_filename().unwrap_or_default();
      let file_line = get_file_line(record);
      let level = color_log_level(record);
      let date = date_format_precise(&date_now());
      let args = record.args();
      writeln!(buf, "[{date}][{current_exe:}][{level:<5}] {file_line:}: {args}")?;
      Ok(())
    })
    .init();
}

pub fn global_init() {
  color_eyre::install().expect("color_eyre initialization failed");
}
