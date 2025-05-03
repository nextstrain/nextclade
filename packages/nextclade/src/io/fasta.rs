use crate::alphabet::aa::from_aa_seq;
use crate::constants::REVERSE_COMPLEMENT_SUFFIX;
use crate::gene::gene_map::GeneMap;
use crate::io::compression::Decompressor;
use crate::io::concat::Concat;
use crate::io::file::{create_file_or_stdout, open_file_or_stdin, open_stdin};
use crate::translate::translate_genes::CdsTranslation;
use crate::utils::string::truncate_with_ellipsis;
use crate::{make_error, make_internal_error};
use color_eyre::{Section, SectionExt};
use eyre::{Report, WrapErr};
use log::{info, trace};
use serde::{Deserialize, Serialize};
use std::collections::BTreeMap;
use std::io::{BufRead, BufReader};
use std::path::{Path, PathBuf};
use std::str::FromStr;
use tinytemplate::TinyTemplate;

pub const fn is_char_allowed(c: char) -> bool {
  c.is_ascii_alphabetic() || c == '*'
}

#[derive(Clone, Default, Debug, Deserialize, Serialize, schemars::JsonSchema, Eq, PartialEq)]
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

  pub fn from_str(contents: &'a impl AsRef<str>) -> Result<Self, Report> {
    let reader = contents.as_ref().as_bytes();
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

    let concat = Concat::with_delimiter(readers.into_iter(), Some(b"\n".to_vec()));
    let concat_buf = BufReader::new(concat);

    Ok(Self::new(Box::new(concat_buf)))
  }

  #[allow(clippy::string_slice)]
  pub fn read(&mut self, record: &mut FastaRecord) -> Result<(), Report> {
    record.clear();

    if self.line.is_empty() {
      loop {
        self.line.clear();

        let n_bytes = self.reader.read_line(&mut self.line)?;
        if n_bytes == 0 {
          return Ok(());
        }

        if !self.line.trim_end().is_empty() {
          break;
        }
      }
    }

    if !self.line.starts_with('>') {
      return make_error!("Expected character '>' at record start.");
    }

    self.line[1..].trim().clone_into(&mut record.seq_name);

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
        .filter(|c| is_char_allowed(*c))
        .map(|c| c.to_ascii_uppercase());

      record.seq.extend(fragment);
    }

    record.index = self.index;
    self.index += 1;

    Ok(())
  }
}

pub fn read_many_fasta<P: AsRef<Path>>(filepaths: &[P]) -> Result<Vec<FastaRecord>, Report> {
  let mut reader = FastaReader::from_paths(filepaths)?;
  let mut fasta_records = Vec::<FastaRecord>::new();

  loop {
    let mut record = FastaRecord::default();
    reader.read(&mut record)?;
    if record.is_empty() {
      break;
    }
    fasta_records.push(record);
  }

  Ok(fasta_records)
}

pub fn read_one_fasta_from_file(filepath: impl AsRef<Path>) -> Result<FastaRecord, Report> {
  let filepath = filepath.as_ref();
  let reader = FastaReader::from_path(filepath)?;
  read_one_fasta_from_fasta_reader(reader).wrap_err_with(|| format!("When reading file {filepath:?}"))
}

pub fn read_one_fasta_from_str(contents: impl AsRef<str>) -> Result<FastaRecord, Report> {
  let contents = contents.as_ref();
  let reader = FastaReader::from_str(&contents)?;
  read_one_fasta_from_fasta_reader(reader)
    .wrap_err("When reading FASTA string")
    .with_section(|| truncate_with_ellipsis(contents, 100).header("FASTA string was:"))
}

pub fn read_one_fasta_from_reader(reader: impl BufRead) -> Result<FastaRecord, Report> {
  let reader = FastaReader::new(Box::new(reader));
  read_one_fasta_from_fasta_reader(reader)
}

pub fn read_one_fasta_from_fasta_reader(mut reader: FastaReader) -> Result<FastaRecord, Report> {
  let mut record = FastaRecord::default();
  reader.read(&mut record)?;
  if record.is_empty() {
    return make_error!("Expected exactly one FASTA record, but found none");
  }
  if record.seq.is_empty() {
    return make_error!("Sequence is empty, but a non-empty sequence was expected");
  }
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
  cds: &'a str,
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
      .iter_cdses()
      .map(|cds| -> Result<_, Report> {
        let template_context = OutputTranslationsTemplateContext { cds: &cds.name };
        let rendered_path = tt
          .render("output_translations", &template_context)
          .wrap_err_with(|| format!("When rendering output translations path template: '{output_translations}', using context: {template_context:?}"))?;
        let out_gene_fasta_path = PathBuf::from_str(&rendered_path).wrap_err_with(|| format!("Invalid output translations path: '{rendered_path}'"))?;
        trace!("Creating fasta writer to file {out_gene_fasta_path:#?}");
        let writer = FastaWriter::from_path(&out_gene_fasta_path)?;
        Ok((cds.name.clone(), writer))
      })
      .collect::<Result<FastaPeptideWritersMap, Report>>()?;

    Ok(Self { writers })
  }

  pub fn write(&mut self, seq_name: &str, translation: &CdsTranslation) -> Result<(), Report> {
    match self.writers.get_mut(&translation.name) {
      None => make_internal_error!("Fasta file writer not found for gene '{}'", &translation.name),
      Some(writer) => writer.write(seq_name, &from_aa_seq(&translation.seq), false),
    }
  }
}

