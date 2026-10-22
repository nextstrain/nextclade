//! Proxy source selection for the HTTP client.
//!
//! Sources, highest precedence first:
//!
//! 1. `--proxy` / `NEXTCLADE_PROXY`: one proxy for all requests. Hosts listed in `NO_PROXY` are reached directly.
//! 2. The standard proxy environment variables `HTTPS_PROXY`, `HTTP_PROXY`, `ALL_PROXY` (upper or lower case),
//!    used alone whenever any of them is set, together with `NO_PROXY`. A variable set to an empty value counts
//!    as set but adds no proxy, so `HTTPS_PROXY=` alone makes all requests go directly.
//! 3. reqwest's automatic proxy, which reads the macOS and Windows system proxy settings.
//!
//! Source 2 is configured explicitly instead of through reqwest's automatic proxy, because the automatic proxy
//! fills a missing protocol-specific proxy from the system settings before it considers `ALL_PROXY`. With
//! `ALL_PROXY` set and an HTTPS proxy in the macOS settings, HTTPS requests would go through the system proxy.

use crate::io::network_args::NetworkArgs;
use eyre::{Report, eyre};
use log::warn;
use nextclade::make_error;
use reqwest::blocking::ClientBuilder;
use reqwest::{NoProxy, Proxy};
use secrecy::ExposeSecret;
use std::ffi::OsString;

const ALL_PROXY: [&str; 2] = ["ALL_PROXY", "all_proxy"];
const HTTP_PROXY: [&str; 2] = ["HTTP_PROXY", "http_proxy"];
const HTTPS_PROXY: [&str; 2] = ["HTTPS_PROXY", "https_proxy"];
const NO_PROXY: [&str; 2] = ["NO_PROXY", "no_proxy"];

/// Standard proxy environment variables, read once from the process environment.
///
/// `None`: the variable is not set. `Some("")`: the variable is set to an empty value. `Debug` exists only in
/// tests, because the proxy URLs can contain passwords.
#[derive(Clone, Default, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub struct ProxyEnv {
  pub all: Option<String>,
  pub http: Option<String>,
  pub https: Option<String>,
  pub no_proxy: Option<String>,

  /// `REQUEST_METHOD` is set: the process runs as a CGI program, where `HTTP_PROXY` can be set by a client
  /// through the `Proxy` request header ("httpoxy"), so it is ignored
  pub is_cgi: bool,

  /// Names of the variables whose value is not valid UTF-8. They count as set, and building a client fails when
  /// the chosen proxy source reads one of them
  pub non_utf8: Vec<&'static str>,
}

impl ProxyEnv {
  pub fn from_process_env() -> Self {
    // A closure, because `var_os` is generic over the key type and does not accept every `&str` lifetime
    Self::from_lookup(|name| std::env::var_os(name))
  }

  /// Read the variables through `lookup`. For each variable, the first non-empty value of the upper-case and
  /// the lower-case name is used, or an empty value when the names are set only to empty values.
  pub fn from_lookup(lookup: impl Fn(&str) -> Option<OsString>) -> Self {
    let mut non_utf8 = vec![];
    let mut first_non_empty = |names: [&'static str; 2]| {
      let values = names
        .into_iter()
        .filter_map(|name| lookup(name).map(|value| (name, value)))
        .collect::<Vec<_>>();
      let present = !values.is_empty();
      let value = values.into_iter().find(|(_, value)| !value.is_empty());
      match value {
        Some((name, value)) => Some(value.into_string().unwrap_or_else(|_| {
          non_utf8.push(name);
          String::new()
        })),
        None => present.then(String::new),
      }
    };

    let all = first_non_empty(ALL_PROXY);
    let http = first_non_empty(HTTP_PROXY);
    let https = first_non_empty(HTTPS_PROXY);
    let no_proxy = first_non_empty(NO_PROXY);
    Self {
      all,
      http,
      https,
      no_proxy,
      is_cgi: lookup("REQUEST_METHOD").is_some(),
      non_utf8,
    }
  }

  /// Return the first variable that `source` reads and whose value is not valid UTF-8
  pub fn non_utf8_variable_read_by(&self, source: &ProxySource<'_>) -> Option<&'static str> {
    let read: &[[&str; 2]] = match source {
      // The system source also reads the standard variables, but it is chosen only when the proxy variables are
      // not set, or when only `HTTP_PROXY` is set in a CGI program, which ignores it. So only `NO_PROXY` matters
      ProxySource::Explicit { .. } | ProxySource::System => &[NO_PROXY],
      ProxySource::Environment { .. } if self.is_cgi => &[HTTPS_PROXY, ALL_PROXY, NO_PROXY],
      ProxySource::Environment { .. } => &[HTTPS_PROXY, HTTP_PROXY, ALL_PROXY, NO_PROXY],
    };
    self
      .non_utf8
      .iter()
      .copied()
      .find(|name| read.iter().any(|names| names.contains(name)))
  }
}

/// Where the HTTP client takes its proxies from. `Debug` exists only in tests, because the proxy URLs can contain
/// passwords.
#[derive(Clone, PartialEq, Eq)]
#[cfg_attr(test, derive(Debug))]
pub enum ProxySource<'a> {
  /// `--proxy` or `NEXTCLADE_PROXY`, as given: with or without a scheme, possibly with credentials
  Explicit { url: &'a str, no_proxy: Option<&'a str> },

