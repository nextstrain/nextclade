use crate::io::file::create_file_or_stdout;
use crate::types::outputs::NextcladeErrorOutputs;
use eyre::{Report, WrapErr};

use std::io::{LineWriter, Write};
use std::path::{Path, PathBuf};

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
}

pub struct NdjsonFileWriter {
  filepath: PathBuf,
  ndjson_writer: NdjsonWriter<Box<dyn Write + Send>>,
}

impl NdjsonFileWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let file = create_file_or_stdout(filepath)?;
    let line_writer = NdjsonWriter::new(file)?;
    Ok(Self {
      filepath: filepath.to_owned(),
      ndjson_writer: line_writer,
    })
  }

  pub fn write<T: serde::Serialize>(&mut self, entry: &T) -> Result<(), Report> {
    self
      .ndjson_writer
      .write(entry)
      .wrap_err_with(|| format!("When writing ndjson output entry to file {}", &self.filepath.display()))
  }

  pub fn write_nuc_error(&mut self, index: usize, seq_name: &str, errors: &[String]) -> Result<(), Report> {
    self
      .ndjson_writer
      .write_nuc_error(index, seq_name, errors)
      .wrap_err_with(|| format!("When writing ndjson error entry to file {}", &self.filepath.display()))
  }
}
