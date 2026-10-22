use crate::io::network_args::NetworkArgs;
use crate::io::proxy::{ProxyEnv, configure_proxy};
use crate::io::tls::{self, TrustRoots};
use eyre::Report;
use log::info;
use nextclade::utils::info::{this_package_name, this_package_version_str};
use reqwest::blocking::Client;
use reqwest::{Method, StatusCode, retry};
use std::time::Duration;
use url::Url;

pub struct HttpClient {
  client: Client,
  root: Url,
  timeout: Option<Duration>,
}

impl HttpClient {
  pub fn new(root: &Url, network: &NetworkArgs, verbose: bool) -> Result<Self, Report> {
    Self::with_proxy_env(root, network, &ProxyEnv::from_process_env(), verbose)
  }

  /// Create a client that takes the standard proxy variables from `proxy_env` instead of the process environment
  pub fn with_proxy_env(
    root: &Url,
    network: &NetworkArgs,
    proxy_env: &ProxyEnv,
    verbose: bool,
  ) -> Result<Self, Report> {
    let timeout = network.request_timeout()?;
    let root = directory_url(root);

    let mut client_builder = Client::builder();

    client_builder = configure_proxy(client_builder, network, proxy_env)?;
    client_builder = configure_tls(client_builder, network)?;
    client_builder = configure_retry(client_builder, &root);

    let user_agent = format!("{} {}", this_package_name(), this_package_version_str());

    // The deadline is set per request: the client-wide timeout of the blocking client applies separately to
    // the response headers and to the body, so it would allow up to twice the limit
    let client = client_builder
      .connection_verbose(verbose)
      .timeout(None)
      .connect_timeout(Some(Duration::from_mins(1)))
      .user_agent(user_agent)
      .build()?;

    Ok(Self { client, root, timeout })
  }

  /// Replace the request deadline, for tests that need a deadline shorter than one second
  #[cfg(test)]
  pub(crate) const fn with_timeout(mut self, timeout: Option<Duration>) -> Self {
    self.timeout = timeout;
    self
  }

  pub fn get<U: AsRef<str> + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::GET, url)
  }

  pub fn post<U: AsRef<str> + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::POST, url)
  }

  pub fn put<U: AsRef<str> + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::PUT, url)
  }

  pub fn patch<U: AsRef<str> + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::PATCH, url)
  }

  pub fn delete<U: AsRef<str> + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::DELETE, url)
  }

  pub fn head<U: AsRef<str> + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::HEAD, url)
  }

  pub fn request<U: AsRef<str> + ?Sized>(&self, method: Method, url: &U) -> Result<Vec<u8>, Report> {
    let url = url.as_ref().trim_start_matches('/');
    let abs_url = self.root.join(url)?;
    info!("HTTP '{method}' request to '{abs_url}'");

    let mut request = self.client.request(method, abs_url);
    if let Some(timeout) = self.timeout {
      request = request.timeout(timeout);
    }

    let content = request
      .send()
      .and_then(reqwest::blocking::Response::error_for_status)
      .and_then(reqwest::blocking::Response::bytes)
      .map_err(|error| self.request_error(error))?
      .to_vec();
    Ok(content)
  }

  fn request_error(&self, error: reqwest::Error) -> Report {
    match self.timeout {
      // Connect timeouts have their own fixed limit, which `--http-timeout` does not change
      Some(timeout) if error.is_timeout() && !error.is_connect() => Report::new(error).wrap_err(format!(
        "The HTTP request did not complete within the time limit of {} seconds. To allow more time, use `--http-timeout <SECONDS>` or the environment variable `NEXTCLADE_HTTP_TIMEOUT` (0 disables the limit).",
        timeout.as_secs_f64()
      )),
      _ => Report::new(error),
    }
  }
}

/// Return the URL with a trailing `/` in its path, so that relative URLs join below its last path segment
fn directory_url(url: &Url) -> Url {
  let mut url = url.clone();
  if !url.path().ends_with('/') {
    url.set_path(&format!("{}/", url.path()));
  }
  url
}

/// Configure the trust roots for HTTPS connections, as chosen by `tls::choose_trust_roots`.
///
/// On macOS and Windows the operating system's verifier decides, with the user extras added (`tls_certs_merge`).
/// On Linux and other non-Apple Unix the client trusts exactly the chosen roots (`tls_certs_only`): the system
/// store, or the built-in Mozilla roots when the system store has no usable certificates, followed by the user
/// extras.
fn configure_tls(
  client_builder: reqwest::blocking::ClientBuilder,
  network: &NetworkArgs,
) -> Result<reqwest::blocking::ClientBuilder, Report> {
  let extras = tls::extra_ca_certs(network.extra_ca_certs_path())?;
  let roots = tls::choose_trust_roots(tls::TrustPlatform::current(), extras)?;

  match roots {
    TrustRoots::Only { roots, origin } => {
      origin.log();
      Ok(client_builder.tls_certs_only(tls::to_reqwest_certs(&roots)?))
    }
    TrustRoots::OsVerifier { extras } if extras.is_empty() => Ok(client_builder),
    TrustRoots::OsVerifier { extras } => Ok(client_builder.tls_certs_merge(tls::to_reqwest_certs(&extras)?)),
  }
}

/// Configures automatic retry policy for transient failures.
///
/// # Retry Scope
///
/// Retries are scoped to the root URL's host only. If the server returns a redirect
/// to a different host (e.g., CDN), retries will NOT apply to that redirected request.
///
/// # Retryable Conditions
///
/// - Network errors (no response received) - includes timeouts, connection resets,
///   DNS failures, and TLS handshake errors. Note: retrying DNS/TLS errors is usually
///   futile but harmless given the low retry count.
/// - 5xx server errors (502, 503, 504, etc.)
/// - 429 Too Many Requests (rate limiting)
/// - 408 Request Timeout
///
/// # Non-Retryable
///
/// - 4xx client errors (except 408, 429)
/// - Successful responses
/// - Redirects (handled separately by reqwest)
///
/// # Budget
///
/// A 20% extra load budget prevents retry storms - if too many requests to the host
/// are failing, retries are throttled to avoid overwhelming the server.
fn configure_retry(client_builder: reqwest::blocking::ClientBuilder, root: &Url) -> reqwest::blocking::ClientBuilder {
  let Some(host) = root.host_str().map(ToOwned::to_owned) else {
    return client_builder;
  };

  client_builder.retry(
    retry::for_host(host)
      .max_retries_per_request(3)
      .max_extra_load(0.2)
      .classify_fn(|attempt| match attempt.status() {
        // Network error (no response) - retry for transient failures
        None => attempt.retryable(),
        Some(status) if status.is_server_error() => attempt.retryable(),
        Some(status) if status == StatusCode::TOO_MANY_REQUESTS => attempt.retryable(),
        Some(status) if status == StatusCode::REQUEST_TIMEOUT => attempt.retryable(),
        _ => attempt.success(),
      }),
  )
}
