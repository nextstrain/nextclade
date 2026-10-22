#[cfg(test)]
mod tests {
  use crate::io::file::{create_file_or_stdout, is_stdout_closed, open_file_or_stdin};
  use crate::io::json::{JsonPretty, json_write_impl};
  #[cfg(target_os = "linux")]
  use crate::utils::error::report_to_string;
  use helpers::{write_csv, write_plain, writer};
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::io::{ErrorKind, Read, Write};

  #[rustfmt::skip]
  #[rstest]
  #[case::closed_stdout(          ErrorKind::BrokenPipe,  true,  true)]
  #[case::closed_pipe_of_a_file(  ErrorKind::BrokenPipe,  false, false)]
  #[case::other_stdout_error(     ErrorKind::StorageFull, true,  false)]
  #[trace]
  fn test_file_stdout_closed_is_detected_only_for_stdout(
    #[case] kind: ErrorKind,
    #[case] is_stdout: bool,
    #[case] expected: bool,
  ) {
    let writers = [
      ("write", write_plain(writer(kind, is_stdout))),
      ("json", json_write_impl(writer(kind, is_stdout), &[1, 2], JsonPretty(false))),
      ("csv", write_csv(writer(kind, is_stdout))),
    ];

    let detected = writers
      .iter()
      .map(|(name, result)| (*name, result.as_ref().err().map(is_stdout_closed)))
      .collect::<Vec<_>>();

    assert_eq!(
      vec![("write", Some(expected)), ("json", Some(expected)), ("csv", Some(expected))],
      detected
    );
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
  fn test_file_output_dropped_after_write_error_does_not_panic() {
    let mut file = create_file_or_stdout("/dev/full").unwrap();
    file.write_all(b">seq\nACGT\n").unwrap();

    drop(file);
  }

  mod helpers {
    use crate::io::csv::CsvStructWriter;
    use crate::io::file::StdoutWriter;
    use eyre::{Report, WrapErr};
    use std::io::{self, ErrorKind, Write};

    /// Failing writer, wrapped in `StdoutWriter` when it stands for stdout
    pub fn writer(kind: ErrorKind, is_stdout: bool) -> Box<dyn Write + Send> {
      if is_stdout {
        Box::new(StdoutWriter::new(FailingWriter::new(kind)))
      } else {
        Box::new(FailingWriter::new(kind))
      }
    }

    pub fn write_plain(mut writer: Box<dyn Write + Send>) -> Result<(), Report> {
      writer.write_all(b"data").wrap_err("When writing output")
    }

    pub fn write_csv(writer: Box<dyn Write + Send>) -> Result<(), Report> {
      // Enough rows to fill the internal buffer of the CSV writer, so that a row write fails
      let mut csv = CsvStructWriter::new(writer, b'\t')?;
      for index in 0..1000 {
        csv.write(&("sequence name", index)).wrap_err("When writing CSV")?;
      }
      csv.writer.flush().wrap_err("When writing CSV")
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
