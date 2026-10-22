#[cfg(test)]
mod tests {
  use crate::cli::stdout::{finish_outputs, ignore_stdout_closed, write_bytes, write_line, write_output};
  use eyre::{WrapErr, eyre};
  use helpers::FailingWriter;
  use indoc::indoc;
  use nextclade::io::file::StdoutWriter;
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::io::ErrorKind;

  #[test]
  fn test_stdout_write_line_writes_content_and_newline() {
    let mut output = Vec::new();

    write_line(&mut output, "line").unwrap();

    assert_eq!(b"line\n".to_vec(), output);
  }

  #[test]
  fn test_stdout_write_bytes_writes_content_unchanged() {
    let mut output = Vec::new();

    write_bytes(&mut output, b"complete -F _nextclade nextclade\n").unwrap();

    assert_eq!(b"complete -F _nextclade nextclade\n".to_vec(), output);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::when_writing(  false)]
  #[case::when_flushing( true )]
  #[trace]
  fn test_stdout_closed_pipe_is_success_for_lines(#[case] fails_on_flush: bool) {
    let mut writer = StdoutWriter::new(FailingWriter::new(ErrorKind::BrokenPipe, fails_on_flush));

    let result = ignore_stdout_closed(write_line(&mut writer, "line"));

    assert_eq!(None, result.err().map(|report| report_to_string(&report)));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::when_writing(  false)]
  #[case::when_flushing( true )]
  #[trace]
  fn test_stdout_closed_pipe_is_success_for_bytes(#[case] fails_on_flush: bool) {
    let mut writer = StdoutWriter::new(FailingWriter::new(ErrorKind::BrokenPipe, fails_on_flush));

    let result = ignore_stdout_closed(write_bytes(&mut writer, b"line\n"));

    assert_eq!(None, result.err().map(|report| report_to_string(&report)));
  }

  #[test]
  fn test_stdout_closed_pipe_is_success_below_added_context() {
    let mut writer = StdoutWriter::new(FailingWriter::new(ErrorKind::BrokenPipe, false));

    let result = ignore_stdout_closed(write_line(&mut writer, "line").wrap_err("When generating completions"));

    assert_eq!(None, result.err().map(|report| report_to_string(&report)));
  }

  #[test]
  fn test_stdout_other_write_errors_are_errors() {
    let mut writer = StdoutWriter::new(FailingWriter::new(ErrorKind::StorageFull, false));

    let result = ignore_stdout_closed(write_line(&mut writer, "line"));

    assert_eq!(
      Some("When writing to standard output: test write error".to_owned()),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[test]
  fn test_stdout_other_errors_with_broken_pipe_kind_are_errors() {
    let error = std::io::Error::new(ErrorKind::BrokenPipe, "connection to the dataset server closed");

    let result = ignore_stdout_closed(Err(eyre::Report::new(error)));

    assert_eq!(
      Some("connection to the dataset server closed".to_owned()),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[test]
  fn test_stdout_finish_outputs_reports_all_errors_except_closed_stdout() {
    let closed_stdout = write_line(
      &mut StdoutWriter::new(FailingWriter::new(ErrorKind::BrokenPipe, false)),
      "line",
    );

    let result = finish_outputs([
      Ok(()),
      closed_stdout,
      Err(eyre!("When writing to file a.tsv: disk full")),
      Err(eyre!("When writing to file b.fasta: disk full")),
    ]);

    assert_eq!(
      Some(
        indoc! {"
        2 errors occurred:
          - When writing to file a.tsv: disk full
          - When writing to file b.fasta: disk full"}
        .to_owned()
      ),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[test]
  fn test_stdout_write_output_drops_only_closed_stdout() {
    let mut closed = Some(StdoutWriter::new(FailingWriter::new(ErrorKind::BrokenPipe, false)));
    let mut full = Some(StdoutWriter::new(FailingWriter::new(ErrorKind::StorageFull, false)));

    let results = (
      write_output(&mut closed, |writer| write_line(writer, "line")).is_ok(),
      write_output(&mut full, |writer| write_line(writer, "line")).is_ok(),
    );

    assert_eq!(
      ((true, false), (false, true)),
      (results, (closed.is_some(), full.is_some()))
    );
  }

  mod helpers {
    use std::io::{self, ErrorKind, Write};

    /// Writer that fails with an error of the given kind, when writing or only when flushing
    pub struct FailingWriter {
      kind: ErrorKind,
      fails_on_flush: bool,
    }

    impl FailingWriter {
      pub fn new(kind: ErrorKind, fails_on_flush: bool) -> Self {
        Self { kind, fails_on_flush }
      }

      fn error(&self) -> io::Error {
        io::Error::new(self.kind, "test write error")
      }
    }

    impl Write for FailingWriter {
      fn write(&mut self, buf: &[u8]) -> io::Result<usize> {
        if self.fails_on_flush {
          Ok(buf.len())
        } else {
          Err(self.error())
        }
      }

      fn flush(&mut self) -> io::Result<()> {
        Err(self.error())
      }
    }
  }
}
