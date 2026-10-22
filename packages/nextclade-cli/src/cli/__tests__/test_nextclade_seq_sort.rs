#[cfg(test)]
mod tests {
  use crate::cli::nextclade_seq_sort::{StatsPrinter, nextclade_seq_sort, sort_sequences};
  use helpers::{FailingWriter, SortDir, dataset, sort_args, summary_rows};
  use nextclade::io::file::StdoutWriter;
  use nextclade::sort::minimizer_index::MinimizerIndexJson;
  #[cfg(unix)]
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::io::ErrorKind;

  #[cfg(unix)]
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

  #[cfg(unix)]
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

  #[cfg(unix)]
  #[test]
  fn test_nextclade_seq_sort_reports_errors_of_all_threads() {
    let dir = SortDir::new();
    let input = dir.write("sequences.fasta", "not a FASTA record\n");
    let blocking_file = dir.write("file", "");
    let output = blocking_file.join("results.tsv");

    let result = nextclade_seq_sort(&sort_args(
      &dir,
      &input,
      &[&format!("--output-results-tsv={}", output.display())],
    ));

    assert_eq!(
      Some(indoc::formatdoc! {"
        2 errors occurred:
          - Expected character '>' at record start.
          - When ensuring parent directory for {}: When creating directory {}: File exists (os error 17)",
        output.display(),
        blocking_file.display()
      }),
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

  #[test]
  fn test_nextclade_seq_sort_stats_count_sequences_per_dataset() {
    let mut output = Vec::new();
    {
      let mut stats = StatsPrinter::new("Suggested datasets for each sequence", true, &mut output).unwrap();
      stats.print_seq(&[dataset("a")], "seq1").unwrap();
      stats.print_seq(&[dataset("a")], "seq2").unwrap();
      stats.print_seq(&[dataset("b")], "seq3").unwrap();
      stats.print_seq(&[], "seq4").unwrap();
      stats.finish().unwrap();
    }

    assert_eq!(
      vec![
        vec!["a", "2", "50.000%"],          // 2 of 4 sequences
        vec!["b", "1", "25.000%"],          // 1 of 4 sequences
        vec!["undetected", "1", "25.000%"], // 1 of 4 sequences
        vec!["total", "4", "100.000%"],
      ],
      summary_rows(&output)
    );
  }

  #[test]
  fn test_nextclade_seq_sort_stats_count_each_sequence_once_in_total_with_all_matches() {
    let mut output = Vec::new();
    {
      let mut stats = StatsPrinter::new("Suggested datasets for each sequence", true, &mut output).unwrap();
      stats.print_seq(&[dataset("a"), dataset("b")], "seq1").unwrap();
      stats.print_seq(&[dataset("a")], "seq2").unwrap();
      stats.print_seq(&[], "seq3").unwrap();
      stats.finish().unwrap();
    }

    assert_eq!(
      vec![
        vec!["a", "2", "66.667%"],          // 2 of 3 sequences
        vec!["b", "1", "33.333%"],          // 1 of 3 sequences
        vec!["undetected", "1", "33.333%"], // 1 of 3 sequences
        vec!["total", "3", "100.000%"],     // seq1 counts once, although it matches 2 datasets
      ],
      summary_rows(&output)
    );
  }

  #[rstest]
  #[case::local(&[])]
  #[case::global(&["--global"])]
  #[trace]
  fn test_nextclade_seq_sort_closed_stdout_keeps_output_files_complete(#[case] mode_args: &[&str]) {
    let dir = SortDir::new();
    let input = dir.write(
      "sequences.fasta",
      &format!(">seq1\n{0}\n>seq2\nACGT\n>seq3\n{0}\n", helpers::SEQUENCE),
    );
    let output = dir.path("results.tsv");
    let output_dir = dir.path("sorted");
    let index = MinimizerIndexJson::from_path(dir.path("minimizer_index.json")).unwrap();
    let output_args = [
      format!("--output-results-tsv={}", output.display()),
      format!("--output-dir={}", output_dir.display()),
    ];
    let args = output_args
      .iter()
      .map(String::as_str)
      .chain(mode_args.iter().copied())
      .collect::<Vec<_>>();
    let closed_stdout = StdoutWriter::new(FailingWriter::new(ErrorKind::BrokenPipe, false));

    sort_sequences(
      &sort_args(&dir, &input, &args),
      &["ref".to_owned()],
      &index,
      true,
      closed_stdout,
    )
    .unwrap();

    assert_eq!(
      (
        // seq1 and seq3 are the reference: all 19 minimizers of the reference hit, so the score is 19 / 19
        "index\tseqName\tdataset\tscore\tnumHits\n0\tseq1\tref\t1.0\t19\n1\tseq2\t\t\t\n2\tseq3\tref\t1.0\t19\n"
          .to_owned(),
        format!(">seq1\n{0}\n>seq3\n{0}\n", helpers::SEQUENCE)
      ),
      (
        std::fs::read_to_string(&output).unwrap(),
        std::fs::read_to_string(output_dir.join("ref/sequences.fasta")).unwrap()
      )
    );
  }

  mod helpers {
    pub use crate::cli::__tests__::common::helpers::{FailingWriter, SEQUENCE};
    use crate::cli::nextclade_cli::{NextcladeCommands, NextcladeSortArgs, nextclade_parse_args};
    use nextclade::sort::minimizer_search::MinimizerSearchDatasetResult;
    use std::path::{Path, PathBuf};
    use tempfile::TempDir;

    /// Minimizer index with one reference, "ref": the 19 minimizers of `SEQUENCE` for k = 17 and the cutoff 2^28.
    /// Sequences shorter than k, such as "ACGT", are undetected.
    const MINIMIZER_INDEX: &str = include_str!("__fixtures__/minimizer_index.json");

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

    pub fn dataset(name: &str) -> MinimizerSearchDatasetResult {
      MinimizerSearchDatasetResult {
        name: name.to_owned(),
        length: 100,
        n_hits: 10,
        score: 0.9,
      }
    }

    /// Cells of the rows of the summary table that follows the per-sequence table, without colors and borders
    pub fn summary_rows(output: &[u8]) -> Vec<Vec<String>> {
      let output = console::strip_ansi_codes(std::str::from_utf8(output).unwrap()).into_owned();
      let (_, summary) = output.split_once("\n\n\nSuggested datasets\n").unwrap();
      summary
        .lines()
        .filter(|line| line.contains('│') && !line.contains("Num. seq"))
        .map(|line| {
          line
            .split('│')
            .map(|cell| cell.trim().to_owned())
            .filter(|cell| !cell.is_empty())
            .collect()
        })
        .collect()
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
