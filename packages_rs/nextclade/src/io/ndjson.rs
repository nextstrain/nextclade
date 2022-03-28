use crate::io::fs::ensure_dir;
use eyre::{Report, WrapErr};
use std::fs::File;
use std::io::{BufReader, BufWriter, LineWriter, Write};
use std::path::{Path, PathBuf};

pub struct NdjsonWriter {
  filepath: PathBuf,
  line_writer: LineWriter<BufWriter<File>>,
}

impl NdjsonWriter {
  pub fn new(filepath: impl AsRef<Path>) -> Result<Self, Report> {
    const BUF_SIZE: usize = 2 * 1024 * 1024;

    let filepath = filepath.as_ref().to_owned();

    ensure_dir(&filepath)?;

    let file = File::create(&filepath).wrap_err_with(|| format!("When writing file: {filepath:#?}"))?;
    let buf_writer = BufWriter::with_capacity(BUF_SIZE, file);
    let line_writer = LineWriter::new(buf_writer);

    Ok(Self { filepath, line_writer })
  }

  pub fn write<T: serde::Serialize>(&mut self, entry: &T) -> Result<(), Report> {
    serde_json::to_writer(&mut self.line_writer, &entry).wrap_err("When serializing an entry to ndjson")?;

    self
      .line_writer
      .write_all(b"\n")
      .wrap_err_with(|| format!("When writing ndjson entry to file {:#?}", &self.filepath))
  }
}
