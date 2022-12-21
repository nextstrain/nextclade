use crate::io::fs::ensure_dir;
use eyre::{Report, WrapErr};
use log::{info, warn};
use std::fmt::Debug;
use std::fs::File;
use std::io::{stdin, stdout, BufRead, BufReader, BufWriter, Write};
use std::path::{Path, PathBuf};

use crate::io::compression::{Compressor, Decompressor};
#[cfg(not(target_arch = "wasm32"))]
use atty::{is as is_tty, Stream};

pub const DEFAULT_FILE_BUF_SIZE: usize = 256 * 1024;

const TTY_WARNING: &str = r#"Reading from standard input which is a TTY (e.g. an interactive terminal). This is likely not what you meant. Instead:

 - if you want to read fasta from the output of another program, try:

    cat /path/to/file | nextclade <your other flags>

 - if you want to read from file(s), don't forget to provide a path:

    nextclade /path/to/file
"#;

/// Open stdin
pub fn open_stdin() -> Result<Box<dyn BufRead>, Report> {
  info!("Reading from standard input");

  #[cfg(not(target_arch = "wasm32"))]
  if is_tty(Stream::Stdin) {
    warn!("{TTY_WARNING}");
  }

  Ok(Box::new(BufReader::new(stdin())))
}

/// Open file for reading given a filepath. If the filepath is None, then read from stdin.
pub fn open_file_or_stdin<P: AsRef<Path>>(filepath: &Option<P>) -> Result<Box<dyn BufRead>, Report> {
  match filepath {
    Some(filepath) => {
      let filepath = filepath.as_ref();
      if is_path_stdin(filepath) {
        open_stdin()
      } else {
        let file = File::open(filepath).wrap_err_with(|| format!("When opening file '{filepath:?}'"))?;
        let buf_file = BufReader::with_capacity(DEFAULT_FILE_BUF_SIZE, file);
        let decompressor = Decompressor::from_path(buf_file, filepath)?;
        let buf_decompressor = BufReader::with_capacity(DEFAULT_FILE_BUF_SIZE, decompressor);
        Ok(Box::new(buf_decompressor))
      }
    }
    None => open_stdin(),
  }
}

/// Open file for writing. If the path does not exist it will be created recursively.
pub fn create_file_or_stdout(filepath: impl AsRef<Path>) -> Result<Box<dyn Write + Send>, Report> {
  let filepath = filepath.as_ref();

  let file: Box<dyn Write + Sync + Send> = if is_path_stdout(filepath) {
    info!("File path is {filepath:?}. Writing to standard output.");
    Box::new(BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, stdout()))
  } else {
    ensure_dir(filepath)?;
    Box::new(File::create(filepath).wrap_err_with(|| format!("When creating file: '{filepath:?}'"))?)
  };

  let buf_file = BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, file);
  let compressor = Compressor::from_path(buf_file, filepath)?;
  let buf_compressor = BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, compressor);
  Ok(Box::new(buf_compressor))
}

pub fn is_path_stdin(filepath: impl AsRef<Path>) -> bool {
  let filepath = filepath.as_ref();
  filepath == PathBuf::from("-") || filepath == PathBuf::from("/dev/stdin")
}

pub fn is_path_stdout(filepath: impl AsRef<Path>) -> bool {
  let filepath = filepath.as_ref();
  filepath == PathBuf::from("-") || filepath == PathBuf::from("/dev/stdout")
}
