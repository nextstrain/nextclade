#[cfg(test)]
pub mod tests {
  use crate::cli::nextclade_cli::{NextcladeCommands, nextclade_parse_args};
  #[cfg(unix)]
  use crate::dataset::dataset_download::run_http_client;
  use crate::io::network_args::{
    NetworkArgs, PasswordSourceChoice, choose_password_source, strip_one_trailing_newline,
  };
  #[cfg(unix)]
  use crate::io::proxy::ProxyEnv;
  use clap::parser::ValueSource;
  use clap::{Arg, CommandFactory};
  use helpers::{assert_no_network_env_vars, network, parse, run_args, secret, subcommand};
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use secrecy::ExposeSecret;
  use std::ffi::{OsStr, OsString};
  #[cfg(unix)]
  use std::os::unix::ffi::OsStrExt;
  use std::path::PathBuf;
  use std::time::Duration;

  #[test]
  fn test_network_args_run_accepts_every_network_option() {
    let run = run_args(&[
      "--proxy=http://proxy.test:3128",
      "--proxy-user=user",
      "--proxy-pass-file=/run/secrets/proxy",
      "--extra-ca-certs=/etc/ca.pem",
      "--http-timeout=42",
    ]);
    let conf = &run.inputs.network;
    assert_eq!(Some("http://proxy.test:3128"), conf.explicit_proxy().unwrap());
    assert_eq!(
      Some(&b"user"[..]),
      conf.proxy_user.as_ref().map(ExposeSecret::expose_secret)
    );
    assert_eq!(Some(OsString::from("/run/secrets/proxy")), conf.proxy_pass_file);
    assert_eq!(Some(PathBuf::from("/etc/ca.pem")), conf.extra_ca_certs_path());
    assert_eq!(Some(Duration::from_secs(42)), conf.request_timeout().unwrap());
  }

  #[test]
  fn test_network_args_debug_output_hides_proxy_secrets() {
    let run = run_args(&["--proxy=http://u:p4ss@h:1", "--proxy-user=us3r", "--proxy-pass=s3cret"]);

    let debug = format!("{run:#?}");

    let leaked = ["p4ss", "us3r", "s3cret"]
      .into_iter()
      .filter(|secret| debug.contains(secret))
      .collect::<Vec<_>>();
    assert_eq!(Vec::<&str>::new(), leaked);
  }

