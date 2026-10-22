#[cfg(test)]
mod tests {
  use crate::cli::nextclade_loop::nextclade_run;
  use helpers::{RunDir, result_seq_names, run_args};
  #[cfg(target_os = "linux")]
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;

  #[test]
  fn test_nextclade_loop_output_json_contains_each_result_once() {
    let dir = RunDir::new();
    let output = dir.path("results.json");

    nextclade_run(run_args(&dir, &[&format!("--output-json={}", output.display())])).unwrap();

    assert_eq!(
      vec!["seq1".to_owned(), "seq2".to_owned()],
      result_seq_names(&std::fs::read_to_string(&output).unwrap())
    );
  }

  #[cfg(target_os = "linux")]
  #[test]
  fn test_nextclade_loop_output_json_write_error_names_the_file() {
    let dir = RunDir::new();

    let result = nextclade_run(run_args(&dir, &["--output-json=/dev/full"]));

    assert_eq!(
      Some(
        "When finalizing output writer: When writing to file /dev/full: No space left on device (os error 28)"
          .to_owned()
      ),
      result.err().map(|report| report_to_string(&report))
    );
  }

  mod helpers {
    use crate::cli::nextclade_cli::{NextcladeCommands, NextcladeRunArgs, nextclade_parse_args};
    use nextclade::io::json::json_parse;
    use serde_json::Value;
    use std::path::PathBuf;
    use tempfile::TempDir;

    const REFERENCE: &str = "ATGGCTAGCTTCGATCGGATCCTAGGCTTAACGGTACCTGAGCTCAAGCTTGCATGCCTGCAGGTCGACTCTAGAGGATCCCCGGGTACCGAGCTCGAATTCACTGGCCGTCGTTTTACAACGTCGTGACTGGGAAAACCCTGGCGTTACCCAACTTAATCGCCTTGCAGCACATCCCCCTTTCGCCAGCTGGCGTAATAGCGAAGAGGCCCGCACCGATCGCCCTTCCCAACAGTTGCGCAGCCTGAATGGCGAATGG";

    /// Temporary directory with a reference sequence and two query sequences, for runs without a dataset
    pub struct RunDir {
      dir: TempDir,
    }

    impl RunDir {
      pub fn new() -> Self {
        let dir = tempfile::tempdir().unwrap();
        std::fs::write(dir.path().join("reference.fasta"), format!(">ref\n{REFERENCE}\n")).unwrap();
        std::fs::write(
          dir.path().join("sequences.fasta"),
          format!(">seq1\n{REFERENCE}\n>seq2\n{REFERENCE}\n"),
        )
        .unwrap();
        Self { dir }
      }

      pub fn path(&self, name: &str) -> PathBuf {
        self.dir.path().join(name)
      }
    }

    pub fn run_args(dir: &RunDir, args: &[&str]) -> NextcladeRunArgs {
      let reference = format!("--input-ref={}", dir.path("reference.fasta").display());
      let sequences = dir.path("sequences.fasta").display().to_string();
      let args = ["nextclade", "run", "--jobs=1", &reference]
        .into_iter()
        .chain(args.iter().copied())
        .chain([sequences.as_str()]);
      match nextclade_parse_args(args).unwrap().command {
        NextcladeCommands::Run(run_args) => *run_args,
        _ => panic!("expected `run` command"),
      }
    }

    /// Sequence names of the results in the results JSON
    pub fn result_seq_names(results_json: &str) -> Vec<String> {
      let results_json: Value = json_parse(results_json).unwrap();
      results_json["results"]
        .as_array()
        .unwrap()
        .iter()
        .map(|result| result["seqName"].as_str().unwrap().to_owned())
        .collect()
    }
  }
}
