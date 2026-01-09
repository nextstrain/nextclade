use crate::io::tls;
use clap::{Parser, ValueHint};
use eyre::Report;
use log::info;
use nextclade::make_internal_error;
use nextclade::utils::info::{this_package_name, this_package_version_str};
use reqwest::blocking::Client;
use reqwest::{Method, Proxy, StatusCode, retry};
use std::env;
use std::path::PathBuf;
use std::str::FromStr;
use std::time::Duration;
use url::Url;

#[derive(Parser, Debug, Default)]
#[clap(verbatim_doc_comment)]
pub struct ProxyConfig {
  /// Pass all traffic over proxy server. HTTP, HTTPS, and SOCKS5 proxies are supported.
  #[clap(long, short = 'x')]
  #[clap(value_hint = ValueHint::Url)]
  pub proxy: Option<Url>,

  /// Username for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
  #[clap(long)]
  #[clap(value_hint = ValueHint::Other)]
  pub proxy_user: Option<String>,

  /// Password for basic authentication on proxy server, if applicable. Only valid when `--proxy` is also supplied. `--proxy-user` and `--proxy-pass` must be either both specified or both omitted
  #[clap(long)]
  #[clap(value_hint = ValueHint::Other)]
  pub proxy_pass: Option<String>,

  /// Path to extra CA certificates as a PEM bundle.
  ///
  /// You can also provide the path to CA certificates in the environment variable `NEXTCLADE_EXTRA_CA_CERTS`. The argument takes precedence over the environment variable if both are provided.
  ///
  /// Default CA certificates are those obtained from the platform/OS-level trust store plus those from a baked-in copy of Mozilla's common CA trust store. You can override the certs obtained from the platform trust store by setting `SSL_CERT_FILE` or `SSL_CERT_DIR`. Filenames in the latter must be hashed in the style of OpenSSL's `c_rehash` utility.
  #[clap(long)]
  #[clap(value_hint = ValueHint::Other)]
  pub extra_ca_certs: Option<PathBuf>,
}

pub struct HttpClient {
  pub client: Client,
  pub root: Url,
}

impl HttpClient {
  pub fn new(root: &Url, proxy_conf: &ProxyConfig, verbose: bool) -> Result<Self, Report> {
    let root = Url::from_str(&format!("{}/", root.as_str()))?;

    let mut client_builder = Client::builder();

    client_builder = configure_proxy(client_builder, proxy_conf)?;
    client_builder = configure_tls(client_builder, proxy_conf)?;
    client_builder = configure_retry(client_builder, &root);

    let user_agent = format!("{} {}", this_package_name(), this_package_version_str());

    let client = client_builder
      .connection_verbose(verbose)
      .connect_timeout(Some(Duration::from_secs(60)))
      .user_agent(user_agent)
      .build()?;

    Ok(Self { client, root })
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
    let content = self
      .client
      .request(method, abs_url)
      .send()?
      .error_for_status()?
      .bytes()?
      .to_vec();
    Ok(content)
  }
}

fn configure_proxy(
  client_builder: reqwest::blocking::ClientBuilder,
  proxy_conf: &ProxyConfig,
) -> Result<reqwest::blocking::ClientBuilder, Report> {
  let Some(proxy_url) = &proxy_conf.proxy else {
    return Ok(client_builder);
  };

  let proxy = match (&proxy_conf.proxy_user, &proxy_conf.proxy_pass) {
    (Some(user), Some(pass)) => Ok(Proxy::all(proxy_url.clone())?.basic_auth(user, pass)),
    (None, None) => Ok(Proxy::all(proxy_url.clone())?),
    _ => make_internal_error!("`--proxy-user` and `--proxy-pass` must be either both specified or both omitted"),
  }?;

  Ok(client_builder.proxy(proxy))
}

/// Configures TLS certificate verification for HTTPS connections.
///
/// # Trust Store Composition
///
/// The final trust store combines three certificate sources:
///
/// 1. **Mozilla Root CAs** (always present)
///    - Baked-in from `webpki-root-certs` crate
///    - Ensures HTTPS works even in minimal containers without system certs
///
/// 2. **User Extra CAs** (optional)
///    - From `--extra-ca-certs` argument or `NEXTCLADE_EXTRA_CA_CERTS` env var
///    - Required for enterprise SSL-inspecting proxies (corporate firewalls)
///
/// 3. **System CAs** (when available)
///    - Loaded by `rustls-platform-verifier` via `rustls-native-certs`
///    - Respects `SSL_CERT_FILE` and `SSL_CERT_DIR` environment variables
///
/// # How It Works
///
/// ```text
/// tls_certs_merge([mozilla_roots, user_extras])
///        |
///        v
/// reqwest passes to rustls-platform-verifier as "extra_roots"
///        |
///        v
/// Platform verifier adds extra_roots to RootCertStore
///        |
///        v
/// Platform verifier loads system certs via rustls-native-certs
///        |
///        v
/// Both are combined in the final trust store
/// ```
///
/// This design ensures the trust store is never empty (Mozilla roots always present),
/// while still loading and trusting system certificates when available.
fn configure_tls(
  client_builder: reqwest::blocking::ClientBuilder,
  proxy_conf: &ProxyConfig,
) -> Result<reqwest::blocking::ClientBuilder, Report> {
  // Resolve extra CA certs path: CLI arg takes precedence over env var
  let extra_certs_path = env::var_os("NEXTCLADE_EXTRA_CA_CERTS").map(PathBuf::from);
  let extra_certs_path = proxy_conf.extra_ca_certs.as_ref().or(extra_certs_path.as_ref());

  // Build combined trust anchors: Mozilla roots + user extras
  // System certs are added later by rustls-platform-verifier
  let trust_anchors = tls::build_trust_anchors(extra_certs_path)?;

  // tls_certs_merge() passes these to rustls-platform-verifier::Verifier::new_with_extra_roots()
  // The verifier then:
  // 1. Adds our trust_anchors to RootCertStore
  // 2. Loads system certs via rustls_native_certs::load_native_certs()
  // 3. Adds system certs to the same store
  // Result: all three sources (mozilla, user, system) are trusted
  Ok(client_builder.tls_certs_merge(trust_anchors))
}

fn configure_retry(
  client_builder: reqwest::blocking::ClientBuilder,
  root: &Url,
) -> reqwest::blocking::ClientBuilder {
  let Some(host) = root.host_str().map(ToOwned::to_owned) else {
    return client_builder;
  };

  client_builder.retry(
    retry::for_host(host)
      .max_retries_per_request(3)
      .max_extra_load(0.2)
      .classify_fn(|attempt| match attempt.status() {
        None => attempt.retryable(),
        Some(status) if status.is_server_error() => attempt.retryable(),
        Some(status) if status == StatusCode::TOO_MANY_REQUESTS => attempt.retryable(),
        Some(status) if status == StatusCode::REQUEST_TIMEOUT => attempt.retryable(),
        _ => attempt.success(),
      }),
  )
}
