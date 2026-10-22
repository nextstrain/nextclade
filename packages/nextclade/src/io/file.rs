use crate::io::compression::{Compressor, Decompressor};
use crate::io::fs::ensure_dir;
use eyre::{Report, WrapErr};
use log::{info, warn};
use std::error::Error;
use std::fs::File;
use std::io::{self, BufRead, BufReader, BufWriter, ErrorKind, Read, Stdout, Write, stdin, stdout};
use std::iter::successors;
use std::path::{Path, PathBuf};

pub const DEFAULT_FILE_BUF_SIZE: usize = 256 * 1024;

/// Open stdin. Read errors name standard input.
pub fn open_stdin() -> Result<Box<dyn BufRead>, Report> {
  info!("Reading from standard input");

  #[cfg(not(target_arch = "wasm32"))]
  non_wasm::warn_if_tty();

  Ok(Box::new(BufReader::new(InputReader::new(InputName::Stdin, stdin()))))
}

/// Open file for reading given a filepath. If the filepath is None, then read from stdin. Compressed files are
/// decompressed. Read errors name the file, see `is_input_read_error`.
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
        let reader = InputReader::new(InputName::File(filepath.to_owned()), decompressor);
        Ok(Box::new(BufReader::with_capacity(DEFAULT_FILE_BUF_SIZE, reader)))
      }
    }
    None => open_stdin(),
  }
}

/// Whether the error, or one of its causes, is a read error of a reader from `open_file_or_stdin` or `open_stdin`.
/// Such an error names the input already.
pub fn is_input_read_error(report: &Report) -> bool {
  report.chain().any(|error| {
    error
      .downcast_ref::<io::Error>()
      .and_then(io::Error::get_ref)
      .is_some_and(<dyn Error + Send + Sync>::is::<InputReadError>)
  })
}

/// Reader of an input that names the input in its read errors
struct InputReader<R: Read> {
  name: InputName,
  inner: R,
}

impl<R: Read> InputReader<R> {
  const fn new(name: InputName, inner: R) -> Self {
    Self { name, inner }
  }
}

impl<R: Read> Read for InputReader<R> {
  fn read(&mut self, buf: &mut [u8]) -> io::Result<usize> {
    self.inner.read(buf).map_err(|error| {
      io::Error::new(
        error.kind(),
        InputReadError {
          input: self.name.clone(),
          source: error,
        },
      )
    })
  }
}

/// Input of an `InputReader`, as error messages name it
#[derive(Clone, Debug, derive_more::Display)]
enum InputName {
  #[display("standard input")]
  Stdin,
  #[display("file {}", _0.display())]
  File(PathBuf),
}

/// Error of a read from an input, which names the input
#[derive(Debug, derive_more::Display)]
#[display("When reading {input}")]
struct InputReadError {
  input: InputName,
  source: io::Error,
}

impl Error for InputReadError {
  fn source(&self) -> Option<&(dyn Error + 'static)> {
    Some(&self.source)
  }
}

/// Open stdout for writing
pub fn open_stdout() -> StdoutWriter<BufWriter<Stdout>> {
  StdoutWriter::new(BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, stdout()))
}

/// Open file for writing. If the path does not exist it will be created recursively. If the path is stdout, then
/// write to stdout. Call `OutputWriter::finish` after the last write.
pub fn create_file_or_stdout(filepath: impl AsRef<Path>) -> Result<OutputWriter, Report> {
  let filepath = filepath.as_ref();

  if is_path_stdout(filepath) {
    info!("File path is '{}'. Writing to standard output.", filepath.display());
    return Ok(OutputWriter::new(
      OutputName::Stdout,
      OutputTarget::Stdout(open_stdout()),
    ));
  }

  ensure_dir(filepath)?;
  let file = File::create(filepath).wrap_err_with(|| format!("When creating file: {}", filepath.display()))?;
  let buf_file = BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, file);
  let compressor = Compressor::from_path(buf_file, filepath)?;
  let writer = BufWriter::with_capacity(DEFAULT_FILE_BUF_SIZE, compressor);
  Ok(OutputWriter::new(
    OutputName::File(filepath.to_owned()),
    OutputTarget::File(writer),
  ))
}

