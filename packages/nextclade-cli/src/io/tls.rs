//! TLS trust roots for HTTPS connections.
//!
//! # Trust roots per platform
//!
//! - **macOS and Windows**: the operating system's certificate verifier decides (through
//!   `rustls-platform-verifier`), including the trust settings and distrust decisions of the OS. Nextclade adds
//!   only the user extras. It never adds the built-in Mozilla roots, because the platform verifier trusts extra
//!   roots regardless of the OS trust settings: a root that the OS distrusts would be trusted again.
//! - **Linux and other non-Apple Unix**: Nextclade chooses the roots and verifies with rustls WebPKI:
//!   1. The system store, loaded with `rustls-native-certs`: the OS certificate bundle, or the files that
//!      `SSL_CERT_FILE` and `SSL_CERT_DIR` name instead of the OS locations (see [`system_store_overrides`]).
//!      System certificates that are not usable as trust anchors are skipped with a warning.
//!   2. When the system store has no usable certificates and no variable replaces the OS locations: the built-in
//!      Mozilla roots from `webpki-root-certs`, with an info log line. This is the case in minimal containers
//!      without a CA bundle, such as the official `scratch` Docker image.
//!   3. When the system store has no usable certificates and `SSL_CERT_FILE` or `SSL_CERT_DIR` replaces the OS
//!      locations: an error, because the user asked for a specific trust store and the built-in roots are a
//!      different one.
//!
//! **User extras** (`--extra-ca-certs <path>` or `NEXTCLADE_EXTRA_CA_CERTS`) are added on all platforms. They are
//! needed behind SSL-inspecting proxies (corporate firewalls that intercept HTTPS traffic), whose CA certificate
//! must be trusted. A user extra that cannot be read or cannot be used as a trust anchor is an error that names the
//! file.
//!
//! [`choose_trust_roots`] makes this choice as a pure function of the platform, the loaded system store with the
//! built-in roots, and the user extras. Only Linux and other non-Apple Unix load the system store and the built-in
//! roots, so `rustls-native-certs` and `webpki-root-certs` are dependencies of these targets only. `configure_tls`
//! in `http_client.rs` applies the result to the reqwest client: `tls_certs_only` for a fixed set of roots,
//! `tls_certs_merge` for user extras on top of the OS verifier.
//!
//! # Historical Context
//!
//! - [Issue #726](https://github.com/nextstrain/nextclade/issues/726): Users behind SSL-inspecting proxies couldn't download datasets
//! - [PR #798](https://github.com/nextstrain/nextclade/pull/798): Used default-features=false to avoid native-tls/OpenSSL for cross-compilation
//! - [PR #1529](https://github.com/nextstrain/nextclade/pull/1529), [PR #1536](https://github.com/nextstrain/nextclade/pull/1536): Added rustls-native-certs and webpki-roots support
//! - [PR #1723](https://github.com/nextstrain/nextclade/pull/1723): Added webpki-root-certs fallback for minimal Docker containers
//! - The built-in Mozilla roots were merged into the trust store on all platforms, so on macOS and Windows they
//!   overrode OS distrust decisions. They are now used only on Linux and other non-Apple Unix, and only when the
//!   system store has no usable certificates.

use eyre::{Report, WrapErr};
use itertools::Itertools;
use log::{debug, info, warn};
use nextclade::io::file::open_file_or_stdin;
use nextclade::make_error;
use reqwest::tls::Certificate;
use rustls::RootCertStore;
use rustls::pki_types::CertificateDer;
use rustls::pki_types::pem::PemObject;
use std::ffi::OsStr;
use std::path::Path;

/// Environment variable with a PEM file that `rustls-native-certs` reads instead of the OS certificate locations
pub const SSL_CERT_FILE: &str = "SSL_CERT_FILE";

/// Environment variable with a list of directories that `rustls-native-certs` reads instead of the OS certificate
/// locations
pub const SSL_CERT_DIR: &str = "SSL_CERT_DIR";

/// Certificate verification model of the platform
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TrustPlatform {
  /// Linux and other non-Apple Unix: Nextclade chooses the roots, starting from the system store
  SystemStore(SystemStore),
  /// macOS and Windows: the operating system's verifier decides
  OsVerifier,
}

impl TrustPlatform {
  /// Return the verification model of the running platform, with the loaded system store
  #[cfg(all(unix, not(target_vendor = "apple")))]
  pub fn current() -> Self {
    Self::SystemStore(SystemStore::load())
  }

  /// Return the verification model of the running platform
  #[cfg(not(all(unix, not(target_vendor = "apple"))))]
  pub const fn current() -> Self {
    Self::OsVerifier
  }
}

