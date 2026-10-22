use clap::builder::{OsStringValueParser, TypedValueParser};
use clap::parser::ValueSource;
use clap::{ArgMatches, Parser, ValueHint};
use eyre::{Report, WrapErr, eyre};
use nextclade::{make_error, make_internal_error};
use secrecy::{ExposeSecret, SecretSlice, SecretString};
use std::ffi::{OsStr, OsString};
use std::path::{Path, PathBuf};
use std::time::Duration;

pub const DEFAULT_HTTP_TIMEOUT_SECS: u64 = 600;

/// Network options shared by all commands that download data.
///
/// The values are kept as given, in any encoding, and checked only when an HTTP client is built, so that a command
/// that does not download anything is not affected by the network variables. An empty value, for example from
/// `NEXTCLADE_PROXY=` in a container configuration, counts as not set. The proxy URL, user, and password are
/// `SecretBytes`, so that the `Debug` output of the arguments, which `nextclade run -v` logs, does not show them.
#[derive(Parser, Debug, Clone)]
#[clap(verbatim_doc_comment)]
#[clap(next_help_heading = "Network")]
pub struct NetworkArgs {
  /// Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported.
  ///
  /// A value without a scheme, for example `10.0.0.1:3128`, is an HTTP proxy. Credentials can be part of the URL, for example `http://user:password@proxy.example.com:3128`.
  ///
  /// Hosts listed in the environment variable `NO_PROXY` (or `no_proxy`) are reached directly, without the proxy.
  ///
  /// Without this option, Nextclade uses the standard proxy environment variables `HTTPS_PROXY`, `HTTP_PROXY` and `ALL_PROXY` (upper or lower case) together with `NO_PROXY`. When none of these variables is set, Nextclade uses the system proxy settings on macOS and Windows. A variable set to an empty value also counts as set, so for example `HTTPS_PROXY=` alone makes Nextclade connect directly instead of through the system proxy.
  ///
  /// You can also provide the proxy in the environment variable `NEXTCLADE_PROXY`. The argument takes precedence over the environment variable if both are provided. An empty value counts as not set.
  #[clap(long, short = 'x')]
  #[clap(env = "NEXTCLADE_PROXY", hide_env_values = true)]
  #[clap(value_hint = ValueHint::Url)]
  #[clap(value_parser = secret_bytes_parser())]
  pub proxy: Option<SecretBytes>,

  /// Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and a password (`--proxy-pass` or `--proxy-pass-file`) must be either both specified or both omitted
  ///
  /// You can also provide the username in the environment variable `NEXTCLADE_PROXY_USER`. The argument takes precedence over the environment variable if both are provided. An empty value counts as not set.
  #[clap(long)]
  #[clap(env = "NEXTCLADE_PROXY_USER", hide_env_values = true)]
  #[clap(value_hint = ValueHint::Other)]
  #[clap(value_parser = secret_bytes_parser())]
  pub proxy_user: Option<SecretBytes>,

  /// Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and a password (`--proxy-pass` or `--proxy-pass-file`) must be either both specified or both omitted
  ///
  /// Other users of the machine can see command-line arguments. Prefer the environment variable `NEXTCLADE_PROXY_PASS` or `--proxy-pass-file`. The argument takes precedence over the environment variable if both are provided. An empty value counts as not set.
  #[clap(long)]
  #[clap(env = "NEXTCLADE_PROXY_PASS", hide_env_values = true)]
  #[clap(value_hint = ValueHint::Other)]
  #[clap(value_parser = secret_bytes_parser())]
  pub proxy_pass: Option<SecretBytes>,

  /// Path to a file that contains the password for basic authentication on proxy server. One trailing newline is removed.
  ///
  /// You can also provide the path in the environment variable `NEXTCLADE_PROXY_PASS_FILE`. The argument takes precedence over the environment variable if both are provided. An empty value counts as not set.
  ///
  /// Give the password either with `--proxy-pass` or with `--proxy-pass-file`. If one of them is a command-line argument and the other an environment variable, the command-line argument is used.
  #[clap(long)]
  #[clap(env = "NEXTCLADE_PROXY_PASS_FILE")]
  #[clap(value_hint = ValueHint::FilePath)]
  pub proxy_pass_file: Option<OsString>,

  /// Path to extra CA certificates as a PEM bundle.
  ///
  /// You can also provide the path to CA certificates in the environment variable `NEXTCLADE_EXTRA_CA_CERTS`. The argument takes precedence over the environment variable if both are provided.
  ///
  /// Default CA certificates are those obtained from the platform/OS-level trust store plus those from a baked-in copy of Mozilla's common CA trust store. You can override the certs obtained from the platform trust store by setting `SSL_CERT_FILE` or `SSL_CERT_DIR`. Filenames in the latter must be hashed in the style of OpenSSL's `c_rehash` utility.
  #[clap(long)]
  #[clap(env = "NEXTCLADE_EXTRA_CA_CERTS")]
  #[clap(value_hint = ValueHint::Other)]
  pub extra_ca_certs: Option<OsString>,

