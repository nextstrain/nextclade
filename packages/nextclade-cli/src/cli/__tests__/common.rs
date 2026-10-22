#[cfg(test)]
pub mod helpers {
  use std::io::{self, ErrorKind, Write};

  /// Reference sequence of the tests, also used as a query sequence that matches the reference
  pub const SEQUENCE: &str = "ATGGCTAGCTTCGATCGGATCCTAGGCTTAACGGTACCTGAGCTCAAGCTTGCATGCCTGCAGGTCGACTCTAGAGGATCCCCGGGTACCGAGCTCGAATTCACTGGCCGTCGTTTTACAACGTCGTGACTGGGAAAACCCTGGCGTTACCCAACTTAATCGCCTTGCAGCACATCCCCCTTTCGCCAGCTGGCGTAATAGCGAAGAGGCCCGCACCGATCGCCCTTCCCAACAGTTGCGCAGCCTGAATGGCGAATGG";

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
