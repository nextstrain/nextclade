use crate::io::fs::{ensure_dir, read_file_to_string};
use crate::utils::error::to_eyre_error;
use csv::{ReaderBuilder as CsvReaderBuilder, Writer as CsvWriterImpl, WriterBuilder as CsvWriterBuilder};
use eyre::{Report, WrapErr};
use serde::{Deserialize, Serialize};
use std::fs::File;
use std::io::BufWriter;
use std::path::Path;

pub struct CsvWriter {
  pub writer: CsvWriterImpl<BufWriter<File>>,
}

impl CsvWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    ensure_dir(&filepath)?;
    let file = File::create(&filepath).wrap_err_with(|| format!("When creating file: {filepath:?}"))?;
    let buf_file = BufWriter::with_capacity(32 * 1024, file);
    let writer = CsvWriterBuilder::new().from_writer(buf_file);
    Ok(Self { writer })
  }

  pub fn write<T: Serialize>(&mut self, record: &T) -> Result<(), Report> {
    self.writer.serialize(record)?;
    Ok(())
  }
}

pub fn parse_csv<T: for<'de> Deserialize<'de>, S: AsRef<str>>(data: S) -> Result<Vec<T>, Report> {
  let reader = CsvReaderBuilder::new()
    .has_headers(true)
    .from_reader(data.as_ref().as_bytes());
  reader
    .into_deserialize::<T>()
    .into_iter()
    .map(to_eyre_error)
    .collect::<Result<Vec<T>, Report>>()
}

pub fn read_csv<T: for<'de> Deserialize<'de>>(filepath: impl AsRef<Path>) -> Result<Vec<T>, Report> {
  let filepath = filepath.as_ref();
  let data = read_file_to_string(filepath)?;
  parse_csv(data)
}