  /// Maximum time in seconds for each HTTP request, from connecting until the last byte of the response is received. 0 disables the limit.
  ///
  /// You can also provide the value in the environment variable `NEXTCLADE_HTTP_TIMEOUT`. The argument takes precedence over the environment variable if both are provided. An empty value counts as not set.
  #[clap(long, value_name = "SECONDS")]
  #[clap(env = "NEXTCLADE_HTTP_TIMEOUT")]
  #[clap(default_value_os_t = OsString::from(DEFAULT_HTTP_TIMEOUT_SECS.to_string()))]
  pub http_timeout: OsString,

  /// Where the value of `--proxy-pass` came from, recorded by `record_value_sources`
  #[clap(skip)]
  pub proxy_pass_source: Option<ValueSource>,

  /// Where the value of `--proxy-pass-file` came from, recorded by `record_value_sources`
  #[clap(skip)]
  pub proxy_pass_file_source: Option<ValueSource>,
}

impl Default for NetworkArgs {
  fn default() -> Self {
    Self {
      proxy: None,
      proxy_user: None,
      proxy_pass: None,
      proxy_pass_file: None,
      extra_ca_certs: None,
      http_timeout: OsString::from(DEFAULT_HTTP_TIMEOUT_SECS.to_string()),
      proxy_pass_source: None,
      proxy_pass_file_source: None,
    }
  }
}

/// Secret value of an option, as given on the command line or in the environment, which need not be valid UTF-8
pub type SecretBytes = SecretSlice<u8>;

/// Username and password for basic authentication on the proxy server
pub struct ProxyCredentials {
  pub user: SecretString,
  pub pass: SecretString,
}

impl NetworkArgs {
  /// Return the proxy of `--proxy` or `NEXTCLADE_PROXY`, as given. It may contain credentials
  pub fn explicit_proxy(&self) -> Result<Option<&str>, Report> {
    non_empty_secret(self.proxy.as_ref(), "`--proxy` or `NEXTCLADE_PROXY`")
  }

  /// Return the path of `--extra-ca-certs` or `NEXTCLADE_EXTRA_CA_CERTS`
  pub fn extra_ca_certs_path(&self) -> Option<PathBuf> {
    non_empty_path(self.extra_ca_certs.as_deref())
  }

  /// Return the deadline for each HTTP request, or `None` when the limit is disabled
  pub fn request_timeout(&self) -> Result<Option<Duration>, Report> {
    let value = non_empty_text(
      Some(self.http_timeout.as_encoded_bytes()),
      "`--http-timeout` or `NEXTCLADE_HTTP_TIMEOUT`",
    )?;
    let secs = match value {
      None => DEFAULT_HTTP_TIMEOUT_SECS,
      Some(value) => value.trim().parse::<u64>().wrap_err_with(|| {
        format!(
          "When parsing the value of `--http-timeout` or `NEXTCLADE_HTTP_TIMEOUT`: expected a whole number of seconds, but got '{value}'"
        )
      })?,
    };
    Ok((secs > 0).then(|| Duration::from_secs(secs)))
  }

  /// Return the proxy credentials, with the password from `--proxy-pass` or from the file in `--proxy-pass-file`.
  ///
  /// When both password options have a value, a command-line argument wins over an environment variable, and two
  /// values of the same kind are an error (see `record_value_sources`). The password file is read here, so call
  /// this only when a client is built.
  pub fn credentials(&self) -> Result<Option<ProxyCredentials>, Report> {
    let user = non_empty_secret(self.proxy_user.as_ref(), "`--proxy-user` or `NEXTCLADE_PROXY_USER`")?;
    let pass = non_empty_secret(self.proxy_pass.as_ref(), "`--proxy-pass` or `NEXTCLADE_PROXY_PASS`")?;
    let pass_file = non_empty_path(self.proxy_pass_file.as_deref());
    if pass.is_some()
      && pass_file.is_some()
      && (self.proxy_pass_source.is_none() || self.proxy_pass_file_source.is_none())
    {
      return make_internal_error!(
        "Both proxy password options have a value, but the sources of the values were not recorded after parsing"
      );
    }
    let (pass, pass_file) = match choose_password_source(
      pass.and(self.proxy_pass_source),
      pass_file.as_ref().and(self.proxy_pass_file_source),
    )? {
      PasswordSourceChoice::Keep => (pass, pass_file),
      PasswordSourceChoice::DropPass => (None, pass_file),
      PasswordSourceChoice::DropPassFile => (pass, None),
    };

    let Some(user) = user else {
      return if pass.is_some() || pass_file.is_some() {
        credentials_unpaired_error()
      } else {
        Ok(None)
      };
    };

    let pass = match (pass, pass_file) {
      (Some(pass), _) => SecretString::from(pass),
      (None, Some(filepath)) => read_password_file(&filepath)?,
      (None, None) => return credentials_unpaired_error(),
    };

    Ok(Some(ProxyCredentials {
      user: SecretString::from(user),
      pass,
    }))
  }

