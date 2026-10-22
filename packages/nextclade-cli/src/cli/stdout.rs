//! Data output to standard output.
//!
//! Commands write their data output with `write_stdout`, which returns an error where `println!` panics. When the
//! reader closes the pipe early, as `head` does in `nextclade dataset list | head`, the error is `StdoutClosed`, and
//! `ignore_stdout_closed` ends the command quietly with success, as standard Unix tools do.

use eyre::Report;
use std::error::Error;
use std::fmt::Display;
use std::io::{self, ErrorKind, Write};

/// Error of a write to standard output after the reader closed it
#[derive(Debug, derive_more::Display)]
#[display("Standard output is closed")]
pub struct StdoutClosed;

impl Error for StdoutClosed {}

/// Write `content` and a newline to standard output
pub fn write_stdout(content: impl Display) -> Result<(), Report> {
  write_line(&mut io::stdout().lock(), content)
}

/// Write `content` unchanged to standard output
pub fn write_stdout_bytes(content: &[u8]) -> Result<(), Report> {
  write_bytes(&mut io::stdout().lock(), content)
}

/// Write `content` and a newline to `writer`, which stands for standard output, and flush it
pub fn write_line(writer: &mut impl Write, content: impl Display) -> Result<(), Report> {
  writeln!(writer, "{content}")
    .and_then(|()| writer.flush())
    .map_err(stdout_error)
}

/// Write `content` unchanged to `writer`, which stands for standard output, and flush it
pub fn write_bytes(writer: &mut impl Write, content: &[u8]) -> Result<(), Report> {
  writer
    .write_all(content)
    .and_then(|()| writer.flush())
    .map_err(stdout_error)
}

/// Convert an error of a write to standard output into a report: `StdoutClosed` for a closed pipe
fn stdout_error(error: io::Error) -> Report {
  if error.kind() == ErrorKind::BrokenPipe {
    Report::new(StdoutClosed)
  } else {
    Report::new(error).wrap_err("When writing to standard output")
  }
}

/// Whether the error, or one of its causes, is `StdoutClosed`
pub fn is_stdout_closed(report: &Report) -> bool {
  report.chain().any(<dyn Error>::is::<StdoutClosed>)
}

/// Turn the result of a command that failed only because standard output is closed into success
pub fn ignore_stdout_closed(result: Result<(), Report>) -> Result<(), Report> {
  match result {
    Err(report) if is_stdout_closed(&report) => Ok(()),
    result => result,
  }
}