/// Writer of an output file or of stdout, created by `create_file_or_stdout`.
///
/// Call `finish` after the last write: it writes the buffered data and the end of a compressed stream, and returns
/// their errors. Write errors name the output. A writer dropped without `finish` and without a write error logs a
/// warning that its output is incomplete.
#[must_use = "call `finish` after the last write, to complete the output and report its errors"]
pub struct OutputWriter {
  name: OutputName,
  target: OutputTarget,
  is_finished: bool,
  has_error: bool,
}

impl OutputWriter {
  const fn new(name: OutputName, target: OutputTarget) -> Self {
    Self {
      name,
      target,
      is_finished: false,
      has_error: false,
    }
  }

  /// Write the buffered data and the end of a compressed stream
  pub fn finish(mut self) -> Result<(), Report> {
    self.is_finished = true;
    let result = match &mut self.target {
      OutputTarget::Stdout(writer) => writer.flush(),
      OutputTarget::File(writer) => writer.flush().and_then(|()| writer.get_mut().finish()),
    };
    result.map_err(|error| Report::new(output_write_error(&self.name, error)))
  }

  /// Name the output in the error, and remember that the output is incomplete
  fn check<T>(&mut self, result: io::Result<T>) -> io::Result<T> {
    result.map_err(|error| {
      self.has_error = true;
      output_write_error(&self.name, error)
    })
  }
}

impl Write for OutputWriter {
  fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
    let result = match &mut self.target {
      OutputTarget::Stdout(writer) => writer.write(buf),
      OutputTarget::File(writer) => writer.write(buf),
    };
    self.check(result)
  }

  fn flush(&mut self) -> io::Result<()> {
    let result = match &mut self.target {
      OutputTarget::Stdout(writer) => writer.flush(),
      OutputTarget::File(writer) => writer.flush(),
    };
    self.check(result)
  }
}

impl Drop for OutputWriter {
  fn drop(&mut self) {
    if !self.is_finished && !self.has_error {
      warn!(
        "The output to {} is incomplete, because writing stopped before its end",
        self.name
      );
    }
  }
}

/// Log a warning that the output to `filepath` is missing, because writing stopped before its end
pub fn warn_missing_output(filepath: impl AsRef<Path>) {
  warn!(
    "The output to {} is missing, because writing stopped before its end",
    OutputName::from_path(filepath)
  );
}

/// Output of an `OutputWriter`, as error messages name it
#[derive(Clone, Debug, derive_more::Display)]
enum OutputName {
  #[display("standard output")]
  Stdout,
  #[display("file {}", _0.display())]
  File(PathBuf),
}

impl OutputName {
  fn from_path(filepath: impl AsRef<Path>) -> Self {
    let filepath = filepath.as_ref();
    if is_path_stdout(filepath) {
      Self::Stdout
    } else {
      Self::File(filepath.to_owned())
    }
  }
}

enum OutputTarget {
  Stdout(StdoutWriter<BufWriter<Stdout>>),
  File(BufWriter<Compressor<'static>>),
}

/// Error of a write to an output, which names the output
#[derive(Debug, derive_more::Display)]
#[display("When writing to {output}")]
struct OutputWriteError {
  output: OutputName,
  source: io::Error,
}

impl Error for OutputWriteError {
  fn source(&self) -> Option<&(dyn Error + 'static)> {
    Some(&self.source)
  }
}

/// Name the output in a write error. A closed stdout stays unnamed: it ends the output, and is not reported.
fn output_write_error(output: &OutputName, error: io::Error) -> io::Error {
  if is_stdout_closed_io_error(&error) {
    return error;
  }
  io::Error::new(
    error.kind(),
    OutputWriteError {
      output: output.clone(),
      source: error,
    },
  )
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
  error.is::<StdoutClosed>()
}

fn is_stdout_closed_io_error(error: &io::Error) -> bool {
  let error: &(dyn Error + 'static) = error;
  successors(Some(error), |&cause| cause.source()).any(is_stdout_closed_error)
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
