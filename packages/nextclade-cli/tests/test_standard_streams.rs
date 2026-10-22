//! Standard input and output of the `nextclade` executable: a reader that closes standard output early, standard
//! output that fails, and standard input that a command reads twice

#[cfg(test)]
mod tests {
  use helpers::{MINIMIZER_INDEX_JSON, SEQUENCE, TestDir, fasta, nextclade, run_with_closed_stdout};
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::io::Write;
  use std::process::Stdio;

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

  #[rustfmt::skip]
  #[rstest]
  #[case::run_file(  &["run", "--input-ref=reference.fasta", "--output-tsv=results.tsv"],                             "The output to file results.tsv is incomplete")]
  #[case::run_json(  &["run", "--input-ref=reference.fasta", "--output-json=-"],                                      "The output to standard output is missing")]
  #[case::run_tree(  &["run", "--input-ref=reference.fasta", "--input-tree=tree.json", "--output-tree=output_tree.json"], "The output to file output_tree.json is missing")]
  #[case::sort_file( &["sort", "--input-minimizer-index-json=minimizer_index.json", "--output-results-tsv=results.tsv"], "The output to file results.tsv is incomplete")]
  #[trace]
  fn test_standard_streams_input_read_error_leaves_outputs_incomplete(#[case] args: &[&str], #[case] warning: &str) {
    let dir = TestDir::new();
    dir.write("reference.fasta", &fasta(&["ref"]));
    dir.write("minimizer_index.json", MINIMIZER_INDEX_JSON);
    dir.write("tree.json", include_str!("../src/cli/__tests__/__fixtures__/tree.json"));
    dir.write_truncated_gzip("sequences.fasta.gz", &fasta(&["seq1", "seq2", "seq3"]));

    let output = nextclade()
      .current_dir(dir.path())
      .args(args)
      .arg("sequences.fasta.gz")
      .output()
      .unwrap();

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert_eq!(
      (false, true),
      (output.status.success(), stderr.contains(warning)),
      "{stderr}"
    );
  }

  #[test]
  fn test_standard_streams_results_json_on_stdout_is_written_once() {
    let dir = TestDir::new();
    dir.write("reference.fasta", &fasta(&["ref"]));
    dir.write("sequences.fasta", &fasta(&["seq1", "seq2"]));

    let output = nextclade()
      .current_dir(dir.path())
      .args([
        "run",
        "--input-ref=reference.fasta",
        "--output-json=-",
        "sequences.fasta",
      ])
      .output()
      .unwrap();

    let documents = serde_json::Deserializer::from_slice(&output.stdout)
      .into_iter::<serde_json::Value>()
      .collect::<Result<Vec<_>, _>>()
      .unwrap();
    assert_eq!(
      (true, 1),
      (output.status.success(), documents.len()),
      "{}",
      String::from_utf8_lossy(&output.stderr)
    );
  }

  #[test]
  fn test_standard_streams_sort_closed_stdout_keeps_output_files_complete() {
    let dir = TestDir::new();
    dir.write("minimizer_index.json", MINIMIZER_INDEX_JSON);
    // Enough sequences that the results table exceeds the output buffer, so that a write fails before the end
    let seq_names = (0..20_000).map(|index| format!("seq{index}")).collect::<Vec<_>>();
    dir.write("sequences.fasta", &fasta(&seq_names));

    let output = run_with_closed_stdout(nextclade().current_dir(dir.path()).args([
      "sort",
      "--input-minimizer-index-json=minimizer_index.json",
      "--output-results-tsv=-",
      "--output-dir=sorted",
      "sequences.fasta",
    ]));

    let sorted = dir.read("sorted/ref/sequences.fasta");
    assert_eq!(
      (true, seq_names.len()),
      (
        output.status.success(),
        sorted.lines().filter(|line| line.starts_with('>')).count()
      ),
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

  #[test]
  fn test_standard_streams_sort_global_reads_stdin_in_both_passes() {
    let dir = TestDir::new();
    dir.write("minimizer_index.json", MINIMIZER_INDEX_JSON);
    let mut child = nextclade()
      .current_dir(dir.path())
      .args([
        "sort",
        "--global",
        "--input-minimizer-index-json=minimizer_index.json",
        "--output-results-tsv=results.tsv",
      ])
      .stdin(Stdio::piped())
      .spawn()
      .unwrap();
    child
      .stdin
      .take()
      .unwrap()
      .write_all(format!(">seq1\n{SEQUENCE}\n>seq2\n{SEQUENCE}\n").as_bytes())
      .unwrap();
    let output = child.wait_with_output().unwrap();

    assert_eq!(
      (
        true,
        // Both sequences are the reference: all 19 minimizers of the reference hit, so the score is 19 / 19
        "index\tseqName\tdataset\tscore\tnumHits\n0\tseq1\tref\t1.0\t19\n1\tseq2\tref\t1.0\t19\n".to_owned()
      ),
      (output.status.success(), dir.read("results.tsv")),
      "{}",
      String::from_utf8_lossy(&output.stderr)
    );
  }

  mod helpers {
    use nextclade::io::file::create_file_or_stdout;
    use std::fmt::Write;
    use std::fs::OpenOptions;
    use std::io::Write as _;
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

      /// Write `content` compressed with gzip, and cut the file in the middle of the compressed stream
      pub fn write_truncated_gzip(&self, name: &str, content: &str) {
        let filepath = self.dir.path().join(name);
        let mut file = create_file_or_stdout(&filepath).unwrap();
        file.write_all(content.as_bytes()).unwrap();
        file.finish().unwrap();

        let file = OpenOptions::new().write(true).open(&filepath).unwrap();
        let len = file.metadata().unwrap().len();
        file.set_len(len / 2).unwrap();
      }
    }

    /// Minimizer index with one reference, "ref", whose minimizers are those of `SEQUENCE`
    pub const MINIMIZER_INDEX_JSON: &str = include_str!("../src/cli/__tests__/__fixtures__/minimizer_index.json");
  }
}
