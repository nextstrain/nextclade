#[cfg(test)]
mod tests {
  use crate::dataset::dataset_download::run_http_client;
  use crate::io::__tests__::test_network_args::tests::helpers::{run_args, secret};
  use crate::io::http_client::HttpClient;
  use crate::io::network_args::NetworkArgs;
  use crate::io::proxy::ProxyEnv;
  use helpers::{
    PROXY, TARGET, UNPAIRED, assert_never_contacted, client, direct_env, serve_once, serve_slowly, serve_stalled,
    unused_listener,
  };
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::ffi::OsString;
  #[cfg(unix)]
  use std::os::unix::ffi::OsStringExt;
  use std::time::Duration;
  use url::Url;

  #[rustfmt::skip]
  #[rstest]
  #[case::with_scheme(    true)]
  #[case::without_scheme( false)]
  #[trace]
  fn test_http_client_explicit_proxy_receives_absolute_form_request(#[case] with_scheme: bool) {
    let (proxy, requests) = serve_once(helpers::OK);
    let proxy = if with_scheme {
      proxy.to_string()
    } else {
      format!("127.0.0.1:{}", proxy.port().unwrap())
    };
    let conf = NetworkArgs {
      proxy: secret(&proxy),
      ..NetworkArgs::default()
    };

    let content = client(TARGET, &conf, &ProxyEnv::default()).get("index.json").unwrap();

    assert_eq!(b"ok".to_vec(), content);
    let request = requests.recv().unwrap();
    assert!(
      request.starts_with("GET http://dataset-server.test/v3/index.json HTTP/1.1\r\n"),
      "{request}"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::without_trailing_slash( "v3",  "index.json",  "GET /v3/index.json HTTP/1.1")]
  #[case::with_trailing_slash(    "v3/", "index.json",  "GET /v3/index.json HTTP/1.1")]
  #[case::with_leading_slash(     "v3/", "/index.json", "GET /v3/index.json HTTP/1.1")]
  #[case::at_host_root(           "",    "index.json",  "GET /index.json HTTP/1.1")]
  #[trace]
  fn test_http_client_requests_paths_below_the_server_root(
    #[case] root_path: &str,
    #[case] url: &str,
    #[case] expected_request_line: &str,
  ) {
    let (server, requests) = serve_once(helpers::OK);
    let root = format!("{server}{root_path}");

    let content = client(&root, &NetworkArgs::default(), &direct_env()).get(url).unwrap();

    assert_eq!(b"ok".to_vec(), content);
    let request = requests.recv().unwrap();
    assert_eq!(Some(expected_request_line), request.lines().next());
  }

  #[test]
  fn test_http_client_explicit_proxy_sends_basic_auth() {
    let (proxy, requests) = serve_once(helpers::OK);
    let conf = NetworkArgs {
      proxy: secret(proxy.as_str()),
      proxy_user: secret("user"),
      proxy_pass: secret("pass"),
      ..NetworkArgs::default()
    };

    client(TARGET, &conf, &ProxyEnv::default()).get("index.json").unwrap();

    let request = requests.recv().unwrap().to_lowercase();
    // base64 of "user:pass"
    assert!(
      request.contains("\r\nproxy-authorization: basic dxnlcjpwyxnz\r\n"),
      "{request}"
    );
  }

  #[test]
  fn test_http_client_explicit_proxy_is_bypassed_for_no_proxy_hosts() {
    let (target, requests) = serve_once(helpers::OK);
    let (proxy_listener, proxy) = unused_listener();
    let conf = NetworkArgs {
      proxy: secret(proxy.as_str()),
      ..NetworkArgs::default()
    };
    let env = ProxyEnv {
      no_proxy: Some("127.0.0.1".to_owned()),
      ..ProxyEnv::default()
    };

    client(&format!("{target}v3"), &conf, &env).get("index.json").unwrap();

    let request = requests.recv().unwrap();
    assert!(request.starts_with("GET /v3/index.json HTTP/1.1\r\n"), "{request}");
    assert_never_contacted(&proxy_listener);
  }

  #[test]
  fn test_http_client_https_proxy_variable_receives_connect_for_https_requests() {
    let (proxy, requests) = serve_once("HTTP/1.1 403 Forbidden\r\nContent-Length: 0\r\nConnection: close\r\n\r\n");
    let env = ProxyEnv {
      https: Some(proxy.to_string()),
      ..ProxyEnv::default()
    };

    let result = client("https://dataset-server.test/v3", &NetworkArgs::default(), &env).get("index.json");

    let request = requests.recv().unwrap();
    assert_eq!(
      (Some("CONNECT dataset-server.test:443 HTTP/1.1"), true),
      (request.lines().next(), result.is_err())
    );
  }

  #[test]
  fn test_http_client_https_proxy_variable_is_not_used_for_http_requests() {
    let (target, requests) = serve_once(helpers::OK);
    let (proxy_listener, proxy) = unused_listener();
    let env = ProxyEnv {
      https: Some(proxy.to_string()),
      ..ProxyEnv::default()
    };

    client(&format!("{target}v3"), &NetworkArgs::default(), &env)
      .get("index.json")
      .unwrap();

    let request = requests.recv().unwrap();
    assert_eq!(Some("GET /v3/index.json HTTP/1.1"), request.lines().next());
    assert_never_contacted(&proxy_listener);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::all_proxy(                      &[("ALL_PROXY", PROXY)])]
  #[case::http_proxy(                     &[("http_proxy", PROXY)])]
  #[case::http_proxy_wins_over_all_proxy( &[("HTTP_PROXY", PROXY), ("ALL_PROXY", "http://127.0.0.1:9")])]
  #[trace]
  fn test_http_client_standard_proxy_variables_are_used(#[case] vars: &[(&str, &str)]) {
    let (proxy, requests) = serve_once(helpers::OK);
    let env = ProxyEnv::from_lookup(|name| {
      let value = vars.iter().find(|(var, _)| *var == name)?.1;
      Some(OsString::from(if value == PROXY { proxy.to_string() } else { value.to_owned() }))
    });

    client(TARGET, &NetworkArgs::default(), &env).get("index.json").unwrap();

    let request = requests.recv().unwrap();
    assert!(
      request.starts_with("GET http://dataset-server.test/v3/index.json HTTP/1.1\r\n"),
      "{request}"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::no_headers(       None)]
  #[case::body_incomplete(  Some("HTTP/1.1 200 OK\r\nContent-Length: 100\r\n\r\npartial"))]
  #[trace]
  fn test_http_client_stalled_response_fails_at_the_deadline(#[case] sent_before_stall: Option<&'static str>) {
    let (target, hold, server) = serve_stalled(sent_before_stall);
    let http = HttpClient::with_proxy_env(&target, &NetworkArgs::default(), &direct_env(), false)
      .unwrap()
      .with_timeout(Some(Duration::from_millis(300)));

    let error = report_to_string(&http.get("index.json").unwrap_err());
    drop(hold);
    server.join().unwrap();

    assert!(
      error.contains("`--http-timeout <SECONDS>`") && error.contains("`NEXTCLADE_HTTP_TIMEOUT`"),
      "{error}"
    );
  }

  #[test]
  fn test_http_client_one_deadline_covers_headers_and_body() {
    // Each phase alone fits into the deadline, both together do not. A deadline that restarts for the body lets
    // the request succeed unless scheduling delays one phase by 500 ms, so this regression fails the test also on
    // a loaded machine. A delay can only make the correct deadline expire earlier
    let deadline = Duration::from_secs(2);
    let (target, server) = serve_slowly(
      deadline.mul_f64(0.75),
      "HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\n",
      deadline.mul_f64(0.75),
      "ok",
    );
    let http = HttpClient::with_proxy_env(&target, &NetworkArgs::default(), &direct_env(), false)
      .unwrap()
      .with_timeout(Some(deadline));

    let error = report_to_string(&http.get("index.json").unwrap_err());
    server.join().unwrap();

    assert!(error.contains("`--http-timeout <SECONDS>`"), "{error}");
  }

  #[test]
  fn test_http_client_run_downloads_with_its_network_options() {
    let (proxy, requests) = serve_once(helpers::OK);
    let run_args = run_args(&[&format!("--server={TARGET}"), &format!("--proxy={proxy}")]);

    run_http_client(&run_args.inputs, &ProxyEnv::default(), false)
      .unwrap()
      .get("index.json")
      .unwrap();

    let request = requests.recv().unwrap();
    assert!(
      request.starts_with("GET http://dataset-server.test/v3/index.json HTTP/1.1\r\n"),
      "{request}"
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::proxy(        "--proxy=http://[::1",  "Invalid proxy URL in `--proxy` or `NEXTCLADE_PROXY`")]
  #[case::http_timeout( "--http-timeout=ten",   "When parsing the value of `--http-timeout` or `NEXTCLADE_HTTP_TIMEOUT`")]
  #[trace]
  fn test_http_client_invalid_network_option_fails_when_the_client_is_built(
    #[case] arg: &str,
    #[case] expected: &str,
  ) {
    let run_args = run_args(&[arg]);

    let error = run_http_client(&run_args.inputs, &ProxyEnv::default(), false).err().unwrap();

    let error = report_to_string(&error);
    assert!(error.starts_with(expected), "{error}");
  }

  #[test]
  fn test_http_client_invalid_explicit_proxy_error_hides_the_password() {
    let run_args = run_args(&["--proxy=user:s3cret@[bad"]);

    let error = run_http_client(&run_args.inputs, &ProxyEnv::default(), false)
      .err()
      .unwrap();

    let error = report_to_string(&error);
    assert!(!error.contains("s3cret"), "{error}");
  }

  #[test]
  fn test_http_client_invalid_proxy_variable_error_hides_the_password() {
    let env = ProxyEnv {
      https: Some("user:s3cret@[bad".to_owned()),
      ..ProxyEnv::default()
    };
    let root = Url::parse(TARGET).unwrap();

    let error = HttpClient::with_proxy_env(&root, &NetworkArgs::default(), &env, false)
      .err()
      .unwrap();

    let error = report_to_string(&error);
    assert!(!error.contains("s3cret"), "{error}");
  }

  #[test]
  fn test_http_client_invalid_standard_proxy_variable_is_an_error() {
    let env = ProxyEnv {
      https: Some("http://[::1".to_owned()),
      ..ProxyEnv::default()
    };
    let root = Url::parse(TARGET).unwrap();

    let error = HttpClient::with_proxy_env(&root, &NetworkArgs::default(), &env, false)
      .err()
      .unwrap();

    let error = report_to_string(&error);
    assert!(error.contains("`HTTPS_PROXY` or `https_proxy`"), "{error}");
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::user_without_password(  &["--proxy-user=user"],                                             UNPAIRED)]
  #[case::password_without_user(  &["--proxy-pass=pass"],                                             UNPAIRED)]
  #[case::file_without_user(      &["--proxy-pass-file=/run/secrets/proxy"],                          UNPAIRED)]
  #[case::two_password_arguments( &["--proxy-user=user", "--proxy-pass=pass", "--proxy-pass-file=/run/secrets/proxy"], "`--proxy-pass` and `--proxy-pass-file` cannot be used together. Use only one of them")]
  #[case::missing_password_file(  &["--proxy-user=user", "--proxy-pass-file=/nonexistent/password"],  "When reading the proxy password file '/nonexistent/password' given with `--proxy-pass-file` or `NEXTCLADE_PROXY_PASS_FILE`: No such file or directory (os error 2)")]
  #[trace]
  fn test_http_client_credential_errors_do_not_depend_on_the_proxy_source(
    #[case] credential_args: &[&str],
    #[case] expected: &str,
    #[values(&[][..], &["--proxy=http://127.0.0.1:9"][..])] proxy_args: &[&str],
    #[values(ProxyEnv::default(), direct_env())] env: ProxyEnv,
  ) {
    let run_args = run_args(&[proxy_args, credential_args].concat());

    let error = run_http_client(&run_args.inputs, &env, false).err().map(|err| report_to_string(&err));

    assert_eq!(Some(expected.to_owned()), error);
  }

  #[test]
  fn test_http_client_unused_valid_credentials_do_not_fail() {
    let run_args = run_args(&["--proxy-user=user", "--proxy-pass=pass"]);
    run_http_client(&run_args.inputs, &direct_env(), false).unwrap();
  }

  #[cfg(unix)]
  #[rustfmt::skip]
  #[rstest]
  #[case::no_proxy_for_explicit(      &["NO_PROXY"],                      true,  Some("NO_PROXY"))]
  #[case::no_proxy_for_system(        &["no_proxy"],                      false, Some("no_proxy"))]
  #[case::no_proxy_for_environment(   &["NO_PROXY", "ALL_PROXY=http://127.0.0.1:9"], false, Some("NO_PROXY"))]
  #[case::https_for_environment(      &["HTTPS_PROXY"],                   false, Some("HTTPS_PROXY"))]
  #[case::http_for_environment(       &["http_proxy"],                    false, Some("http_proxy"))]
  #[case::all_for_environment(        &["ALL_PROXY"],                     false, Some("ALL_PROXY"))]
  #[case::https_for_explicit(         &["HTTPS_PROXY"],                   true,  None)]
  #[case::all_for_explicit(           &["all_proxy"],                     true,  None)]
  #[case::http_for_cgi_system(        &["HTTP_PROXY", "REQUEST_METHOD=GET"], false, None)]
  #[case::http_for_cgi_environment(   &["HTTP_PROXY", "REQUEST_METHOD=GET", "HTTPS_PROXY=http://127.0.0.1:9"], false, None)]
  #[case::https_for_cgi_environment(  &["HTTPS_PROXY", "REQUEST_METHOD=GET"], false, Some("HTTPS_PROXY"))]
  #[trace]
  fn test_http_client_non_utf8_proxy_variable_is_an_error_only_when_read(
    #[case] vars: &[&str],
    #[case] explicit: bool,
    #[case] expected: Option<&str>,
  ) {
    // A variable without `=` has a value that is not valid UTF-8
    let env = ProxyEnv::from_lookup(|name| {
      vars.iter().find_map(|var| match var.split_once('=') {
        Some((var, value)) => (var == name).then(|| OsString::from(value)),
        None => (*var == name).then(|| OsString::from_vec(vec![0xff])),
      })
    });
    let conf = NetworkArgs {
      proxy: explicit.then(|| secret("http://127.0.0.1:9")).flatten(),
      ..NetworkArgs::default()
    };
    let root = Url::parse(TARGET).unwrap();

    let error = HttpClient::with_proxy_env(&root, &conf, &env, false)
      .err()
      .map(|err| report_to_string(&err));

    let expected = expected.map(|name| format!("The value of the environment variable `{name}` is not valid UTF-8"));
    assert_eq!(expected, error);
  }

  mod helpers {
    use super::*;
    use std::io::{BufRead, BufReader, ErrorKind, Write};
    use std::net::TcpListener;
    use std::sync::mpsc::{Receiver, Sender, channel};
    use std::thread::{self, JoinHandle};

    /// Dataset server address that never resolves, so that only a proxy can answer requests to it
    pub const TARGET: &str = "http://dataset-server.test/v3";

    /// Placeholder for the address of the test proxy server in proxy variables
    pub const PROXY: &str = "<test proxy>";

    pub const OK: &str = "HTTP/1.1 200 OK\r\nContent-Length: 2\r\nConnection: close\r\n\r\nok";

    pub const UNPAIRED: &str = "`--proxy-user` / `NEXTCLADE_PROXY_USER` and a password (`--proxy-pass` / `NEXTCLADE_PROXY_PASS` or `--proxy-pass-file` / `NEXTCLADE_PROXY_PASS_FILE`) must be either both given or both omitted";

    pub fn client(root: &str, conf: &NetworkArgs, env: &ProxyEnv) -> HttpClient {
      let root = Url::parse(root).unwrap();
      HttpClient::with_proxy_env(&root, conf, env, false)
        .unwrap()
        .with_timeout(Some(Duration::from_secs(10)))
    }

    /// Proxy variables that send loopback requests directly, independent of the proxy settings of the machine
    pub fn direct_env() -> ProxyEnv {
      ProxyEnv {
        all: Some("http://127.0.0.1:9".to_owned()),
        no_proxy: Some("127.0.0.1".to_owned()),
        ..ProxyEnv::default()
      }
    }

    pub fn unused_listener() -> (TcpListener, Url) {
      let listener = TcpListener::bind("127.0.0.1:0").unwrap();
      let url = Url::parse(&format!("http://{}", listener.local_addr().unwrap())).unwrap();
      (listener, url)
    }

    /// Assert that no connection is waiting on the listener
    pub fn assert_never_contacted(listener: &TcpListener) {
      listener.set_nonblocking(true).unwrap();
      let accepted = listener.accept().map(|_| ());
      assert!(
        matches!(&accepted, Err(e) if e.kind() == ErrorKind::WouldBlock),
        "{accepted:?}"
      );
    }

    /// Serve one connection with `response` and send the request head (request line and headers) to the receiver
    pub fn serve_once(response: &'static str) -> (Url, Receiver<String>) {
      let (listener, url) = unused_listener();
      let (tx, rx) = channel();
      thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        let head = read_request_head(&mut BufReader::new(&stream));
        stream.write_all(response.as_bytes()).unwrap();
        tx.send(head).unwrap();
      });
      (url, rx)
    }

    /// Longest time a stalled server holds its connection. If the client deadline does not work, the server
    /// closes the connection after this time, and the request fails with an error that is not a timeout.
    const MAX_STALL: Duration = Duration::from_secs(10);

    /// Accept one connection, send `sent_before_stall`, then keep the connection open without sending more,
    /// until the returned sender is dropped or `MAX_STALL` elapses
    pub fn serve_stalled(sent_before_stall: Option<&'static str>) -> (Url, Sender<()>, JoinHandle<()>) {
      let (listener, url) = unused_listener();
      let (hold_tx, hold_rx) = channel::<()>();
      let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        read_request_head(&mut BufReader::new(&stream));
        if let Some(data) = sent_before_stall {
          stream.write_all(data.as_bytes()).unwrap();
        }
        // Returns an error when the test drops the sender or the time elapses; nothing is ever sent
        hold_rx.recv_timeout(MAX_STALL).unwrap_err();
      });
      (url, hold_tx, server)
    }

    /// Accept one connection, send `head` after `head_delay`, then `body` after `body_delay`, then close it.
    /// Writes after the client has given up are ignored
    pub fn serve_slowly(
      head_delay: Duration,
      head: &'static str,
      body_delay: Duration,
      body: &'static str,
    ) -> (Url, JoinHandle<()>) {
      let (listener, url) = unused_listener();
      let server = thread::spawn(move || {
        let (mut stream, _) = listener.accept().unwrap();
        read_request_head(&mut BufReader::new(&stream));
        for (delay, data) in [(head_delay, head), (body_delay, body)] {
          thread::sleep(delay);
          if stream.write_all(data.as_bytes()).is_err() {
            return;
          }
        }
      });
      (url, server)
    }

    fn read_request_head(reader: &mut impl BufRead) -> String {
      let mut head = String::new();
      loop {
        let mut line = String::new();
        if reader.read_line(&mut line).unwrap() == 0 || line == "\r\n" {
          return head;
        }
        head.push_str(&line);
      }
    }
  }
}
