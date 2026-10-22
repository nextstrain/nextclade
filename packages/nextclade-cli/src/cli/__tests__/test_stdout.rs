#[cfg(test)]
mod tests {
  use crate::cli::stdout::{ignore_stdout_closed, write_bytes, write_line};
  use eyre::WrapErr;
  use helpers::FailingWriter;
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
  #[case::line_when_writing(  false, false)]
  #[case::line_when_flushing( true,  false)]
  #[case::bytes_when_writing( false, true)]
  #[case::bytes_when_flushing(true,  true)]
  #[trace]
  fn test_stdout_closed_pipe_is_success(#[case] fails_on_flush: bool, #[case] bytes: bool) {
    let mut writer = FailingWriter::new(ErrorKind::BrokenPipe, fails_on_flush);

    let written = if bytes {
      write_bytes(&mut writer, b"line\n")
    } else {
      write_line(&mut writer, "line")
    };
    let result = ignore_stdout_closed(written);

    assert_eq!(None, result.err().map(|report| report_to_string(&report)));
  }

  #[test]
  fn test_stdout_closed_pipe_is_success_below_added_context() {
    let mut writer = FailingWriter::new(ErrorKind::BrokenPipe, false);

    let result = ignore_stdout_closed(write_line(&mut writer, "line").wrap_err("When generating completions"));

    assert_eq!(None, result.err().map(|report| report_to_string(&report)));
  }

  #[test]
  fn test_stdout_other_write_errors_are_errors() {
    let mut writer = FailingWriter::new(ErrorKind::StorageFull, false);

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
