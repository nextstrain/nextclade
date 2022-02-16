use crate::make_error;
use eyre::Report;

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
    self.index = 0;
  }

  pub fn is_empty(&self) -> bool {
    self.seq_name.is_empty() && self.seq_name.is_empty() && self.index == 0
  }
}

#[derive(Debug)]
pub struct FastaReader<R: std::io::BufRead> {
  reader: R,
  line: String,
}

impl<R: std::io::BufRead> FastaReader<R> {
  pub fn new(reader: R) -> Self {
    Self {
      reader,
      line: String::new(),
    }
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
