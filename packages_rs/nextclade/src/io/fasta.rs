use crate::gene::gene_map::GeneMap;
use crate::io::aa::from_aa_seq;
use crate::io::fs::ensure_dir;
use crate::translate::translate_genes::Translation;
use crate::{make_error, make_internal_error};
use eyre::{Report, WrapErr};
use log::trace;
use std::collections::HashMap;
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

// Writes sequences into given fasta file
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

/// Writes peptides, each into a separate fasta file
pub struct FastaPeptideWriter {
  writers: HashMap<String, FastaWriter>,
}

impl FastaPeptideWriter {
  pub fn new(
    gene_map: &GeneMap,
    output_dir: impl AsRef<Path>,
    output_basename: impl AsRef<str>,
  ) -> Result<Self, Report> {
    let output_dir = output_dir.as_ref();
    let output_basename = output_basename.as_ref();

    let writers = gene_map
      .iter()
      .map(|(gene_name, _)| -> Result<_, Report> {
        let out_gene_fasta_path = output_dir.join(format!("{output_basename}.gene.{gene_name}.fasta"));
        trace!("Creating fasta writer to file {out_gene_fasta_path:#?}");
        let writer = FastaWriter::from_path(&out_gene_fasta_path)?;
        Ok((gene_name.clone(), writer))
      })
      .collect::<Result<HashMap<String, FastaWriter>, Report>>()?;

    Ok(Self { writers })
  }

  pub fn write(&mut self, seq_name: &str, translation: &Translation) -> Result<(), Report> {
    match self.writers.get_mut(&translation.gene_name) {
      None => make_internal_error!("Fasta file writer not found for gene '{}'", &translation.gene_name),
      Some(writer) => writer.write(seq_name, &from_aa_seq(&translation.seq)),
    }
  }
}
