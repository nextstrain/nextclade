use crate::constants::REVERSE_COMPLEMENT_SUFFIX;
use crate::io::aa::from_aa_seq;
use crate::io::compression::Decompressor;
use crate::io::concat::concat;
use crate::io::file::{create_file_or_stdout, open_file_or_stdin, open_stdin};
use crate::io::gene_map::GeneMap;
use crate::translate::translate_genes::Translation;
use crate::{make_error, make_internal_error};
use eyre::{Report, WrapErr};
use log::{info, trace};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::fmt::Display;
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use tinytemplate::TinyTemplate;

pub const fn is_char_allowed(c: char) -> bool {
  c.is_ascii_alphabetic() || c == '*'
}

#[derive(Clone, Default, Debug, Deserialize, Serialize)]
#[serde(rename_all = "camelCase")]
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

pub struct FastaReader<'a> {
  reader: Box<dyn BufRead + 'a>,
  line: String,
  index: usize,
}

impl<'a> FastaReader<'a> {
  pub fn new(reader: Box<dyn BufRead + 'a>) -> Self {
    Self {
      reader,
      line: String::new(),
      index: 0,
    }
  }

  pub fn from_str(contents: &'a str) -> Result<Self, Report> {
    let reader = contents.as_bytes();
    Ok(Self::new(Box::new(reader)))
  }

  pub fn from_str_and_path(contents: &'static str, filepath: impl AsRef<Path>) -> Result<Self, Report> {
    let decompressor = Decompressor::from_str_and_path(contents, filepath)?;
    let reader = BufReader::new(decompressor);
    Ok(Self::new(Box::new(reader)))
  }

  pub fn from_path(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    Self::from_paths(&[filepath])
  }

  /// Reads multiple files sequentially given a set of paths
  pub fn from_paths<P: AsRef<Path>>(filepaths: &[P]) -> Result<Self, Report> {
    if filepaths.is_empty() {
      info!("Reading input fasta from standard input");
      return Ok(Self::new(open_stdin()?));
    }

    let readers: Vec<Box<dyn BufRead + 'a>> = filepaths
      .iter()
      .map(|filepath| -> Result<Box<dyn BufRead + 'a>, Report> { open_file_or_stdin(&Some(filepath)) })
      .collect::<Result<Vec<Box<dyn BufRead + 'a>>, Report>>()?;

    let concat = concat(readers.into_iter());
    let concat_buf = BufReader::new(concat);

    Ok(Self::new(Box::new(concat_buf)))
  }

  #[allow(clippy::string_slice)]
  pub fn read(&mut self, record: &mut FastaRecord) -> Result<(), Report> {
    record.clear();

    if self.line.is_empty() {
      self.reader.read_line(&mut self.line)?;
      if self.line.is_empty() {
        return Ok(());
      }
    }

    if !self.line.starts_with('>') {
      return make_error!("Expected character '>' at record start.");
    }

    record.seq_name = self.line[1..].trim().to_owned();

    loop {
      self.line.clear();
      self.reader.read_line(&mut self.line)?;
      if self.line.is_empty() || self.line.starts_with('>') {
        break;
      }

      let fragment = self
        .line
        .trim_end()
        .chars()
        .into_iter()
        .filter(|c| is_char_allowed(*c))
        .map(|c| c.to_ascii_uppercase());

      record.seq.extend(fragment);
    }

    record.index = self.index;
    self.index += 1;

    Ok(())
  }
}

pub fn read_one_fasta(filepath: impl AsRef<Path>) -> Result<FastaRecord, Report> {
  let filepath = filepath.as_ref();
  let mut reader = FastaReader::from_path(filepath)?;
  let mut record = FastaRecord::default();
  reader.read(&mut record)?;
  Ok(record)
}

pub fn read_many_fasta<P: AsRef<Path>>(filepaths: &[P]) -> Result<Vec<FastaRecord>, Report> {
  let mut reader = FastaReader::from_paths(filepaths)?;
  let mut fasta_records = Vec::<FastaRecord>::new();

  loop {
    let mut record = FastaRecord::default();
    reader.read(&mut record).unwrap();
    if record.is_empty() {
      break;
    }
    fasta_records.push(record);
  }

  Ok(fasta_records)
}

pub fn read_one_fasta_str(contents: &str) -> Result<FastaRecord, Report> {
  let mut reader = FastaReader::from_str(contents)?;
  let mut record = FastaRecord::default();
  reader.read(&mut record)?;
  Ok(record)
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
    Ok(Self::new(create_file_or_stdout(filepath)?))
  }

  pub fn write(&mut self, seq_name: &str, seq: &str, is_reverse_complement: bool) -> Result<(), Report> {
    let seq_name = if is_reverse_complement {
      format!("{seq_name}{REVERSE_COMPLEMENT_SUFFIX}")
    } else {
      seq_name.to_owned()
    };

    write!(self.writer, ">{seq_name}\n{seq}\n")?;
    Ok(())
  }

  pub fn flush(&mut self) -> Result<(), Report> {
    self.writer.flush()?;
    Ok(())
  }
}

#[derive(Clone, Debug, Serialize)]
struct OutputTranslationsTemplateContext<'a> {
  gene: &'a str,
}

pub type FastaPeptideWritersMap = BTreeMap<String, FastaWriter>;

/// Writes peptides, each into a separate fasta file
pub struct FastaPeptideWriter {
  writers: FastaPeptideWritersMap,
}

impl FastaPeptideWriter {
  pub fn new(gene_map: &GeneMap, output_translations: impl AsRef<str>) -> Result<Self, Report> {
    let output_translations = output_translations.as_ref();

    let mut tt = TinyTemplate::new();
    tt.add_template("output_translations", output_translations)
      .wrap_err_with(|| format!("When parsing template: {output_translations}"))?;

    let writers = gene_map
      .iter()
      .map(|(gene_name, _)| -> Result<_, Report> {
        let template_context = OutputTranslationsTemplateContext { gene: gene_name };
        let rendered_path = tt
          .render("output_translations", &template_context)
          .wrap_err_with(|| format!("When rendering output translations path template: '{output_translations}', using context: {template_context:?}"))?;
        let out_gene_fasta_path = PathBuf::from_str(&rendered_path).wrap_err_with(|| format!("Invalid output translations path: '{rendered_path}'"))?;
        trace!("Creating fasta writer to file {out_gene_fasta_path:#?}");
        let writer = FastaWriter::from_path(&out_gene_fasta_path)?;
        Ok((gene_name.clone(), writer))
      })
      .collect::<Result<FastaPeptideWritersMap, Report>>()?;

    Ok(Self { writers })
  }

  pub fn write(&mut self, seq_name: &str, translation: &Translation) -> Result<(), Report> {
    match self.writers.get_mut(&translation.gene_name) {
      None => make_internal_error!("Fasta file writer not found for gene '{}'", &translation.gene_name),
      Some(writer) => writer.write(seq_name, &from_aa_seq(&translation.seq), false),
    }
  }
}
