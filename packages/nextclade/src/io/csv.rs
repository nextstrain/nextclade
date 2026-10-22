use crate::io::file::{OutputWriter, create_file_or_stdout};
use crate::io::fs::read_file_to_string;
use crate::make_internal_report;
use crate::utils::error::to_eyre_error;
use csv::{ReaderBuilder as CsvReaderBuilder, Writer as CsvWriterImpl, WriterBuilder as CsvWriterBuilder};
use eyre::Report;
use serde::{Deserialize, Serialize};
use std::io::Write;
use std::path::{Path, PathBuf};

/// Writes CSV. Each row is a serde-annotated struct.
pub struct CsvStructWriter<W: Write + Send> {
  pub writer: CsvWriterImpl<W>,
}

impl<W: Write + Send> CsvStructWriter<W> {
  pub fn new(writer: W, delimiter: u8) -> Result<Self, Report> {
    let writer = CsvWriterBuilder::new().delimiter(delimiter).from_writer(writer);
    Ok(Self { writer })
  }

  pub fn write<T: Serialize>(&mut self, record: &T) -> Result<(), Report> {
    self.writer.serialize(record).map_err(csv_write_error)
  }

  /// Write the buffered rows and return the underlying writer
  pub fn into_inner(self) -> Result<W, Report> {
    Ok(self.writer.into_inner().map_err(csv::IntoInnerError::into_error)?)
  }
}

/// Writes CSV files. Each row is a serde-annotated struct.
#[must_use = "call `finish` after the last write, to complete the output and report its errors"]
pub struct CsvStructFileWriter {
  pub filepath: PathBuf,
  pub writer: CsvStructWriter<OutputWriter>,
}

impl CsvStructFileWriter {
  pub fn new(filepath: impl AsRef<Path>, delimiter: u8) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let file = create_file_or_stdout(filepath)?;
    let writer = CsvStructWriter::new(file, delimiter)?;
    Ok(Self {
      filepath: filepath.to_owned(),
      writer,
    })
  }

  pub fn write<T: Serialize>(&mut self, record: &T) -> Result<(), Report> {
    self.writer.write(record)?;
    Ok(())
  }

  /// Write the buffered rows, and report the errors of writing them
  pub fn finish(self) -> Result<(), Report> {
    self.writer.into_inner()?.finish()
  }
}

pub trait VecWriter {
  fn write<I: IntoIterator<Item = T>, T: AsRef<[u8]>>(&mut self, values: I) -> Result<(), Report>;
}

/// Writes CSV. Each row is a vec of strings.
pub struct CsvVecWriter<W: Write + Send> {
  pub headers: Vec<String>,
  pub writer: CsvWriterImpl<W>,
}

impl<W: Write + Send> CsvVecWriter<W> {
  pub fn new(writer: W, delimiter: u8, headers: &[String]) -> Result<Self, Report> {
    let mut writer = CsvWriterBuilder::new().delimiter(delimiter).from_writer(writer);
    writer.write_record(headers).map_err(csv_write_error)?;
    Ok(Self {
      headers: headers.to_owned(),
      writer,
    })
  }

  /// Write the buffered rows and return the underlying writer
  pub fn into_inner(self) -> Result<W, Report> {
    Ok(self.writer.into_inner().map_err(csv::IntoInnerError::into_error)?)
  }
}

impl<W: Write + Send> VecWriter for CsvVecWriter<W> {
  fn write<I: IntoIterator<Item = T>, T: AsRef<[u8]>>(&mut self, values: I) -> Result<(), Report> {
    self.writer.write_record(values).map_err(csv_write_error)
  }
}

/// Writes CSV files. Each row is a vec of strings.
#[must_use = "call `finish` after the last write, to complete the output and report its errors"]
pub struct CsvVecFileWriter {
  pub filepath: PathBuf,
  pub headers: Vec<String>,
  pub writer: CsvVecWriter<OutputWriter>,
}

impl CsvVecFileWriter {
  pub fn new(filepath: impl AsRef<Path>, delimiter: u8, headers: &[String]) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let file = create_file_or_stdout(filepath)?;
    let writer = CsvVecWriter::new(file, delimiter, headers)?;
    Ok(Self {
      filepath: filepath.to_owned(),
      headers: headers.to_owned(),
      writer,
    })
  }

  /// Write the buffered rows, and report the errors of writing them
  pub fn finish(self) -> Result<(), Report> {
    self.writer.into_inner()?.finish()
  }
}

impl VecWriter for CsvVecFileWriter {
  fn write<I: IntoIterator<Item = T>, T: AsRef<[u8]>>(&mut self, values: I) -> Result<(), Report> {
    self.writer.write(values)?;
    Ok(())
  }
}

/// Convert an error of a CSV writer to a report. `csv::Error` does not report the `io::Error` inside it as its cause,
/// so the report of a write error is the `io::Error` itself, which keeps the name of the output and the cause
pub fn csv_write_error(error: csv::Error) -> Report {
  if !error.is_io_error() {
    return Report::new(error);
  }
  match error.into_kind() {
    csv::ErrorKind::Io(error) => Report::new(error),
    kind => make_internal_report!("Expected an IO error of the CSV writer, but found: {kind:?}"),
  }
}

/// Parses CSV data from string.
pub fn parse_csv<T: for<'de> Deserialize<'de>, S: AsRef<str>>(data: S) -> Result<Vec<T>, Report> {
  let reader = CsvReaderBuilder::new()
    .has_headers(true)
    .from_reader(data.as_ref().as_bytes());
  reader
    .into_deserialize::<T>()
    .map(to_eyre_error)
    .collect::<Result<Vec<T>, Report>>()
}

/// Parses CSV file.
pub fn read_csv_file<T: for<'de> Deserialize<'de>>(filepath: impl AsRef<Path>) -> Result<Vec<T>, Report> {
  let filepath = filepath.as_ref();
  let data = read_file_to_string(filepath)?;
  parse_csv(data)
}