  /// Record where the values of the password options came from: command line or environment variable
  pub fn record_value_sources(&mut self, matches: &ArgMatches) {
    let leaf = leaf_matches(matches);
    self.proxy_pass_source = arg_source(leaf, "proxy_pass");
    self.proxy_pass_file_source = arg_source(leaf, "proxy_pass_file");
  }

  /// Return a warning if the proxy password is given on the command line
  pub fn proxy_pass_warning(&self) -> Option<&'static str> {
    let on_command_line = self.proxy_pass_source == Some(ValueSource::CommandLine);
    (on_command_line && has_secret(self.proxy_pass.as_ref())).then_some(
      "The proxy password is given with `--proxy-pass` on the command line, where other users of this machine can see it. Use the environment variable `NEXTCLADE_PROXY_PASS` or `--proxy-pass-file` instead.",
    )
  }
}

/// Which password option to drop when both `--proxy-pass` and `--proxy-pass-file` have a value
#[derive(Clone, Copy, Debug, PartialEq, Eq)]
pub enum PasswordSourceChoice {
  Keep,
  DropPass,
  DropPassFile,
}

/// Decide between `--proxy-pass` and `--proxy-pass-file` from the sources of their values (`None`: no value)
pub fn choose_password_source(
  pass: Option<ValueSource>,
  pass_file: Option<ValueSource>,
) -> Result<PasswordSourceChoice, Report> {
  let is_cli = |source: ValueSource| source == ValueSource::CommandLine;
  match (pass, pass_file) {
    (None, _) | (_, None) => Ok(PasswordSourceChoice::Keep),
    (Some(pass), Some(pass_file)) => match (is_cli(pass), is_cli(pass_file)) {
      (true, false) => Ok(PasswordSourceChoice::DropPassFile),
      (false, true) => Ok(PasswordSourceChoice::DropPass),
      (true, true) => {
        make_error!("`--proxy-pass` and `--proxy-pass-file` cannot be used together. Use only one of them")
      }
      (false, false) => make_error!(
        "The environment variables `NEXTCLADE_PROXY_PASS` and `NEXTCLADE_PROXY_PASS_FILE` cannot be used together. Set only one of them"
      ),
    },
  }
}

/// Accept a value of any encoding, so that parsing succeeds and the encoding is checked when the value is used
fn secret_bytes_parser() -> impl TypedValueParser<Value = SecretBytes> {
  OsStringValueParser::new().map(|value| SecretBytes::from(value.into_encoded_bytes()))
}

fn has_secret(value: Option<&SecretBytes>) -> bool {
  value.is_some_and(|value| !value.expose_secret().is_empty())
}

fn non_empty_secret<'a>(value: Option<&'a SecretBytes>, names: &str) -> Result<Option<&'a str>, Report> {
  non_empty_text(value.map(ExposeSecret::expose_secret), names)
}

/// Return a non-empty value as text, or an error naming the option and its variable (`names`) when the value is
/// not valid UTF-8. The value is not shown, because it can be a secret, and neither is the position of the error
fn non_empty_text<'a>(value: Option<&'a [u8]>, names: &str) -> Result<Option<&'a str>, Report> {
  value
    .filter(|value| !value.is_empty())
    .map(|value| {
      std::str::from_utf8(value).map_err(|_error_with_position| eyre!("The value of {names} is not valid UTF-8"))
    })
    .transpose()
}

fn non_empty_path(value: Option<&OsStr>) -> Option<PathBuf> {
  value.filter(|value| !value.is_empty()).map(PathBuf::from)
}

fn credentials_unpaired_error() -> Result<Option<ProxyCredentials>, Report> {
  make_error!(
    "`--proxy-user` / `NEXTCLADE_PROXY_USER` and a password (`--proxy-pass` / `NEXTCLADE_PROXY_PASS` or `--proxy-pass-file` / `NEXTCLADE_PROXY_PASS_FILE`) must be either both given or both omitted"
  )
}

fn read_password_file(filepath: &Path) -> Result<SecretString, Report> {
  let content = std::fs::read_to_string(filepath)
    .map(SecretString::from)
    .wrap_err_with(|| {
      format!(
        "When reading the proxy password file '{}' given with `--proxy-pass-file` or `NEXTCLADE_PROXY_PASS_FILE`",
        filepath.display()
      )
    })?;
  Ok(SecretString::from(strip_one_trailing_newline(content.expose_secret())))
}

/// Remove one trailing newline (`\n` or `\r\n`), which editors and `echo` append to a password file
pub fn strip_one_trailing_newline(text: &str) -> &str {
  text
    .strip_suffix("\r\n")
    .or_else(|| text.strip_suffix('\n'))
    .unwrap_or(text)
}

fn leaf_matches(matches: &ArgMatches) -> &ArgMatches {
  let mut leaf = matches;
  while let Some((_, sub)) = leaf.subcommand() {
    leaf = sub;
  }
  leaf
}

/// Return the source of the value of argument `id`, if the command has the argument
fn arg_source(matches: &ArgMatches, id: &str) -> Option<ValueSource> {
  matches.try_contains_id(id).ok()?;
  matches.value_source(id)
}