  #[test]
  fn test_network_args_run_accepts_proxy_short_flag_and_password() {
    let run = run_args(&["-x", "http://proxy.test:3128", "--proxy-user=user", "--proxy-pass=pass"]);
    let conf = &run.inputs.network;
    assert_eq!(Some("http://proxy.test:3128"), conf.explicit_proxy().unwrap());
    assert_eq!(
      Some(&b"pass"[..]),
      conf.proxy_pass.as_ref().map(ExposeSecret::expose_secret)
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::zero_disables( &["--http-timeout=0"],   None)]
  #[case::explicit(      &["--http-timeout=5"],   Some(Duration::from_secs(5)))]
  #[case::empty(         &["--http-timeout="],    Some(Duration::from_mins(10)))]
  #[case::default(       &[],                     Some(Duration::from_mins(10)))]
  #[trace]
  fn test_network_args_http_timeout_sets_the_request_deadline(
    #[case] args: &[&str],
    #[case] expected: Option<Duration>,
  ) {
    assert_eq!(expected, run_args(args).inputs.network.request_timeout().unwrap());
  }

  #[test]
  fn test_network_args_empty_values_count_as_not_set() {
    // Same raw values as empty environment variables, for example `NEXTCLADE_PROXY=` in a compose file
    let (mut args, matches) = parse(&[
      "run",
      "--input-dataset=dataset/",
      "--proxy=",
      "--proxy-user=",
      "--proxy-pass=",
      "--proxy-pass-file=",
      "--extra-ca-certs=",
      "--http-timeout=",
      "seq.fasta",
    ]);
    let conf = network(&mut args);
    conf.record_value_sources(&matches);

    let actual = (
      conf.explicit_proxy().unwrap(),
      conf.extra_ca_certs_path(),
      conf.request_timeout().unwrap(),
      conf.credentials().unwrap().is_some(),
    );
    assert_eq!((None, None, Some(Duration::from_mins(10)), false), actual);
  }

  #[test]
  fn test_network_args_invalid_values_do_not_fail_parsing() {
    let run = run_args(&["--proxy=http://[::1", "--http-timeout=ten"]);
    let conf = &run.inputs.network;
    assert_eq!(
      (Some("http://[::1"), OsStr::new("ten")),
      (conf.explicit_proxy().unwrap(), conf.http_timeout.as_os_str())
    );
  }

  #[cfg(unix)]
  #[rustfmt::skip]
  #[rstest]
  #[case::proxy(        "--proxy",        "The value of `--proxy` or `NEXTCLADE_PROXY` is not valid UTF-8")]
  #[case::proxy_user(   "--proxy-user",   "The value of `--proxy-user` or `NEXTCLADE_PROXY_USER` is not valid UTF-8")]
  #[case::proxy_pass(   "--proxy-pass",   "The value of `--proxy-pass` or `NEXTCLADE_PROXY_PASS` is not valid UTF-8")]
  #[case::http_timeout( "--http-timeout", "The value of `--http-timeout` or `NEXTCLADE_HTTP_TIMEOUT` is not valid UTF-8")]
  #[trace]
  fn test_network_args_non_utf8_value_fails_only_when_the_client_is_built(
    #[case] option: &str,
    #[case] expected: &str,
  ) {
    assert_no_network_env_vars();
    let mut value = OsString::from(format!("{option}="));
    value.push(OsStr::from_bytes(b"\xff"));
    let args = ["nextclade", "run", "--input-dataset=dataset/"]
      .map(OsString::from)
      .into_iter()
      .chain([value, OsString::from("seq.fasta")]);

    let actual = nextclade_parse_args(args).map_err(|err| err.to_string()).map(|args| {
      let NextcladeCommands::Run(run_args) = args.command else {
        panic!("expected `run` command");
      };
      run_http_client(&run_args.inputs, &ProxyEnv::default(), false)
        .err()
        .map(|err| report_to_string(&err))
    });

    assert_eq!(Ok(Some(expected.to_owned())), actual);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::neither(          None,                           None,                           Ok(PasswordSourceChoice::Keep))]
  #[case::only_pass(        Some(ValueSource::CommandLine), None,                           Ok(PasswordSourceChoice::Keep))]
  #[case::only_pass_file(   None,                           Some(ValueSource::EnvVariable), Ok(PasswordSourceChoice::Keep))]
  #[case::cli_pass_wins(    Some(ValueSource::CommandLine), Some(ValueSource::EnvVariable), Ok(PasswordSourceChoice::DropPassFile))]
  #[case::cli_file_wins(    Some(ValueSource::EnvVariable), Some(ValueSource::CommandLine), Ok(PasswordSourceChoice::DropPass))]
  #[case::both_cli(         Some(ValueSource::CommandLine), Some(ValueSource::CommandLine), Err("`--proxy-pass` and `--proxy-pass-file` cannot be used together. Use only one of them"))]
  #[case::both_env(         Some(ValueSource::EnvVariable), Some(ValueSource::EnvVariable), Err("The environment variables `NEXTCLADE_PROXY_PASS` and `NEXTCLADE_PROXY_PASS_FILE` cannot be used together. Set only one of them"))]
  #[trace]
  fn test_network_args_password_source_choice(
    #[case] pass: Option<ValueSource>,
    #[case] pass_file: Option<ValueSource>,
    #[case] expected: Result<PasswordSourceChoice, &str>,
  ) {
    let actual = choose_password_source(pass, pass_file).map_err(|err| report_to_string(&err));
    assert_eq!(expected.map_err(ToOwned::to_owned), actual);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::command_line( ValueSource::CommandLine, "`--proxy-pass` and `--proxy-pass-file` cannot be used together. Use only one of them")]
  #[case::env_variable( ValueSource::EnvVariable, "The environment variables `NEXTCLADE_PROXY_PASS` and `NEXTCLADE_PROXY_PASS_FILE` cannot be used together. Set only one of them")]
  #[trace]
  fn test_network_args_both_password_options_fail_only_when_credentials_are_used(
    #[case] source: ValueSource,
    #[case] expected: &str,
  ) {
    let (mut args, matches) = parse(&[
      "dataset",
      "get",
      "--name=sars-cov-2",
      "--output-dir=out",
      "--proxy-user=user",
      "--proxy-pass=pass",
      "--proxy-pass-file=/run/secrets/proxy",
    ]);
    let conf = network(&mut args);
    conf.record_value_sources(&matches);
    // The environment of the test process cannot be changed, so the source of an environment variable is set
    conf.proxy_pass_source = Some(source);
    conf.proxy_pass_file_source = Some(source);

    let error = conf.credentials().err().unwrap();

    assert_eq!(expected, report_to_string(&error));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::no_newline(       "secret",       "secret")]
  #[case::unix_newline(     "secret\n",     "secret")]
  #[case::windows_newline(  "secret\r\n",   "secret")]
  #[case::only_one_removed( "secret\n\n",   "secret\n")]
  #[case::inner_kept(       "sec\nret",     "sec\nret")]
  #[case::empty(            "",             "")]
  #[trace]
  fn test_network_args_password_file_loses_one_trailing_newline(#[case] input: &str, #[case] expected: &str) {
    assert_eq!(expected, strip_one_trailing_newline(input));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::user_and_pass( Some("user"), Some("pass"), Some(("user", "pass")))]
  #[case::neither(       None,         None,         None)]
  #[trace]
  fn test_network_args_credentials_are_paired(
    #[case] user: Option<&str>,
    #[case] pass: Option<&str>,
    #[case] expected: Option<(&str, &str)>,
  ) {
    let conf = NetworkArgs {
      proxy_user: user.and_then(secret),
      proxy_pass: pass.and_then(secret),
      ..NetworkArgs::default()
    };
    let credentials = conf.credentials().unwrap();
    let actual = credentials.as_ref().map(|c| (c.user.expose_secret(), c.pass.expose_secret()));
    assert_eq!(expected, actual);
  }

  #[test]
  fn test_network_args_both_passwords_without_recorded_sources_fail() {
    let conf = NetworkArgs {
      proxy_user: secret("user"),
      proxy_pass: secret("pass"),
      proxy_pass_file: Some(OsString::from("/run/secrets/proxy")),
      ..NetworkArgs::default()
    };
    assert_eq!(
      "Both proxy password options have a value, but the sources of the values were not recorded after parsing. This is an internal error. Please report it to developers",
      report_to_string(&conf.credentials().err().unwrap())
    );
  }

  #[test]
  fn test_network_args_parse_records_password_sources() {
    assert_no_network_env_vars();
    let args = nextclade_parse_args([
      "nextclade",
      "run",
      "--dataset-name=sars-cov-2",
      "--proxy-user=u",
      "--proxy-pass=x",
      "--proxy-pass-file=y",
      "seq.fasta",
    ])
    .unwrap();
    let NextcladeCommands::Run(run_args) = args.command else {
      panic!("expected `run` command");
    };

    let error = run_args.inputs.network.credentials().err().unwrap();

    assert_eq!(
      "`--proxy-pass` and `--proxy-pass-file` cannot be used together. Use only one of them",
      report_to_string(&error)
    );
  }

  #[test]
  fn test_network_args_command_line_password_wins_over_password_file_variable() {
    let (mut args, matches) = parse(&[
      "sort",
      "--proxy-user=user",
      "--proxy-pass=pass",
      "--proxy-pass-file=/nonexistent",
      "seq.fasta",
    ]);
    let conf = network(&mut args);
    conf.record_value_sources(&matches);
    conf.proxy_pass_file_source = Some(ValueSource::EnvVariable);

    let credentials = conf.credentials().unwrap().unwrap();

    assert_eq!(
      ("user", "pass"),
      (credentials.user.expose_secret(), credentials.pass.expose_secret())
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::run(          &["run"])]
  #[case::dataset_get(  &["dataset", "get"])]
  #[case::dataset_list( &["dataset", "list"])]
  #[case::sort(         &["sort"])]
  #[trace]
  fn test_network_args_read_environment_variables(#[case] path: &[&str]) {
    let cmd = subcommand(path);
    #[rustfmt::skip]
    let expected = [
      ("proxy",           "NEXTCLADE_PROXY"),
      ("proxy_user",      "NEXTCLADE_PROXY_USER"),
      ("proxy_pass",      "NEXTCLADE_PROXY_PASS"),
      ("proxy_pass_file", "NEXTCLADE_PROXY_PASS_FILE"),
      ("extra_ca_certs",  "NEXTCLADE_EXTRA_CA_CERTS"),
      ("http_timeout",    "NEXTCLADE_HTTP_TIMEOUT"),
    ];
    let actual = expected
      .iter()
      .map(|(id, _)| {
        let env = cmd.get_arguments().find(|arg| arg.get_id() == *id).and_then(Arg::get_env);
        (*id, env)
      })
      .collect::<Vec<_>>();
    let expected = expected.map(|(id, env)| (id, Some(OsStr::new(env)))).to_vec();
    assert_eq!(expected, actual);
  }

  #[test]
  fn test_network_args_help_hides_values_of_proxy_secrets() {
    let cmd = subcommand(&["run"]);
    #[rustfmt::skip]
    let expected = vec![
      ("proxy",           true),
      ("proxy_user",      true),
      ("proxy_pass",      true),
      ("proxy_pass_file", false),
      ("extra_ca_certs",  false),
      ("http_timeout",    false),
    ];
    let actual = expected
      .iter()
      .map(|(id, _)| {
        let hidden = cmd
          .get_arguments()
          .find(|arg| arg.get_id() == *id)
          .is_some_and(Arg::is_hide_env_values_set);
        (*id, hidden)
      })
      .collect::<Vec<_>>();
    assert_eq!(expected, actual);
  }

  #[test]
  fn test_network_args_proxy_pass_file_provides_the_password() {
    let dir = tempfile::TempDir::new().unwrap();
    let pass_file = dir.path().join("password");
    std::fs::write(&pass_file, "secret\n").unwrap();

    let run = run_args(&[
      "--proxy=http://proxy.test:3128",
      "--proxy-user=user",
      &format!("--proxy-pass-file={}", pass_file.display()),
    ]);
    let credentials = run.inputs.network.credentials().unwrap().unwrap();

    assert_eq!(
      ("user", "secret"),
      (credentials.user.expose_secret(), credentials.pass.expose_secret())
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::command_line(  Some(ValueSource::CommandLine),  "pass", Some(true))]
  #[case::empty_value(   Some(ValueSource::CommandLine),  "",     None)]
  #[case::env_variable(  Some(ValueSource::EnvVariable),  "pass", None)]
  #[case::absent(        None,                            "pass", None)]
  #[trace]
  fn test_network_args_proxy_pass_warning_only_for_command_line(
    #[case] source: Option<ValueSource>,
    #[case] pass: &str,
    #[case] expected: Option<bool>,
  ) {
    let conf = NetworkArgs {
      proxy_pass: secret(pass),
      proxy_pass_source: source,
      ..NetworkArgs::default()
    };
    let names_safer_options = conf
      .proxy_pass_warning()
      .map(|warning| warning.contains("NEXTCLADE_PROXY_PASS") && warning.contains("--proxy-pass-file"));
    assert_eq!(expected, names_safer_options);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::run(         &["run", "--dataset-name=sars-cov-2", "--proxy-pass=pass", "seq.fasta"])]
  #[case::dataset_get( &["dataset", "get", "--name=sars-cov-2", "--output-dir=out", "--proxy-pass=pass"])]
  #[case::sort(        &["sort", "--proxy-pass=pass", "seq.fasta"])]
  #[trace]
  fn test_network_args_proxy_pass_source_is_found_in_subcommands(#[case] args: &[&str]) {
    let (mut args, matches) = parse(args);
    let conf = network(&mut args);
    conf.record_value_sources(&matches);
    assert_eq!(Some(ValueSource::CommandLine), conf.proxy_pass_source);
  }

  #[test]
  fn test_network_args_commands_without_network_options_have_no_network_args() {
    let (mut args, _) = parse(&["completions", "bash"]);
    assert!(args.command.network_mut().is_none());
  }

  pub mod helpers {
    use super::*;
    use crate::cli::nextclade_cli::{NextcladeArgs, NextcladeCommands, NextcladeRunArgs};
    use crate::io::network_args::SecretBytes;
    use clap::{ArgMatches, FromArgMatches};

    const NETWORK_ENV_VARS: [&str; 6] = [
      "NEXTCLADE_PROXY",
      "NEXTCLADE_PROXY_USER",
      "NEXTCLADE_PROXY_PASS",
      "NEXTCLADE_PROXY_PASS_FILE",
      "NEXTCLADE_EXTRA_CA_CERTS",
      "NEXTCLADE_HTTP_TIMEOUT",
    ];

    /// Fail when a network variable is set in the test environment, because clap would read it into the result
    pub fn assert_no_network_env_vars() {
      let set_vars = NETWORK_ENV_VARS
        .into_iter()
        .filter(|name| std::env::var_os(name).is_some())
        .collect::<Vec<_>>();
      assert!(
        set_vars.is_empty(),
        "unset these variables to run the tests: {set_vars:?}"
      );
    }

    /// Parse `nextclade <args>` through the real command definitions
    pub fn parse(args: &[&str]) -> (NextcladeArgs, ArgMatches) {
      assert_no_network_env_vars();
      let matches = NextcladeArgs::command()
        .try_get_matches_from(std::iter::once("nextclade").chain(args.iter().copied()))
        .unwrap();
      let parsed = NextcladeArgs::from_arg_matches(&matches).unwrap();
      (parsed, matches)
    }

    pub fn run_args(network_args: &[&str]) -> NextcladeRunArgs {
      let args = ["run", "--dataset-name=sars-cov-2"]
        .into_iter()
        .chain(network_args.iter().copied())
        .chain(["seq.fasta"])
        .collect::<Vec<_>>();
      assert_no_network_env_vars();
      let args = nextclade_parse_args(std::iter::once("nextclade").chain(args)).unwrap();
      match args.command {
        NextcladeCommands::Run(run_args) => *run_args,
        _ => panic!("expected `run` command"),
      }
    }

    pub fn secret(value: &str) -> Option<SecretBytes> {
      Some(SecretBytes::from(value.as_bytes().to_vec()))
    }

    pub fn network(args: &mut NextcladeArgs) -> &mut NetworkArgs {
      args.command.network_mut().unwrap()
    }

    pub fn subcommand(path: &[&str]) -> clap::Command {
      let mut cmd = NextcladeArgs::command();
      cmd.build();
      for name in path {
        cmd = cmd.find_subcommand(name).unwrap().clone();
      }
      cmd
    }
  }
}