pub fn parse_fasta_header(header: &str) -> (String, String) {
  header
    .split_once(' ')
    .map(|(seqid, desc)| (seqid.to_owned(), desc.to_owned()))
    .unwrap_or((header.to_owned(), String::new()))
}

#[cfg(test)]
mod tests {
  use super::*;
  use crate::o;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::io::Cursor;

  #[rstest]
  fn test_fasta_reader_fail_on_non_fasta() {
    let data =
      b"This is not a valid FASTA string.\nIt is not empty, and not entirely whitespace\nbut does not contain 'greater than' character.\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));
    let mut record = FastaRecord::new();
    assert_eq!(
      reader.read(&mut record).unwrap_err().to_string(),
      "Expected character '>' at record start."
    );
  }

  #[rstest]
  fn test_fasta_reader_read_empty() {
    let data = b"";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert!(record.is_empty());
  }

  #[rstest]
  fn test_fasta_reader_read_whitespace_only() {
    let data = b"\n \n \n\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert!(record.is_empty());
  }

  #[rstest]
  fn test_fasta_reader_read_single_record() {
    let data = b">seq1\nATCG\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(record.seq_name, "seq1");
    assert_eq!(record.seq, "ATCG");
    assert_eq!(record.index, 0);
  }

  #[rstest]
  fn test_fasta_reader_read_single_record_with_leading_newline() {
    let data = b"\n>seq1\nATCG\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(record.seq_name, "seq1");
    assert_eq!(record.seq, "ATCG");
    assert_eq!(record.index, 0);
  }

  #[rstest]
  fn test_fasta_reader_read_single_record_with_multiple_leading_newlines() {
    let data = b"\n\n\n>seq1\nATCG\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(record.seq_name, "seq1");
    assert_eq!(record.seq, "ATCG");
    assert_eq!(record.index, 0);
  }

  #[rstest]
  fn test_fasta_reader_read_single_record_without_trailing_newline() {
    let data = b">seq1\nATCG";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(record.seq_name, "seq1");
    assert_eq!(record.seq, "ATCG");
    assert_eq!(record.index, 0);
  }

  #[rstest]
  fn test_fasta_reader_read_multiple_records() {
    let data = b">seq1\nATCG\n>seq2\nGCTA\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record1 = FastaRecord::new();
    reader.read(&mut record1).unwrap();

    let mut record2 = FastaRecord::new();
    reader.read(&mut record2).unwrap();

    assert_eq!(record1.seq_name, "seq1");
    assert_eq!(record1.seq, "ATCG");
    assert_eq!(record1.index, 0);

    assert_eq!(record2.seq_name, "seq2");
    assert_eq!(record2.seq, "GCTA");
    assert_eq!(record2.index, 1);
  }

  #[rstest]
  fn test_fasta_reader_read_empty_lines_between_records() {
    let data = b"\n>seq1\n\nATCG\n\n\n>seq2\nGCTA\n\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record1 = FastaRecord::new();
    reader.read(&mut record1).unwrap();

    let mut record2 = FastaRecord::new();
    reader.read(&mut record2).unwrap();

    assert_eq!(record1.seq_name, "seq1");
    assert_eq!(record1.seq, "ATCG");
    assert_eq!(record1.index, 0);

    assert_eq!(record2.seq_name, "seq2");
    assert_eq!(record2.seq, "GCTA");
    assert_eq!(record2.index, 1);
  }

  #[rstest]
  fn test_fasta_reader_read_with_trailing_newline() {
    let data = b">seq1\nATCG\n\n";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(record.seq_name, "seq1");
    assert_eq!(record.seq, "ATCG");
    assert_eq!(record.index, 0);
  }

  #[rstest]
  fn test_fasta_reader_example_1() {
    let data = b"\n\n>a\nACGCTCGATC\n\n>b\nCCGCGC";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("a"),
        seq: o!("ACGCTCGATC"),
        index: 0,
      }
    );

    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("b"),
        seq: o!("CCGCGC"),
        index: 1,
      }
    );
  }

  #[rstest]
  fn test_fasta_reader_example_2() {
    let data = b">a\nACGCTCGATC\n>b\nCCGCGC\n>c";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("a"),
        seq: o!("ACGCTCGATC"),
        index: 0,
      }
    );

    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("b"),
        seq: o!("CCGCGC"),
        index: 1,
      }
    );

    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("c"),
        seq: o!(""),
        index: 2,
      }
    );
  }

  #[rstest]
  fn test_fasta_reader_example_3() {
    let data = b">a\nACGCTCGATC\n>b\n>c\nCCGCGC";
    let mut reader = FastaReader::new(Box::new(Cursor::new(data)));

    let mut record = FastaRecord::new();
    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("a"),
        seq: o!("ACGCTCGATC"),
        index: 0,
      }
    );

    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("b"),
        seq: o!(""),
        index: 1,
      }
    );

    reader.read(&mut record).unwrap();

    assert_eq!(
      record,
      FastaRecord {
        seq_name: o!("c"),
        seq: o!("CCGCGC"),
        index: 2,
      }
    );
  }
}
