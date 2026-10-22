#[cfg(test)]
mod tests {
  use crate::cli::nextclade_seq_sort::nextclade_seq_sort;
  use helpers::{SortDir, sort_args};
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;

  #[test]
  fn test_nextclade_seq_sort_missing_input_is_an_error() {
    let dir = SortDir::new();
    let missing = dir.path("missing.fasta");

    let result = nextclade_seq_sort(&sort_args(&dir, &missing, &[]));

    assert_eq!(
      Some(format!(
        "When opening file {}: No such file or directory (os error 2)",
        missing.display()
      )),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[test]
  fn test_nextclade_seq_sort_output_that_cannot_be_created_is_an_error() {
    let dir = SortDir::new();
    let input = dir.write("sequences.fasta", ">seq\nACGT\n");
    let blocking_file = dir.write("file", "");
    let output = blocking_file.join("results.tsv");

    let result = nextclade_seq_sort(&sort_args(
      &dir,
      &input,
      &[&format!("--output-results-tsv={}", output.display())],
    ));

    assert_eq!(
      Some(format!(
        "When ensuring parent directory for {}: When creating directory {}: File exists (os error 17)",
        output.display(),
        blocking_file.display()
      )),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn test_nextclade_seq_sort_output_write_error_is_an_error() {
    let dir = SortDir::new();
    let input = dir.write("sequences.fasta", ">seq\nACGT\n");

    let result = nextclade_seq_sort(&sort_args(&dir, &input, &["--output-results-tsv=/dev/full"]));

    assert_eq!(
      Some("When writing to file /dev/full: No space left on device (os error 28)".to_owned()),
      result.err().map(|report| report_to_string(&report))
    );
  }

  #[test]
  fn test_nextclade_seq_sort_writes_results_tsv() {
    let dir = SortDir::new();
    let input = dir.write("sequences.fasta", ">seq1\nACGT\n>seq2\nACGT\n");
    let output = dir.path("results.tsv");

    nextclade_seq_sort(&sort_args(
      &dir,
      &input,
      &[&format!("--output-results-tsv={}", output.display())],
    ))
    .unwrap();

    assert_eq!(
      "index\tseqName\tdataset\tscore\tnumHits\n0\tseq1\t\t\t\n1\tseq2\t\t\t\n",
      std::fs::read_to_string(&output).unwrap()
    );
  }

  mod helpers {
    use crate::cli::nextclade_cli::{NextcladeCommands, NextcladeSortArgs, nextclade_parse_args};
    use std::path::{Path, PathBuf};
    use tempfile::TempDir;

    /// Minimizer index without references: every sequence is undetected
    const MINIMIZER_INDEX: &str = r#"{
      "schemaVersion": "3.0.0",
      "version": "1",
      "params": { "k": 17, "cutoff": 28 },
      "minimizers": {},
      "references": [],
      "normalization": []
    }"#;

    /// Temporary directory with a minimizer index, for runs of `nextclade sort` without a dataset server
    pub struct SortDir {
      dir: TempDir,
    }

    impl SortDir {
      pub fn new() -> Self {
        let this = Self {
          dir: tempfile::tempdir().unwrap(),
        };
        this.write("minimizer_index.json", MINIMIZER_INDEX);
        this
      }

      pub fn path(&self, name: &str) -> PathBuf {
        self.dir.path().join(name)
      }

      pub fn write(&self, name: &str, content: &str) -> PathBuf {
        let path = self.path(name);
        std::fs::write(&path, content).unwrap();
        path
      }
    }

    pub fn sort_args(dir: &SortDir, input: &Path, args: &[&str]) -> NextcladeSortArgs {
      let index = format!(
        "--input-minimizer-index-json={}",
        dir.path("minimizer_index.json").display()
      );
      let input = input.display().to_string();
      let args = ["nextclade", "sort", "--jobs=1", &index]
        .into_iter()
        .chain(args.iter().copied())
        .chain([input.as_str()]);
      match nextclade_parse_args(args).unwrap().command {
        NextcladeCommands::Sort(sort_args) => *sort_args,
        _ => panic!("expected `sort` command"),
      }
    }
  }
}
