#[cfg(test)]
mod tests {
  use crate::io::fasta::read_one_fasta_from_file;
  #[cfg(unix)]
  use crate::io::file::is_stdout_closed;
  use crate::io::file::{create_file_or_stdout, open_file_or_stdin};
  use crate::utils::error::report_to_string;
  use eyre::Report;
  use helpers::truncated_gzip_fasta;
  #[cfg(unix)]
  use helpers::{Format, Output};
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::io::{ErrorKind, Read, Write};

  #[cfg(unix)]
  #[rustfmt::skip]
  #[rstest]
  #[case::plain_closed_stdout( Format::Plain, Output::ClosedStdout, true )]
  #[case::plain_closed_fifo(   Format::Plain, Output::ClosedFifo,   false)]
  #[case::plain_stdout_error(  Format::Plain, Output::StdoutError,  false)]
  #[case::json_closed_stdout(  Format::Json,  Output::ClosedStdout, true )]
  #[case::json_closed_fifo(    Format::Json,  Output::ClosedFifo,   false)]
  #[case::json_stdout_error(   Format::Json,  Output::StdoutError,  false)]
  #[case::csv_closed_stdout(   Format::Csv,   Output::ClosedStdout, true )]
  #[case::csv_closed_fifo(     Format::Csv,   Output::ClosedFifo,   false)]
  #[case::csv_stdout_error(    Format::Csv,   Output::StdoutError,  false)]
  #[trace]
  fn test_file_stdout_closed_is_detected_only_for_stdout(
    #[case] format: Format,
    #[case] output: Output,
    #[case] expected: bool,
  ) {
    let dir = tempfile::tempdir().unwrap();

    let result = format.write(output.writer(dir.path()));

    assert_eq!(Some(expected), result.err().map(|report| is_stdout_closed(&report)));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::uncompressed( "txt")]
  #[case::gzip(         "gz")]
  #[case::bzip2(        "bz2")]
  #[case::xz(           "xz")]
  #[case::zstd(         "zst")]
  #[trace]
  fn test_file_output_is_complete_after_finish(#[case] extension: &str) {
    let dir = tempfile::tempdir().unwrap();
    let filepath = dir.path().join(format!("output.{extension}"));

    let mut file = create_file_or_stdout(&filepath).unwrap();
    file.write_all(b">seq\nACGT\n").unwrap();
    file.finish().unwrap();

    let mut content = String::new();
    open_file_or_stdin(Some(&filepath)).unwrap().read_to_string(&mut content).unwrap();
    assert_eq!(">seq\nACGT\n", content);
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn test_file_output_write_error_names_the_file() {
    let mut file = create_file_or_stdout("/dev/full").unwrap();
    file.write_all(b">seq\nACGT\n").unwrap();

    let result = file.finish();

    assert_eq!(
      Some("When writing to file /dev/full: No space left on device (os error 28)".to_owned()),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn test_file_compressed_output_write_error_names_the_file() {
    let dir = tempfile::tempdir().unwrap();
    let filepath = dir.path().join("output.fasta.gz");
    std::os::unix::fs::symlink("/dev/full", &filepath).unwrap();
    let mut file = create_file_or_stdout(&filepath).unwrap();
    file.write_all(b">seq\nACGT\n").unwrap();

    let result = file.finish();

    assert_eq!(
      Some(format!(
        "When writing to file {}: While flushing compressed file (Gzip): No space left on device (os error 28)",
        filepath.display()
      )),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn test_file_output_dropped_after_write_error_does_not_panic() {
    let mut file = create_file_or_stdout("/dev/full").unwrap();

    // More data than the buffers hold, so that the write reaches the file and fails before the drop
    let result = file.write_all(&vec![b'A'; 2 * crate::io::file::DEFAULT_FILE_BUF_SIZE]);
    drop(file);

    assert_eq!(
      Some("When writing to file /dev/full".to_owned()),
      result.err().map(|error| error.to_string())
    );
  }

  #[test]
  fn test_file_input_read_error_names_the_file_and_keeps_the_kind() {
    let dir = tempfile::tempdir().unwrap();
    let filepath = truncated_gzip_fasta(dir.path());

    let mut content = String::new();
    let error = open_file_or_stdin(Some(&filepath))
      .unwrap()
      .read_to_string(&mut content)
      .unwrap_err();

    let expected = (
      ErrorKind::UnexpectedEof,
      format!(
        "When reading file {}: While decompressing file (Gzip): unexpected end of file",
        filepath.display()
      ),
    );
    assert_eq!(expected, (error.kind(), report_to_string(&Report::new(error))));
  }

  #[test]
  fn test_file_fasta_read_error_names_the_file_once() {
    let dir = tempfile::tempdir().unwrap();
    let filepath = truncated_gzip_fasta(dir.path());

    let result = read_one_fasta_from_file(&filepath);

    assert_eq!(
      Some(format!(
        "When reading file {}: While decompressing file (Gzip): unexpected end of file",
        filepath.display()
      )),
      result.err().map(|report| report_to_string(&report))
    );
  }

  mod helpers {
    use crate::io::file::create_file_or_stdout;
    use std::fs::OpenOptions;
    use std::io::Write;
    use std::path::{Path, PathBuf};

    #[cfg(unix)]
    pub use closed_output::{Format, Output};

    /// Gzip-compressed FASTA file that ends in the middle of the compressed stream
    pub fn truncated_gzip_fasta(dir: &Path) -> PathBuf {
      let filepath = dir.join("input.fasta.gz");
      let mut file = create_file_or_stdout(&filepath).unwrap();
      file.write_all(b">seq\nACGT\n").unwrap();
      file.finish().unwrap();

      let file = OpenOptions::new().write(true).open(&filepath).unwrap();
      let len = file.metadata().unwrap().len();
      file.set_len(len / 2).unwrap();
      filepath
    }

    /// Outputs whose writes fail, for the tests of a closed standard output. Unix only, because one of them is a
    /// named pipe
    #[cfg(unix)]
    mod closed_output {
      use crate::io::csv::CsvStructWriter;
      use crate::io::file::{OutputWriter, StdoutWriter, create_file_or_stdout};
      use crate::io::json::{JsonPretty, json_write_impl};
      use eyre::{Report, WrapErr};
      use std::fs::File;
      use std::io::{self, ErrorKind, Write};
      use std::path::Path;
      use std::process::Command;
      use std::thread;

      /// Number of items to write: enough to fill the buffers of every writer, so that a write fails before the flush
      const NUM_ITEMS: usize = 100_000;

      #[derive(Clone, Copy, Debug)]
      pub enum Format {
        Plain,
        Json,
        Csv,
      }

      impl Format {
        /// Write many items in this format to `writer`, and flush it
        pub fn write(self, mut writer: Box<dyn Write + Send>) -> Result<(), Report> {
          match self {
            Self::Plain => (0..NUM_ITEMS)
              .try_for_each(|index| writeln!(writer, "sequence name\t{index}"))
              .and_then(|()| writer.flush())
              .wrap_err("When writing output"),
            Self::Json => {
              json_write_impl(&mut writer, &vec![("sequence name", 1); NUM_ITEMS], JsonPretty(false))?;
              writer.flush().wrap_err("When writing JSON")
            }
            Self::Csv => {
              let mut csv = CsvStructWriter::new(writer, b'\t')?;
              (0..NUM_ITEMS).try_for_each(|index| csv.write(&("sequence name", index)))?;
              csv.into_inner()?.flush().wrap_err("When writing CSV")
            }
          }
        }
      }

      #[derive(Clone, Copy, Debug)]
      pub enum Output {
        /// Stdout after the reader closed it
        ClosedStdout,
        /// Stdout that fails with another error
        StdoutError,
        /// Output file that is a named pipe whose reader closed it
        ClosedFifo,
      }

      impl Output {
        pub fn writer(self, dir: &Path) -> Box<dyn Write + Send> {
          match self {
            Self::ClosedStdout => Box::new(StdoutWriter::new(FailingWriter::new(ErrorKind::BrokenPipe))),
            Self::StdoutError => Box::new(StdoutWriter::new(FailingWriter::new(ErrorKind::StorageFull))),
            Self::ClosedFifo => Box::new(closed_fifo(dir)),
          }
        }
      }

      /// Output file that is a named pipe, after its reader opened and closed it
      fn closed_fifo(dir: &Path) -> OutputWriter {
        let filepath = dir.join("fifo");
        let status = Command::new("mkfifo").arg(&filepath).status().unwrap();
        assert!(status.success(), "mkfifo failed: {status}");

        // Opening a named pipe waits until the other end opens it too
        let reader = {
          let filepath = filepath.clone();
          thread::spawn(move || drop(File::open(filepath).unwrap()))
        };
        let writer = create_file_or_stdout(&filepath).unwrap();
        reader.join().unwrap();
        writer
      }

      /// Writer that fails every write and flush with an error of the given kind
      pub struct FailingWriter {
        kind: ErrorKind,
      }

      impl FailingWriter {
        pub fn new(kind: ErrorKind) -> Self {
          Self { kind }
        }
      }

      impl Write for FailingWriter {
        fn write(&mut self, _buf: &[u8]) -> io::Result<usize> {
          Err(io::Error::new(self.kind, "test write error"))
        }

        fn flush(&mut self) -> io::Result<()> {
          Err(io::Error::new(self.kind, "test write error"))
        }
      }
    }
  }
}
