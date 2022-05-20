use crate::io::fs::ensure_dir;
use eyre::{Report, WrapErr};
use std::fmt::Debug;
use std::fs::File;
use std::io::{BufReader, BufWriter, LineWriter, Write};
use std::path::{Path, PathBuf};

pub struct NdjsonWriter<W: Write + Debug + Send + Sync> {
  line_writer: LineWriter<W>,
}

impl<W: 'static + Write + Debug + Send + Sync> NdjsonWriter<W> {
  pub fn new(writer: W) -> Result<Self, Report> {
    let line_writer = LineWriter::new(writer);
    Ok(Self { line_writer })
  }

  pub fn write<T: serde::Serialize>(&mut self, entry: &T) -> Result<(), Report> {
    serde_json::to_writer(&mut self.line_writer, &entry).wrap_err("When serializing an entry to ndjson")?;
    self.line_writer.write_all(b"\n")?;
    Ok(())
  }

  pub fn into_inner(self) -> Result<W, Report> {
    let inner = self.line_writer.into_inner()?;
    Ok(inner)
  }
}

pub struct NdjsonFileWriter {
  filepath: PathBuf,
  ndjson_writer: NdjsonWriter<BufWriter<File>>,
}

impl NdjsonFileWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    const BUF_SIZE: usize = 2 * 1024 * 1024;

    let filepath = filepath.as_ref().to_owned();

    ensure_dir(&filepath)?;

    let file = File::create(&filepath).wrap_err_with(|| format!("When writing file: {filepath:#?}"))?;
    let buf_writer = BufWriter::with_capacity(BUF_SIZE, file);

    let line_writer = NdjsonWriter::new(buf_writer)?;

    Ok(Self {
      filepath,
      ndjson_writer: line_writer,
    })
  }

  pub fn write<T: serde::Serialize>(&mut self, entry: &T) -> Result<(), Report> {
    self
      .ndjson_writer
      .write(entry)
      .wrap_err_with(|| format!("When writing ndjson entry to file {:#?}", &self.filepath))
  }
}
