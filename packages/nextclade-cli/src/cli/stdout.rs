//! Data output to standard output.
//!
//! Commands write their data output with `write_stdout`, which returns an error where `println!` panics. When the
//! reader closes the pipe early, as `head` does in `nextclade dataset list | head`, the error has the cause
//! `StdoutClosed`, the same as the errors of outputs written to stdout with `create_file_or_stdout`. For both,
//! `ignore_stdout_closed` ends the command quietly with success, as standard Unix tools do. A command with several
//! outputs writes them with `write_output` and `finish_outputs`, which drop an output to the closed standard output
//! and complete the other outputs.

use eyre::{Report, WrapErr};
use nextclade::io::file::{StdoutWriter, is_stdout_closed};
use nextclade::utils::error::join_errors;
use std::fmt::Display;
use std::io::{self, Write};

/// Write `content` and a newline to standard output
pub fn write_stdout(content: impl Display) -> Result<(), Report> {
  write_line(&mut StdoutWriter::new(io::stdout().lock()), content)
}

/// Write `content` unchanged to standard output
pub fn write_stdout_bytes(content: &[u8]) -> Result<(), Report> {
  write_bytes(&mut StdoutWriter::new(io::stdout().lock()), content)
}

/// Write `content` and a newline to `writer`, which stands for standard output, and flush it
pub fn write_line(writer: &mut impl Write, content: impl Display) -> Result<(), Report> {
  writeln!(writer, "{content}")
    .and_then(|()| writer.flush())
    .wrap_err("When writing to standard output")
}

/// Write `content` unchanged to `writer`, which stands for standard output, and flush it
pub fn write_bytes(writer: &mut impl Write, content: &[u8]) -> Result<(), Report> {
  writer
    .write_all(content)
    .and_then(|()| writer.flush())
    .wrap_err("When writing to standard output")
}

/// Write to `output` with `write`. When the output goes to standard output and the reader closed it, drop the output,
/// so that the other outputs are written to their end
pub fn write_output<W>(output: &mut Option<W>, write: impl FnOnce(&mut W) -> Result<(), Report>) -> Result<(), Report> {
  let Some(writer) = output else {
    return Ok(());
  };
  match write(writer) {
    Err(report) if is_stdout_closed(&report) => {
      *output = None;
      Ok(())
    }
    result => result,
  }
}

/// Report the errors of all outputs, except the error of an output to standard output that the reader closed
pub fn finish_outputs(results: impl IntoIterator<Item = Result<(), Report>>) -> Result<(), Report> {
  join_errors(
    results
      .into_iter()
      .filter_map(Result::err)
      .filter(|report| !is_stdout_closed(report)),
  )
}

/// Turn the result of a command that failed only because standard output is closed into success
pub fn ignore_stdout_closed(result: Result<(), Report>) -> Result<(), Report> {
  match result {
    Err(report) if is_stdout_closed(&report) => Ok(()),
    result => result,
  }
}