  /// Standard proxy environment variables
  Environment {
    https: Option<&'a str>,
    http: Option<&'a str>,
    all: Option<&'a str>,
    no_proxy: Option<&'a str>,
  },

  /// reqwest's automatic proxy, including the macOS and Windows system settings
  System,
}

pub fn select_proxy_source<'a>(proxy: Option<&'a str>, env: &'a ProxyEnv) -> ProxySource<'a> {
  let no_proxy = env.no_proxy.as_deref();

  if let Some(url) = proxy {
    return ProxySource::Explicit { url, no_proxy };
  }

  let https = env.https.as_deref();
  let http = if env.is_cgi { None } else { env.http.as_deref() };
  let all = env.all.as_deref();

  // A variable that is set, also to an empty value, turns off the system proxy
  if https.is_none() && http.is_none() && all.is_none() {
    return ProxySource::System;
  }

  let non_empty = |value: Option<&'a str>| value.filter(|value| !value.is_empty());
  ProxySource::Environment {
    https: non_empty(https),
    http: non_empty(http),
    all: non_empty(all),
    no_proxy,
  }
}

pub fn configure_proxy(
  client_builder: ClientBuilder,
  network: &NetworkArgs,
  proxy_env: &ProxyEnv,
) -> Result<ClientBuilder, Report> {
  // Checked before the proxy source is chosen, so that a mistake in the credentials is an error whatever the
  // proxy variables of the machine are
  let credentials = network.credentials()?;

  let source = select_proxy_source(network.explicit_proxy()?, proxy_env);
  if let Some(name) = proxy_env.non_utf8_variable_read_by(&source) {
    return make_error!("The value of the environment variable `{name}` is not valid UTF-8");
  }
  if let Some(warning) = ignored_credentials_warning(&source, credentials.is_some()) {
    warn!("{warning}");
  }

  match source {
    ProxySource::Explicit { url, no_proxy } => {
      // reqwest adds `http://` to a value without a scheme, as for the standard proxy variables
      let proxy =
        Proxy::all(url).map_err(|_error_with_url| invalid_proxy_url_error("`--proxy` or `NEXTCLADE_PROXY`"))?;
      let mut proxy = proxy.no_proxy(no_proxy.and_then(NoProxy::from_string));
      if let Some(credentials) = credentials {
        proxy = proxy.basic_auth(credentials.user.expose_secret(), credentials.pass.expose_secret());
      }
      Ok(client_builder.proxy(proxy))
    }
    ProxySource::Environment {
      https,
      http,
      all,
      no_proxy,
    } => {
      // The client uses the first proxy that matches the request URL, so protocol-specific proxies go first
      let candidates = [
        ("HTTPS_PROXY", https.map(Proxy::https)),
        ("HTTP_PROXY", http.map(Proxy::http)),
        ("ALL_PROXY", all.map(Proxy::all)),
      ];

      // Turns off the automatic proxy, so that system settings cannot take precedence over the variables
      let mut client_builder = client_builder.no_proxy();
      for (name, proxy) in candidates {
        let Some(proxy) = proxy else { continue };
        let proxy = proxy.map_err(|_error_with_url| {
          invalid_proxy_url_error(&format!(
            "the environment variable `{name}` or `{}`",
            name.to_lowercase()
          ))
        })?;
        client_builder = client_builder.proxy(proxy.no_proxy(no_proxy.and_then(NoProxy::from_string)));
      }
      Ok(client_builder)
    }
    ProxySource::System => Ok(client_builder),
  }
}

/// Error for a proxy URL that cannot be parsed. The cause from reqwest is dropped, because it contains the URL,
/// and the URL can contain a password
fn invalid_proxy_url_error(source_names: &str) -> Report {
  eyre!(
    "Invalid proxy URL in {source_names}. The value is not shown, because it can contain a password. Expected a URL such as `http://proxy.example.com:3128`"
  )
}

/// Return a warning when valid proxy credentials are given but the proxy does not come from `--proxy`, so that
/// they are not used
pub fn ignored_credentials_warning(source: &ProxySource<'_>, has_credentials: bool) -> Option<&'static str> {
  let is_explicit = matches!(source, ProxySource::Explicit { .. });
  (has_credentials && !is_explicit).then_some(
    "Proxy credentials from `--proxy-user`, `--proxy-pass`, `--proxy-pass-file`, or their `NEXTCLADE_*` environment variables apply only to a proxy given with `--proxy` or `NEXTCLADE_PROXY`, so they are not used. For a proxy from `HTTPS_PROXY`, `HTTP_PROXY`, or `ALL_PROXY`, put the credentials into the proxy URL, for example `http://user:password@proxy.example.com:3128`.",
  )
}
