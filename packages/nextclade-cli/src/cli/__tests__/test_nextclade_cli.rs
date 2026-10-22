#[cfg(test)]
mod tests {
  use crate::cli::nextclade_cli::nextclade_parse_args;
  use clap::error::ErrorKind;
  use pretty_assertions::assert_eq;
  use rstest::rstest;

  #[rustfmt::skip]
  #[rstest]
  #[case::run(  "run" )]
  #[case::sort( "sort")]
  #[trace]
  fn test_nextclade_cli_zero_jobs_is_rejected(#[case] command: &str) {
    let result = nextclade_parse_args(["nextclade", command, "--jobs=0"]);

    assert_eq!(Some(ErrorKind::ValueValidation), result.err().map(|error| error.kind()));
  }
}
