//! TLS certificate configuration for HTTPS connections.
//!
//! # Certificate Trust Hierarchy
//!
//! The HTTP client uses a layered certificate trust model with three sources,
//! combined into a single trust store:
//!
//! ```text
//! +--------------------------------------------------+
//! |              Final Trust Store                   |
//! |  (used by rustls-platform-verifier)              |
//! +--------------------------------------------------+
//!          ^              ^              ^
//!          |              |              |
//!    +-----------+  +-----------+  +-----------+
//!    |  Mozilla  |  |   User    |  |  System   |
//!    |   Roots   |  |   Extra   |  |   Certs   |
//!    | (baked-in)|  |  (file)   |  |  (OS/env) |
//!    +-----------+  +-----------+  +-----------+
//! ```
//!
//! ## 1. Mozilla Root Certificates (always present)
//!
//! Baked-in copy of Mozilla's trusted CA certificates from the `webpki-root-certs`
//! crate. These provide a reliable fallback when system certificates are unavailable,
//! such as in minimal Docker containers that don't have `ca-certificates` installed.
//!
//! ## 2. User Extra Certificates (optional)
//!
//! Custom CA certificates provided via:
//! - `--extra-ca-certs <path>` CLI argument
//! - `NEXTCLADE_EXTRA_CA_CERTS` environment variable
//!
//! This is essential for enterprise environments with SSL-inspecting proxies
//! (corporate firewalls that intercept HTTPS traffic). The proxy's CA certificate
//! must be added here for TLS verification to succeed.
//!
//! ## 3. System Certificates (when available)
//!
//! Platform/OS-level certificates loaded by `rustls-native-certs` inside
//! `rustls-platform-verifier`. The loading behavior can be customized:
//! - `SSL_CERT_FILE`: Path to a PEM file containing CA certificates
//! - `SSL_CERT_DIR`: Directory with OpenSSL-style hashed certificate files
//!
//! # Implementation Details
//!
//! The certificate loading flow:
//!
//! 1. We collect Mozilla roots + user extra certs into a `Vec<Certificate>`
//! 2. These are passed to reqwest's `tls_certs_merge()` method
//! 3. reqwest forwards them to `rustls-platform-verifier::Verifier::new_with_extra_roots()`
//! 4. The platform verifier adds our certs to `RootCertStore`, then loads and adds
//!    system certs via `rustls_native_certs`. It only errors if the store is empty,
//!    which can't happen because Mozilla roots are always present.
//!
//! This design ensures:
//! - Minimal Docker containers work (Mozilla fallback)
//! - Enterprise SSL inspection works (user extra certs)
//! - Normal environments work (system certs)
//! - All three sources are combined, not mutually exclusive
//!
//! # Historical Context
//!
//! - [Issue #726](https://github.com/nextstrain/nextclade/issues/726): Users behind SSL-inspecting proxies couldn't download datasets
//! - [PR #798](https://github.com/nextstrain/nextclade/pull/798): Used default-features=false to avoid native-tls/OpenSSL for cross-compilation
//! - [PR #1529](https://github.com/nextstrain/nextclade/pull/1529), [PR #1536](https://github.com/nextstrain/nextclade/pull/1536): Added rustls-native-certs and webpki-roots support
//! - [PR #1723](https://github.com/nextstrain/nextclade/pull/1723): Added webpki-root-certs fallback for minimal Docker containers
//!
//! # Related reqwest Features
//!
//! - `rustls`: Enables rustls TLS backend with rustls-platform-verifier
//! - `rustls-native-certs`: Enables loading system CA certificates (used by platform verifier)
//!
//! Note: The `webpki-roots` feature in reqwest is NOT used - we use `webpki-root-certs`
//! crate directly because reqwest doesn't automatically use webpki-roots as fallback.

use eyre::{Report, WrapErr};
use itertools::Itertools;
use nextclade::io::file::open_file_or_stdin;
use reqwest::tls::Certificate;
use std::path::Path;

/// Returns Mozilla's root CA certificates as reqwest `Certificate` objects.
///
/// These certificates are compiled into the binary from the `webpki-root-certs` crate,
/// which tracks Mozilla's CA certificate program. They serve as a fallback when
/// system certificates are unavailable (e.g., minimal Docker containers).
///
/// The certificates are in DER format and are converted to reqwest's Certificate type.
/// Invalid certificates are silently skipped (should not happen with the curated Mozilla set).
pub fn mozilla_root_certs() -> Vec<Certificate> {
  // webpki_root_certs::TLS_SERVER_ROOT_CERTS is &[CertificateDer<'static>]
  // containing Mozilla-trusted root CA certificates in DER format.
  webpki_root_certs::TLS_SERVER_ROOT_CERTS
    .iter()
    .filter_map(|cert_der| {
      // Convert from rustls CertificateDer to reqwest Certificate.
      // cert_der.as_ref() gives us &[u8] (the raw DER bytes).
      Certificate::from_der(cert_der.as_ref()).ok()
    })
    .collect_vec()
}

/// Loads extra CA certificates from a PEM bundle file.
///
/// This supports enterprise environments where a corporate proxy performs
/// SSL inspection. The proxy's CA certificate must be trusted for HTTPS
/// connections to succeed.
///
/// # Arguments
///
/// * `filepath` - Path to a PEM-encoded certificate bundle file.
///   Can contain multiple certificates concatenated together.
///   If None, returns an empty vector.
///
/// # PEM Format Example
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
/// Returns an error if:
/// - The file cannot be read
/// - The PEM format is invalid
/// - Certificate parsing fails
pub fn extra_ca_certs(filepath: Option<impl AsRef<Path>>) -> Result<Vec<Certificate>, Report> {
  filepath.map_or_else(
    || Ok(vec![]),
    |filename| {
      let mut pem_bundle = vec![];
      open_file_or_stdin(Some(&filename))?.read_to_end(&mut pem_bundle)?;
      Certificate::from_pem_bundle(&pem_bundle).wrap_err("While parsing PEM certificate bundle")
    },
  )
}

/// Builds the complete set of CA certificates to merge into the TLS trust store.
///
/// Combines Mozilla root certificates with any user-provided extra certificates.
/// The resulting certificates are passed to reqwest's `tls_certs_merge()`, which
/// forwards them to `rustls-platform-verifier` as `extra_roots`.
///
/// # Certificate Precedence
///
/// All certificates are added to the same trust store - there's no precedence.
/// A server certificate is valid if it chains to ANY trusted root, whether that
/// root came from Mozilla, user extras, or system certificates.
///
/// # Arguments
///
/// * `extra_certs_filepath` - Optional path to additional CA certificates (PEM format)
///
/// # Returns
///
/// A vector containing:
/// - Mozilla root certificates (always present)
/// - User extra certificates (0 or more, from file if provided)
pub fn build_trust_anchors(
  extra_certs_filepath: Option<impl AsRef<Path>>,
) -> Result<Vec<Certificate>, Report> {
  let extra_certs = extra_ca_certs(extra_certs_filepath)?;

  // Chain Mozilla roots with user extras.
  // Mozilla roots come first but order doesn't affect trust - all are equally trusted.
  let all_certs = mozilla_root_certs().into_iter().chain(extra_certs).collect_vec();

  Ok(all_certs)
}
