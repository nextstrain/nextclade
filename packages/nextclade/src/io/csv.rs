use crate::io::file::create_file_or_stdout;
use crate::io::fs::read_file_to_string;
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
    self.writer.serialize(record)?;
    Ok(())
  }
}

/// Writes CSV files. Each row is a serde-annotated struct.
pub struct CsvStructFileWriter {
  pub filepath: PathBuf,
  pub writer: CsvStructWriter<Box<dyn Write + Send>>,
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
    writer.write_record(headers)?;
    Ok(Self {
      headers: headers.to_owned(),
      writer,
    })
  }
}

impl<W: Write + Send> VecWriter for CsvVecWriter<W> {
  fn write<I: IntoIterator<Item = T>, T: AsRef<[u8]>>(&mut self, values: I) -> Result<(), Report> {
    self.writer.write_record(values)?;
    Ok(())
  }
}

/// Writes CSV files. Each row is a vec of strings.
pub struct CsvVecFileWriter {
  pub filepath: PathBuf,
  pub headers: Vec<String>,
  pub writer: CsvVecWriter<Box<dyn Write + Send>>,
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
}

impl VecWriter for CsvVecFileWriter {
  fn write<I: IntoIterator<Item = T>, T: AsRef<[u8]>>(&mut self, values: I) -> Result<(), Report> {
    self.writer.write(values)?;
    Ok(())
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