/// Result of loading the system store
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct SystemStore {
  /// Certificates found, not yet checked to be usable as trust anchors
  pub certs: Vec<CertificateDer<'static>>,
  /// Errors that occurred while loading
  pub load_errors: Vec<String>,
  /// Variables that replace the OS certificate locations, as decided by `system_store_overrides`
  pub overrides: Vec<&'static str>,
  /// Built-in Mozilla roots, used when the system store has no usable certificates
  pub built_in: Vec<CertificateDer<'static>>,
}

#[cfg(all(unix, not(target_vendor = "apple")))]
impl SystemStore {
  /// Load the system store with `rustls-native-certs`, along with the built-in roots from `webpki-root-certs`
  pub fn load() -> Self {
    let result = rustls_native_certs::load_native_certs();
    Self {
      certs: result.certs,
      load_errors: result.errors.iter().map(ToString::to_string).collect(),
      overrides: system_store_overrides(
        std::env::var_os(SSL_CERT_FILE).as_deref(),
        std::env::var_os(SSL_CERT_DIR).as_deref(),
      ),
      built_in: webpki_root_certs::TLS_SERVER_ROOT_CERTS.to_vec(),
    }
  }
}

/// Return the variables that make `rustls-native-certs` replace the OS certificate locations, given their values.
///
/// Follows `CertPaths::from_env` of `rustls-native-certs` 0.8.5: `SSL_CERT_FILE` replaces the OS locations whenever
/// it is set, even when empty. `SSL_CERT_DIR` replaces them only when its list has a non-empty entry, because the
/// crate skips empty entries: an empty value or a value of separators only (`:` on Unix) counts as not set.
pub fn system_store_overrides(cert_file: Option<&OsStr>, cert_dir: Option<&OsStr>) -> Vec<&'static str> {
  let file = cert_file.map(|_| SSL_CERT_FILE);
  let dir = cert_dir
    .filter(|dirs| std::env::split_paths(dirs).any(|dir| !dir.as_os_str().is_empty()))
    .map(|_| SSL_CERT_DIR);
  file.into_iter().chain(dir).collect()
}

