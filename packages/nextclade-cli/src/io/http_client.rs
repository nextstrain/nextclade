use clap::{Parser, ValueHint};
use eyre::Report;
use log::info;
use nextclade::make_internal_error;
use nextclade::utils::info::{this_package_name, this_package_version_str};
use reqwest::blocking::Client;
use reqwest::{Method, Proxy};
use rustls_platform_verifier;
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
}

pub struct HttpClient {
  pub client: Client,
  pub root: Url,
}

impl HttpClient {
  pub fn new(root: &Url, proxy_conf: &ProxyConfig, verbose: bool) -> Result<Self, Report> {
    // Append trailing slash to the root URL. Otherwise `Url::join()` replaces the path rather than appending.
    // See: https://github.com/servo/rust-url/issues/333
    let root = Url::from_str(&format!("{}/", root.as_str()))?;

    let mut client_builder = Client::builder();

    client_builder = if let Some(proxy_url) = &proxy_conf.proxy {
      let proxy = match (&proxy_conf.proxy_user, &proxy_conf.proxy_pass) {
        (Some(proxy_user), Some(proxy_pass)) => {
          let proxy = Proxy::all(proxy_url.clone())?.basic_auth(proxy_user, proxy_pass);
          Ok(proxy)
        }
        (None, None) => {
          let proxy = Proxy::all(proxy_url.clone())?;
          Ok(proxy)
        }
        _ => make_internal_error!("`--proxy-user` and `--proxy-pass` must be either both specified or both omitted"),
      }?;

      client_builder.proxy(proxy)
    } else {
      client_builder
    };

    let user_agent = format!("{} {}", this_package_name(), this_package_version_str());

    let client = client_builder
      .use_preconfigured_tls(rustls_platform_verifier::tls_config())
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
    // Trim leading '/', otherwise Url::join() replaces the path rather than appending.
    // See: https://github.com/servo/rust-url/issues/333
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
