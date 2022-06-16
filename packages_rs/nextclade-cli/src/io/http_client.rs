use clap::{Parser, ValueHint};
use eyre::Report;
use log::info;
use reqwest::blocking::Client;
use reqwest::{IntoUrl, Method, Proxy};
use url::Url;
use nextclade::{getenv, make_internal_error};

#[derive(Parser, Debug)]
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
  pub fn new(root: Url, proxy_conf: ProxyConfig, verbose: bool) -> Result<Self, Report> {
    let mut client_builder = Client::builder();

    client_builder = if let Some(proxy_url) = proxy_conf.proxy {
      let proxy = match (proxy_conf.proxy_user, proxy_conf.proxy_pass) {
        (Some(proxy_user), Some(proxy_pass)) => {
          let proxy = Proxy::all(proxy_url)?.basic_auth(&proxy_user, &proxy_pass);
          Ok(proxy)
        }
        (None, None) => {
          let proxy = Proxy::all(proxy_url)?;
          Ok(proxy)
        }
        _ => make_internal_error!("`--proxy-user` and `--proxy-pass` must be either both specified or both omitted"),
      }?;

      client_builder.proxy(proxy)
    } else {
      client_builder
    };

    let user_agent = format!("{} {}", getenv!("CARGO_PKG_NAME"), getenv!("CARGO_PKG_VERSION"));

    let client = client_builder
      .connection_verbose(verbose)
      .connect_timeout(Some(std::time::Duration::from_secs(60)))
      .user_agent(user_agent)
      .build()?;

    Ok(Self { client, root })
  }

  pub fn get<U: IntoUrl + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::GET, url)
  }

  pub fn post<U: IntoUrl + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::POST, url)
  }

  pub fn put<U: IntoUrl + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::PUT, url)
  }

  pub fn patch<U: IntoUrl + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::PATCH, url)
  }

  pub fn delete<U: IntoUrl + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::DELETE, url)
  }

  pub fn head<U: IntoUrl + ?Sized>(&self, url: &U) -> Result<Vec<u8>, Report> {
    self.request(Method::HEAD, url)
  }

  pub fn request<U: IntoUrl + ?Sized>(&self, method: Method, url: &U) -> Result<Vec<u8>, Report> {
    let abs_url = self.root.join(url.as_str())?;
    info!("HTTP '{method}' request to '{abs_url}'");
    let content = self.client.request(method, abs_url).send()?.bytes()?.to_vec();
    Ok(content)
  }
}
