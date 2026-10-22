//! Network options of the `nextclade` executable, with environment variables that only the child process sees

#[cfg(test)]
mod tests {
  use helpers::{INDEX_REQUEST, SECRETS, direct_env, nextclade, received_request, serve_once};
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  #[cfg(unix)]
  use std::ffi::OsStr;
  #[cfg(unix)]
  use std::os::unix::ffi::OsStrExt;

  #[rustfmt::skip]
  #[rstest]
  #[case::argument_wins( true,  (Some(INDEX_REQUEST), None))]
  #[case::variable_only( false, (None,                Some(INDEX_REQUEST)))]
  #[trace]
  fn test_network_options_proxy_argument_wins_over_variable(
    #[case] with_argument: bool,
    #[case] expected: (Option<&str>, Option<&str>),
  ) {
    let (argument_proxy, argument_requests) = serve_once();
    let (variable_proxy, variable_requests) = serve_once();
    let mut cmd = nextclade();
    cmd.args(["dataset", "list", "--server=http://dataset-server.test/v3"]);
    cmd.env("NEXTCLADE_PROXY", variable_proxy.as_str());
    if with_argument {
      cmd.arg(format!("--proxy={argument_proxy}"));
    }

    cmd.output().unwrap();

    assert_eq!(
      (expected.0.map(ToOwned::to_owned), expected.1.map(ToOwned::to_owned)),
      (received_request(&argument_requests), received_request(&variable_requests))
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::argument_wins( &["--http-timeout=5"], Some("GET /v3/index.json HTTP/1.1"), false)]
  #[case::variable_only( &[],                   None,                                true)]
  #[trace]
  fn test_network_options_http_timeout_argument_wins_over_variable(
    #[case] args: &[&str],
    #[case] expected_request: Option<&str>,
    #[case] expected_timeout_error: bool,
  ) {
    let (server, requests) = serve_once();
    let output = direct_env(&mut nextclade())
      .args(["dataset", "list", &format!("--server={server}v3")])
      .args(args)
      .env("NEXTCLADE_HTTP_TIMEOUT", "ten")
      .output()
      .unwrap();

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert_eq!(
      (expected_request.map(ToOwned::to_owned), expected_timeout_error),
      (
        received_request(&requests),
        stderr.contains("When parsing the value of `--http-timeout` or `NEXTCLADE_HTTP_TIMEOUT`")
      ),
      "{stderr}"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::run(          &["run"])]
  #[case::dataset_get(  &["dataset", "get"])]
  #[case::dataset_list( &["dataset", "list"])]
  #[case::sort(         &["sort"])]
  #[trace]
  fn test_network_options_help_does_not_print_proxy_variable_values(#[case] command: &[&str]) {
    let output = nextclade()
      .args(command)
      .arg("--help")
      .env("NEXTCLADE_PROXY", "http://u:p4ss@proxy.test:1")
      .env("NEXTCLADE_PROXY_USER", "us3r")
      .env("NEXTCLADE_PROXY_PASS", "s3cret")
      .output()
      .unwrap();

    let help = String::from_utf8_lossy(&output.stdout);
    let leaked = SECRETS
      .into_iter()
      .filter(|secret| help.contains(secret))
      .collect::<Vec<_>>();
    assert_eq!(
      (true, true, Vec::<&str>::new()),
      (output.status.success(), help.contains("[env: NEXTCLADE_PROXY]"), leaked),
      "{help}"
    );
  }

  #[cfg(unix)]
  #[test]
  fn test_network_options_non_utf8_variables_do_not_affect_a_run_without_download() {
    let dir = tempfile::TempDir::new().unwrap();
    let fasta = ">ref\nATGGCTAGCTTCGATCGGATCCTAGGCTTAACGGTACCTGAGCTCAAGCTTGCATGCCTGCAGGTCGACTCTAGAGGATCCCCGGGTACCGAGCTCGAATTCACTGGCCGTCGTTTTACAACGTCGTGACTGGGAAAACCCTGGCGTTACCCAACTTAATCGCCTTGCAGCACATCCCCCTTTCGCCAGCTGGCGTAATAGCGAAGAGGCCCGCACCGATCGCCCTTCCCAACAGTTGCGCAGCCTGAATGGCGAATGG\n";
    std::fs::write(dir.path().join("ref.fasta"), fasta).unwrap();
    std::fs::write(dir.path().join("seq.fasta"), fasta.replace(">ref", ">seq")).unwrap();
    let non_utf8 = OsStr::from_bytes(b"\xff");

    let output = nextclade()
      .current_dir(dir.path())
      .args(["run", "--input-ref=ref.fasta", "--output-tsv=out.tsv", "seq.fasta"])
      .env("NEXTCLADE_PROXY", non_utf8)
      .env("NEXTCLADE_PROXY_USER", non_utf8)
      .env("NEXTCLADE_PROXY_PASS", non_utf8)
      .env("NEXTCLADE_HTTP_TIMEOUT", non_utf8)
      .output()
      .unwrap();

    assert_eq!(
      (true, true),
      (output.status.success(), dir.path().join("out.tsv").is_file()),
      "{}",
      String::from_utf8_lossy(&output.stderr)
    );
  }

  #[cfg(unix)]
  #[test]
  fn test_network_options_non_utf8_variable_fails_a_download() {
    let (server, requests) = serve_once();
    let output = direct_env(&mut nextclade())
      .args(["dataset", "list", &format!("--server={server}v3")])
      .env("NEXTCLADE_PROXY", OsStr::from_bytes(b"\xff"))
      .output()
      .unwrap();

    let stderr = String::from_utf8_lossy(&output.stderr);
    assert_eq!(
      (false, true, None),
      (
        output.status.success(),
        stderr.contains("The value of `--proxy` or `NEXTCLADE_PROXY` is not valid UTF-8"),
        received_request(&requests)
      ),
      "{stderr}"
    );
  }

  mod helpers {
    use std::io::{BufRead, BufReader, Write};
    use std::net::TcpListener;
    use std::process::{Command, Stdio};
    use std::sync::mpsc::{Receiver, channel};
    use std::thread;
    use url::Url;

    /// Request line of a `dataset list` request through a proxy
    pub const INDEX_REQUEST: &str = "GET http://dataset-server.test/v3/index.json HTTP/1.1";

    /// Values of the proxy variables that `--help` must not print
    pub const SECRETS: [&str; 3] = ["p4ss", "us3r", "s3cret"];

    /// Variables of the test environment that change which network settings the child process uses
    const NETWORK_ENV_VARS: [&str; 15] = [
      "NEXTCLADE_PROXY",
      "NEXTCLADE_PROXY_USER",
      "NEXTCLADE_PROXY_PASS",
      "NEXTCLADE_PROXY_PASS_FILE",
      "NEXTCLADE_EXTRA_CA_CERTS",
      "NEXTCLADE_HTTP_TIMEOUT",
      "ALL_PROXY",
      "all_proxy",
      "HTTP_PROXY",
      "http_proxy",
      "HTTPS_PROXY",
      "https_proxy",
      "NO_PROXY",
      "no_proxy",
      "REQUEST_METHOD",
    ];

    /// The `nextclade` executable without the network variables of the test environment. The output is captured,
    /// so that no child process keeps the output of the test open
    pub fn nextclade() -> Command {
      let mut cmd = Command::new(env!("CARGO_BIN_EXE_nextclade"));
      for name in NETWORK_ENV_VARS {
        cmd.env_remove(name);
      }
      cmd.stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped());
      cmd
    }

    /// Send loopback requests directly, independent of the proxy settings of the machine
    pub fn direct_env(cmd: &mut Command) -> &mut Command {
      cmd.env("ALL_PROXY", "http://127.0.0.1:9").env("NO_PROXY", "127.0.0.1")
    }

    /// Serve one connection with a 404 response, which the client does not retry. The request line is sent to the
    /// receiver before the response, so it is there when the child process has exited
    pub fn serve_once() -> (Url, Receiver<String>) {
      let listener = TcpListener::bind("127.0.0.1:0").unwrap();
      let url = Url::parse(&format!("http://{}", listener.local_addr().unwrap())).unwrap();
      let (tx, rx) = channel();
      thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let mut reader = BufReader::new(&stream);
        let mut request_line = String::new();
        reader.read_line(&mut request_line).unwrap();
        let mut header = String::new();
        while reader.read_line(&mut header).unwrap() > 0 && header != "\r\n" {
          header.clear();
        }
        tx.send(request_line.trim_end().to_owned()).unwrap();
        // The client may already have given up
        stream
          .write_all(b"HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\nConnection: close\r\n\r\n")
          .unwrap_or_default();
      });
      (url, rx)
    }

    /// Return the request line that the server received, after the child process has exited
    pub fn received_request(requests: &Receiver<String>) -> Option<String> {
      requests.try_recv().ok()
    }
  }
}
