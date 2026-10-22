//! Standard output of the `nextclade` executable: a reader that closes standard output early, and standard output
//! that fails

#[cfg(test)]
mod tests {
  use helpers::{TestDir, fasta, nextclade, run_with_closed_stdout};
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::completions(  &["completions", "bash"])]
  #[case::help_markdown(&["help-markdown"]     )]
  #[trace]
  fn test_standard_streams_closed_stdout_ends_quietly(#[case] args: &[&str]) {
    let output = run_with_closed_stdout(nextclade().args(args));

    assert_eq!(
      (true, String::new()),
      (output.status.success(), String::from_utf8_lossy(&output.stderr).into_owned())
    );
  }

  #[test]
  fn test_standard_streams_closed_stdout_keeps_output_files_complete() {
    let dir = TestDir::new();
    dir.write("reference.fasta", &fasta(&["ref"]));
    let seq_names = (0..2000).map(|index| format!("seq{index}")).collect::<Vec<_>>();
    dir.write("sequences.fasta", &fasta(&seq_names));

    let output = run_with_closed_stdout(nextclade().current_dir(dir.path()).args([
      "run",
      "--input-ref=reference.fasta",
      "--output-fasta=-",
      "--output-tsv=results.tsv",
      "sequences.fasta",
    ]));

    let tsv = dir.read("results.tsv");
    assert_eq!(
      (true, 1 + seq_names.len()),
      (output.status.success(), tsv.lines().count()),
      "{}",
      String::from_utf8_lossy(&output.stderr)
    );
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn test_standard_streams_stdout_write_error_names_standard_output() {
    let dir = TestDir::new();
    dir.write("reference.fasta", &fasta(&["ref"]));
    dir.write("sequences.fasta", &fasta(&["seq"]));

    let output = nextclade()
      .current_dir(dir.path())
      .args([
        "run",
        "--input-ref=reference.fasta",
        "--output-fasta=-",
        "sequences.fasta",
      ])
      .stdout(std::fs::File::create("/dev/full").unwrap())
      .output()
      .unwrap();

    // The error report lists the chain of causes, one per line
    let stderr = String::from_utf8_lossy(&output.stderr);
    assert_eq!(
      (false, true, true),
      (
        output.status.success(),
        stderr.contains("When writing to standard output\n"),
        stderr.contains("No space left on device (os error 28)\n"),
      ),
      "{stderr}"
    );
  }

  mod helpers {
    use std::fmt::Write;
    use std::path::Path;
    use std::process::{Command, Output, Stdio};
    use tempfile::TempDir;

    pub const SEQUENCE: &str = "ATGGCTAGCTTCGATCGGATCCTAGGCTTAACGGTACCTGAGCTCAAGCTTGCATGCCTGCAGGTCGACTCTAGAGGATCCCCGGGTACCGAGCTCGAATTCACTGGCCGTCGTTTTACAACGTCGTGACTGGGAAAACCCTGGCGTTACCCAACTTAATCGCCTTGCAGCACATCCCCCTTTCGCCAGCTGGCGTAATAGCGAAGAGGCCCGCACCGATCGCCCTTCCCAACAGTTGCGCAGCCTGAATGGCGAATGG";

    /// The `nextclade` executable, without input and with captured output
    pub fn nextclade() -> Command {
      let mut cmd = Command::new(env!("CARGO_BIN_EXE_nextclade"));
      cmd.stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
      cmd
    }

    /// Run the command, and close its standard output before it writes, as `head` does after its last line
    pub fn run_with_closed_stdout(cmd: &mut Command) -> Output {
      let mut child = cmd.spawn().unwrap();
      drop(child.stdout.take());
      child.wait_with_output().unwrap()
    }

    /// FASTA with one copy of `SEQUENCE` for each name
    pub fn fasta(names: &[impl AsRef<str>]) -> String {
      names.iter().fold(String::new(), |mut fasta, name| {
        writeln!(fasta, ">{}\n{SEQUENCE}", name.as_ref()).unwrap();
        fasta
      })
    }

    pub struct TestDir {
      dir: TempDir,
    }

    impl TestDir {
      pub fn new() -> Self {
        Self {
          dir: tempfile::tempdir().unwrap(),
        }
      }

      pub fn path(&self) -> &Path {
        self.dir.path()
      }

      pub fn write(&self, name: &str, content: &str) {
        std::fs::write(self.dir.path().join(name), content).unwrap();
      }

      pub fn read(&self, name: &str) -> String {
        std::fs::read_to_string(self.dir.path().join(name)).unwrap()
      }
    }
  }
}