/// Trust roots for HTTPS connections
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum TrustRoots {
  /// Trust exactly these roots: chosen roots followed by the user extras
  Only {
    roots: Vec<CertificateDer<'static>>,
    origin: RootOrigin,
  },
  /// The operating system's verifier decides, and also trusts these user extras
  OsVerifier { extras: Vec<CertificateDer<'static>> },
}

/// Source of the chosen roots of `TrustRoots::Only`, with diagnostics of the system store
#[derive(Clone, Debug, PartialEq, Eq)]
pub enum RootOrigin {
  /// Usable certificates of the system store
  SystemStore {
    usable: usize,
    skipped: usize,
    load_errors: Vec<String>,
  },
  /// Built-in Mozilla roots, because the system store has no usable certificates
  BuiltIn { skipped: usize, load_errors: Vec<String> },
}

impl RootOrigin {
  /// Log the system store diagnostics and the source of the roots
  pub fn log(&self) {
    let (skipped, load_errors) = match self {
      RootOrigin::SystemStore {
        skipped, load_errors, ..
      }
      | RootOrigin::BuiltIn { skipped, load_errors } => (skipped, load_errors),
    };
    for error in load_errors {
      warn!("Error loading CA certificates from the system certificate store: {error}");
    }
    if *skipped > 0 {
      warn!(
        "Skipped certificates of the system certificate store: {}",
        unusable_certificates(*skipped)
      );
    }
    match self {
      RootOrigin::SystemStore { usable, .. } => {
        debug!("Using {usable} CA certificates from the system certificate store");
      }
      RootOrigin::BuiltIn { .. } => {
        info!(
          "The system certificate store has no CA certificates. Using the built-in Mozilla CA certificates instead."
        );
      }
    }
  }
}

/// Choose the trust roots for the platform and the user extras.
///
/// On `TrustPlatform::SystemStore`, the usable system certificates are used if there are any, otherwise the
/// built-in Mozilla roots that the store carries, unless an override variable is set: then the result is an error
/// that names the variables and the load errors.
pub fn choose_trust_roots(platform: TrustPlatform, extras: Vec<CertificateDer<'static>>) -> Result<TrustRoots, Report> {
  match platform {
    TrustPlatform::OsVerifier => Ok(TrustRoots::OsVerifier { extras }),
    TrustPlatform::SystemStore(store) => choose_system_store_roots(store, extras),
  }
}

fn choose_system_store_roots(store: SystemStore, extras: Vec<CertificateDer<'static>>) -> Result<TrustRoots, Report> {
  let SystemStore {
    certs,
    load_errors,
    overrides,
    built_in,
  } = store;

  let (usable, skipped) = split_trust_anchors(certs);

  if !usable.is_empty() {
    let origin = RootOrigin::SystemStore {
      usable: usable.len(),
      skipped,
      load_errors,
    };
    let roots = usable.into_iter().chain(extras).collect_vec();
    return Ok(TrustRoots::Only { roots, origin });
  }

  if !overrides.is_empty() {
    let names = overrides.join(" and ");
    let subject = if overrides.len() == 1 {
      format!("The environment variable {names} replaces")
    } else {
      format!("The environment variables {names} replace")
    };
    let skipped = (skipped > 0).then(|| unusable_certificates(skipped));
    let details = skipped.into_iter().chain(load_errors).join("; ");
    let details = if details.is_empty() {
      String::new()
    } else {
      format!(" ({details})")
    };
    return make_error!(
      "{subject} the system certificate store, but no usable CA certificates were found{details}. Make {names} point to CA certificates in PEM format, or unset {names} to use the system certificate store."
    );
  }

  let roots = built_in.into_iter().chain(extras).collect_vec();
  let origin = RootOrigin::BuiltIn { skipped, load_errors };
  Ok(TrustRoots::Only { roots, origin })
}

/// Split certificates into those usable as trust anchors and the number of the others.
///
/// Uses the same check as rustls and reqwest when they add roots, so every returned certificate is accepted by
/// `ClientBuilder::tls_certs_only`.
fn split_trust_anchors(certs: Vec<CertificateDer<'static>>) -> (Vec<CertificateDer<'static>>, usize) {
  let mut store = RootCertStore::empty();
  let (usable, skipped): (Vec<_>, Vec<_>) = certs.into_iter().partition(|cert| store.add(cert.clone()).is_ok());
  (usable, skipped.len())
}

fn unusable_certificates(count: usize) -> String {
  if count == 1 {
    "1 certificate cannot be used as a trust anchor".to_owned()
  } else {
    format!("{count} certificates cannot be used as trust anchors")
  }
}

/// Load extra CA certificates from a PEM bundle file.
///
/// Returns no certificates when `filepath` is `None`. The file may contain several concatenated certificates:
///
/// ```text
/// -----BEGIN CERTIFICATE-----
/// MIIDxTCCAq2gAwIBAgIQAqxcJmoLQ...
/// -----END CERTIFICATE-----
/// -----BEGIN CERTIFICATE-----
/// MIIDrzCCApegAwIBAgIQCDvgVpB...
/// -----END CERTIFICATE-----
/// ```
///
/// # Errors
///
/// Returns an error that names the file if the file cannot be read, is not valid PEM, contains no certificates,
/// or contains a certificate that cannot be used as a trust anchor.
pub fn extra_ca_certs(filepath: Option<impl AsRef<Path>>) -> Result<Vec<CertificateDer<'static>>, Report> {
  let Some(filepath) = filepath else {
    return Ok(vec![]);
  };
  let filepath = filepath.as_ref();
  let read = || {
    let mut pem_bundle = vec![];
    open_file_or_stdin(Some(&filepath))?.read_to_end(&mut pem_bundle)?;
    parse_ca_certs_pem(&pem_bundle)
  };
  read().wrap_err_with(|| {
    format!(
      "When reading extra CA certificates from '{}' given with `--extra-ca-certs` or `NEXTCLADE_EXTRA_CA_CERTS`",
      filepath.display()
    )
  })
}

/// Parse a PEM bundle of CA certificates, requiring at least one certificate, each usable as a trust anchor
pub fn parse_ca_certs_pem(pem_bundle: &[u8]) -> Result<Vec<CertificateDer<'static>>, Report> {
  let certs = CertificateDer::pem_slice_iter(pem_bundle)
    .collect::<Result<Vec<_>, _>>()
    .wrap_err("While parsing PEM certificate bundle")?;

  if certs.is_empty() {
    return make_error!(
      "No certificates found. Expected PEM certificates, each starting with '-----BEGIN CERTIFICATE-----'."
    );
  }

  let mut store = RootCertStore::empty();
  for (index, cert) in certs.iter().enumerate() {
    store.add(cert.clone()).wrap_err_with(|| {
      format!(
        "Certificate {} of {} cannot be used as a trust anchor",
        index + 1,
        certs.len()
      )
    })?;
  }

  Ok(certs)
}

/// Convert certificates to reqwest certificates
pub fn to_reqwest_certs(certs: &[CertificateDer<'static>]) -> Result<Vec<Certificate>, Report> {
  certs
    .iter()
    .map(|cert| Certificate::from_der(cert.as_ref()).wrap_err("While converting a CA certificate"))
    .collect()
}
