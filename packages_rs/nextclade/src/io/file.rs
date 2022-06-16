use crate::io::fs::ensure_dir;
use eyre::{Report, WrapErr};
use log::info;
use std::fmt::Debug;
use std::fs::File;
use std::io::{stdout, BufWriter, Write};
use std::path::{Path, PathBuf};

pub fn create_file(filepath: impl AsRef<Path>) -> Result<Box<dyn Write + Sync + Send>, Report> {
  let filepath = filepath.as_ref();

  let file: Box<dyn Write + Sync + Send> = if filepath == PathBuf::from("-") {
    info!("File path is '-', writing to standard output");
    Box::new(stdout())
  } else {
    ensure_dir(&filepath)?;
    Box::new(File::create(&filepath).wrap_err_with(|| format!("When creating file: {filepath:?}"))?)
  };

  let writer = BufWriter::with_capacity(32 * 1024, file);

  Ok(Box::new(writer))
}
