use crate::io::compression::{Compressor, Decompressor};
use crate::io::fs::ensure_dir;
use eyre::{Report, WrapErr};
use log::info;
use std::error::Error;
use std::fs::File;
use std::io::{self, BufRead, BufReader, BufWriter, ErrorKind, Stdout, Write, stdin, stdout};
use std::iter::successors;
use std::path::Path;

pub const DEFAULT_FILE_BUF_SIZE: usize = 256 * 1024;

/// Open stdin
pub fn open_stdin() -> Result<Box<dyn BufRead>, Report> {
  info!("Reading from standard input");

  #[cfg(not(target_arch = "wasm32"))]
  non_wasm::warn_if_tty();

  Ok(Box::new(BufReader::new(stdin())))
}

/// Open file for reading given a filepath. If the filepath is None, then read from stdin.
pub fn open_file_or_stdin<P: AsRef<Path>>(filepath: Option<&P>) -> Result<Box<dyn BufRead>, Report> {
  match filepath {
    Some(filepath) => {
      let filepath = filepath.as_ref();
      if is_path_stdin(filepath) {
        open_stdin()
      } else {
        let file = File::open(filepath).wrap_err_with(|| format!("When opening file {}", filepath.display()))?;
        let buf_file = BufReader::with_capacity(DEFAULT_FILE_BUF_SIZE, file);
        let decompressor = Decompressor::from_path(buf_file, filepath)?;
        let buf_decompressor = BufReader::with_capacity(DEFAULT_FILE_BUF_SIZE, decompressor);
        Ok(Box::new(buf_decompressor))
      }
    }
    None => open_stdin(),
  }
}

/// Open stdout for writing
pub fn open_stdout() -> StdoutWriter<BufWriter<Stdout>> {
  StdoutWriter::new(BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, stdout()))
}

/// Open file for writing. If the path does not exist it will be created recursively. If the path is stdout, then
/// write to stdout.
pub fn create_file_or_stdout(filepath: impl AsRef<Path>) -> Result<Box<dyn Write + Send>, Report> {
  let filepath = filepath.as_ref();

  if is_path_stdout(filepath) {
    info!("File path is '{}'. Writing to standard output.", filepath.display());
    return Ok(Box::new(open_stdout()));
  }

  ensure_dir(filepath)?;
  let file = File::create(filepath).wrap_err_with(|| format!("When creating file: {}", filepath.display()))?;
  let buf_file = BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, file);
  let compressor = Compressor::from_path(buf_file, filepath)?;
  let buf_compressor = BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, compressor);
  Ok(Box::new(buf_compressor))
}

/// Writer to stdout. When the reader closes stdout, as `head` does in `nextclade run --output-fasta - | head`, its
/// errors have the cause `StdoutClosed`, so that the caller can tell a closed stdout from other write errors with
/// `is_stdout_closed`.
pub struct StdoutWriter<W: Write> {
  inner: W,
}

impl<W: Write> StdoutWriter<W> {
  /// Treat `inner` as stdout
  pub const fn new(inner: W) -> Self {
    Self { inner }
  }
}

impl<W: Write> Write for StdoutWriter<W> {
  fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
    self.inner.write(buf).map_err(mark_stdout_closed)
  }

  fn flush(&mut self) -> io::Result<()> {
    self.inner.flush().map_err(mark_stdout_closed)
  }
}

fn mark_stdout_closed(error: io::Error) -> io::Error {
  if error.kind() == ErrorKind::BrokenPipe {
    io::Error::new(ErrorKind::BrokenPipe, StdoutClosedError)
  } else {
    error
  }
}

/// Cause of the errors of `StdoutWriter` after the reader closed stdout
#[derive(Debug, derive_more::Display)]
#[display("The reader closed the pipe")]
pub struct StdoutClosed;

impl Error for StdoutClosed {}

/// Error inside the `io::Error` of `StdoutWriter` after the reader closed stdout. `io::Error` and some wrappers,
/// such as `serde_json::Error`, report the cause of their inner error as their own cause, so the inner error
/// carries `StdoutClosed` as its cause to keep it in the error chain.
#[derive(Debug, derive_more::Display)]
#[display("Standard output is closed")]
struct StdoutClosedError;

impl Error for StdoutClosedError {
  fn source(&self) -> Option<&(dyn Error + 'static)> {
    Some(&StdoutClosed)
  }
}

/// Whether the error, or one of its causes, is a write to stdout after the reader closed it
pub fn is_stdout_closed(report: &Report) -> bool {
  report.chain().any(is_stdout_closed_error)
}

fn is_stdout_closed_error(error: &(dyn Error + 'static)) -> bool {
  // `csv::Error` does not report its inner `io::Error` as its cause
  let csv_io_error = match error.downcast_ref::<csv::Error>().map(csv::Error::kind) {
    Some(csv::ErrorKind::Io(io_error)) => io_error.source(),
    _ => None,
  };
  error.is::<StdoutClosed>() || successors(csv_io_error, |&cause| cause.source()).any(<dyn Error>::is::<StdoutClosed>)
}

pub fn is_path_stdin(filepath: impl AsRef<Path>) -> bool {
  let filepath = filepath.as_ref();
  filepath == "-" || filepath == "/dev/stdin"
}

pub fn is_path_stdout(filepath: impl AsRef<Path>) -> bool {
  let filepath = filepath.as_ref();
  filepath == "-" || filepath == "/dev/stdout"
}

#[cfg(not(target_arch = "wasm32"))]
mod non_wasm {
  use log::warn;
  use std::io::IsTerminal;

  #[cfg(not(target_arch = "wasm32"))]
  const TTY_WARNING: &str = r#"Reading from standard input which is a TTY (e.g. an interactive terminal). This is likely not what you meant. Instead:

 - if you want to read fasta from the output of another program, try:

    cat /path/to/file | nextclade <your other flags>

 - if you want to read from file(s), don't forget to provide a path:

    nextclade /path/to/file
"#;

  pub(super) fn warn_if_tty() {
    if std::io::stdin().is_terminal() {
      warn!("{TTY_WARNING}");
    }
  }
}
