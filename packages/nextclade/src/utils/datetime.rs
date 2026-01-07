use chrono::{DateTime, FixedOffset, Utc};
use eyre::Report;
use std::time::{Duration, UNIX_EPOCH};

pub fn date_now() -> DateTime<Utc> {
  Utc::now()
}

pub fn date_from_iso(iso: &str) -> Result<DateTime<Utc>, Report> {
  let parsed = DateTime::<FixedOffset>::parse_from_rfc3339(iso)?;
  let utc: DateTime<Utc> = DateTime::from(parsed);
  Ok(utc)
}

pub fn date_to_iso(datetime: &DateTime<Utc>) -> String {
  datetime.to_rfc3339()
}

pub const fn date_to_timestamp(datetime: &DateTime<Utc>) -> i64 {
  datetime.timestamp() * 1000
}

pub fn timestamp_to_date(timestamp: i64) -> DateTime<Utc> {
  DateTime::<Utc>::from(UNIX_EPOCH + Duration::from_millis(timestamp as u64))
}

pub fn timestamp_from_iso(iso: &str) -> Result<i64, Report> {
  let datetime = date_from_iso(iso)?;
  let timestamp = date_to_timestamp(&datetime);
  Ok(timestamp)
}

pub fn timestamp_now() -> i64 {
  date_to_timestamp(&date_now())
}

pub fn date_iso_now() -> String {
  date_to_iso(&date_now())
}

pub fn date_format(datetime: &DateTime<Utc>) -> String {
  datetime.format("%Y-%m-%d %H:%M:%S").to_string()
}

pub fn timestamp_format(timestamp: i64) -> String {
  date_format(&timestamp_to_date(timestamp))
}

pub fn date_format_precise(datetime: &DateTime<Utc>) -> String {
  datetime.format("%Y-%m-%d %H:%M:%S%.3f").to_string()
}

pub fn timestamp_format_precise(timestamp: i64) -> String {
  date_format_precise(&timestamp_to_date(timestamp))
}

pub fn date_format_safe(datetime: &DateTime<Utc>) -> String {
  datetime.format("%Y-%m-%d_%H-%M-%S").to_string()
}

pub fn timestamp_format_safe(timestamp: i64) -> String {
  date_format_safe(&timestamp_to_date(timestamp))
}
