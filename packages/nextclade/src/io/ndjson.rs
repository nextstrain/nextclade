use crate::io::file::{OutputWriter, create_file_or_stdout};
use crate::types::outputs::NextcladeErrorOutputs;
use eyre::{Report, WrapErr};

use std::io::{IntoInnerError, LineWriter, Write};
use std::path::Path;

pub struct NdjsonWriter<W: Write + Send> {
  line_writer: LineWriter<W>,
}

impl<W: Write + Send> NdjsonWriter<W> {
  pub fn new(writer: W) -> Result<Self, Report> {
    let line_writer = LineWriter::new(writer);
    Ok(Self { line_writer })
  }

  pub fn write<T: serde::Serialize>(&mut self, entry: &T) -> Result<(), Report> {
    serde_json::to_writer(&mut self.line_writer, &entry).wrap_err("When serializing an entry to ndjson")?;
    self.line_writer.write_all(b"\n")?;
    Ok(())
  }

  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &[String]) -> Result<(), Report> {
    self.write(&NextcladeErrorOutputs {
      index,
      seq_name: seq_name.to_owned(),
      errors: errors.to_vec(),
    })
  }

  /// Write the buffered line and return the underlying writer
  pub fn into_inner(self) -> Result<W, Report> {
    Ok(self.line_writer.into_inner().map_err(IntoInnerError::into_error)?)
  }
}

pub struct NdjsonFileWriter {
  ndjson_writer: NdjsonWriter<OutputWriter>,
}

impl NdjsonFileWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let file = create_file_or_stdout(filepath)?;
    Ok(Self {
      ndjson_writer: NdjsonWriter::new(file)?,
    })
  }

  pub fn write<T: serde::Serialize>(&mut self, entry: &T) -> Result<(), Report> {
    self.ndjson_writer.write(entry)
  }

  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &[String]) -> Result<(), Report> {
    self.ndjson_writer.write_nuc_error(index, seq_name, errors)
  }

  /// Write the buffered entries, and report the errors of writing them
  pub fn finish(self) -> Result<(), Report> {
    self.ndjson_writer.into_inner()?.finish()
  }
}
