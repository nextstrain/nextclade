use crate::io::fs::ensure_dir;
use crate::make_error;
use eyre::{Report, WrapErr};
use std::fs::File;
use std::io::{BufRead, BufReader, BufWriter};
use std::path::Path;

#[derive(Default, Clone, Debug)]
pub struct FastaRecord {
  pub seq_name: String,
  pub seq: String,
  pub index: usize,
}

impl FastaRecord {
  pub fn new() -> Self {
    Self::default()
  }

  pub fn clear(&mut self) {
    self.seq_name.clear();
    self.seq.clear();
    self.index = 0;
  }

  pub fn is_empty(&self) -> bool {
    self.seq_name.is_empty() && self.seq_name.is_empty() && self.index == 0
  }
}

pub struct FastaReader {
  reader: Box<dyn std::io::BufRead>,
  line: String,
}

impl FastaReader {
  pub fn new(reader: Box<dyn std::io::BufRead>) -> Self {
    Self {
      reader,
      line: String::new(),
    }
  }

  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    let file = File::open(&filepath).wrap_err_with(|| format!("When opening file: {filepath:?}"))?;
    let reader = BufReader::with_capacity(32 * 1024, file);
    Ok(Self::new(Box::new(reader)))
  }

  pub fn read(&mut self, record: &mut FastaRecord) -> Result<(), Report> {
    record.clear();

    if self.line.is_empty() {
      self.reader.read_line(&mut self.line)?;
      if self.line.is_empty() {
        return Ok(());
      }
    }

    if !self.line.starts_with('>') {
      return make_error!("Expected > at record start.");
    }

    record.seq_name = self.line[1..].trim().to_owned();

    loop {
      self.line.clear();
      self.reader.read_line(&mut self.line)?;
      if self.line.is_empty() || self.line.starts_with('>') {
        break;
      }
      record.seq.push_str(self.line.trim_end());
    }

    Ok(())
  }
}

pub fn read_one_fasta(filepath: impl AsRef<Path>) -> Result<String, Report> {
  let filepath = filepath.as_ref();
  let mut reader = FastaReader::from_path(&filepath)?;
  let mut record = FastaRecord::default();
  reader.read(&mut record)?;
  Ok(record.seq)
}

pub struct FastaWriter {
  writer: Box<dyn std::io::Write>,
}

impl FastaWriter {
  pub fn new(writer: Box<dyn std::io::Write>) -> Self {
    Self { writer }
  }

  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let filepath = filepath.as_ref();
    ensure_dir(&filepath)?;
    let file = File::create(&filepath).wrap_err_with(|| format!("When creating file: {filepath:?}"))?;
    let writer = BufWriter::with_capacity(32 * 1024, file);
    Ok(Self::new(Box::new(writer)))
  }

  pub fn write(&mut self, name: &str, seq: &str) -> Result<(), Report> {
    write!(self.writer, ">{name}\n{seq}\n")?;
    Ok(())
  }

  pub fn flush(&mut self) -> Result<(), Report> {
    self.writer.flush()?;
    Ok(())
  }
}
