use crate::io::fs::ensure_dir;
use csv::{Writer as CsvWriterImpl, WriterBuilder as CsvWriterBuilder};
use eyre::{Report, WrapErr};
use serde::Serialize;
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
