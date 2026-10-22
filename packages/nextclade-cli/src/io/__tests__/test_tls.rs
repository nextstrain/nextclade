#[cfg(test)]
mod tests {
  use crate::io::tls::{
    RootOrigin, SSL_CERT_DIR, SSL_CERT_FILE, TrustPlatform, TrustRoots, choose_trust_roots, extra_ca_certs,
    parse_ca_certs_pem, system_store_overrides,
  };
  use helpers::{ISRG_ROOT_X2_PEM, built_in, malformed, path_list, root, store};
  use nextclade::utils::error::report_to_string;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use rustls::pki_types::CertificateDer;
  use std::ffi::OsStr;

  #[rustfmt::skip]
  #[rstest]
  #[case::system_store_with_extras(
    TrustPlatform::SystemStore(store(vec![root(0), root(1)], &[], &[])),
    vec![root(2)],
    Ok(TrustRoots::Only {
      roots: vec![root(0), root(1), root(2)],
      origin: RootOrigin::SystemStore { usable: 2, skipped: 0, load_errors: vec![] },
    }),
  )]
  #[case::system_store_from_override_variable(
    TrustPlatform::SystemStore(store(vec![root(0)], &[], &["SSL_CERT_FILE"])),
    vec![],
    Ok(TrustRoots::Only {
      roots: vec![root(0)],
      origin: RootOrigin::SystemStore { usable: 1, skipped: 0, load_errors: vec![] },
    }),
  )]
  #[case::system_store_keeps_valid_and_counts_malformed(
    TrustPlatform::SystemStore(store(vec![root(0), malformed(), root(1)], &["unreadable file"], &[])),
    vec![],
    Ok(TrustRoots::Only {
      roots: vec![root(0), root(1)],
      origin: RootOrigin::SystemStore { usable: 2, skipped: 1, load_errors: vec!["unreadable file".to_owned()] },
    }),
  )]
  #[case::empty_system_store_uses_built_in_roots(
    TrustPlatform::SystemStore(store(vec![], &[], &[])),
    vec![root(2)],
    Ok(TrustRoots::Only {
      roots: built_in().into_iter().chain([root(2)]).collect(),
      origin: RootOrigin::BuiltIn { skipped: 0, load_errors: vec![] },
    }),
  )]
  #[case::only_malformed_system_certificates_count_as_empty(
    TrustPlatform::SystemStore(store(vec![malformed(), malformed()], &[], &[])),
    vec![],
    Ok(TrustRoots::Only {
      roots: built_in(),
      origin: RootOrigin::BuiltIn { skipped: 2, load_errors: vec![] },
    }),
  )]
  #[case::empty_ssl_cert_file_is_error(
    TrustPlatform::SystemStore(store(vec![], &["failed to read PEM from file: /nonexistent"], &["SSL_CERT_FILE"])),
    vec![root(2)],
    Err("The environment variable SSL_CERT_FILE replaces the system certificate store, but no usable CA certificates were found (failed to read PEM from file: /nonexistent). Make SSL_CERT_FILE point to CA certificates in PEM format, or unset SSL_CERT_FILE to use the system certificate store.".to_owned()),
  )]
  #[case::empty_ssl_cert_dir_is_error(
    TrustPlatform::SystemStore(store(vec![], &[], &["SSL_CERT_DIR"])),
    vec![],
    Err("The environment variable SSL_CERT_DIR replaces the system certificate store, but no usable CA certificates were found. Make SSL_CERT_DIR point to CA certificates in PEM format, or unset SSL_CERT_DIR to use the system certificate store.".to_owned()),
  )]
  #[case::malformed_override_certificates_are_error(
    TrustPlatform::SystemStore(store(vec![malformed()], &[], &["SSL_CERT_FILE", "SSL_CERT_DIR"])),
    vec![],
    Err("The environment variables SSL_CERT_FILE and SSL_CERT_DIR replace the system certificate store, but no usable CA certificates were found (1 certificate cannot be used as a trust anchor). Make SSL_CERT_FILE and SSL_CERT_DIR point to CA certificates in PEM format, or unset SSL_CERT_FILE and SSL_CERT_DIR to use the system certificate store.".to_owned()),
  )]
  #[case::os_verifier_without_extras(
    TrustPlatform::OsVerifier,
    vec![],
    Ok(TrustRoots::OsVerifier { extras: vec![] }),
  )]
  #[case::os_verifier_with_extras(
    TrustPlatform::OsVerifier,
    vec![root(2)],
    Ok(TrustRoots::OsVerifier { extras: vec![root(2)] }),
  )]
  #[trace]
  fn test_tls_chooses_trust_roots(
    #[case] platform: TrustPlatform,
    #[case] extras: Vec<CertificateDer<'static>>,
    #[case] expected: Result<TrustRoots, String>,
  ) {
    let actual = choose_trust_roots(platform, extras).map_err(|report| report_to_string(&report));
    assert_eq!(expected, actual);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::none_set(                  None,                      None,                          vec![])]
  #[case::cert_file(                 Some("/etc/ssl/cert.pem"), None,                          vec![SSL_CERT_FILE])]
  #[case::empty_cert_file(           Some(""),                  None,                          vec![SSL_CERT_FILE])]
  #[case::whitespace_cert_file(      Some(" "),                 None,                          vec![SSL_CERT_FILE])]
  #[case::cert_dir(                  None,                      Some("/etc/ssl/certs"),        vec![SSL_CERT_DIR])]
  #[case::cert_dir_list(             None,                      Some("/etc/ssl/certs:/certs"), vec![SSL_CERT_DIR])]
  #[case::cert_dir_with_empty_entry( None,                      Some(":/etc/ssl/certs:"),      vec![SSL_CERT_DIR])]
  #[case::empty_cert_dir(            None,                      Some(""),                      vec![])]
  #[case::cert_dir_of_empty_entries( None,                      Some("::"),                    vec![])]
  #[case::whitespace_cert_dir(       None,                      Some(" "),                     vec![SSL_CERT_DIR])]
  #[case::both(                      Some("/etc/ssl/cert.pem"), Some("/etc/ssl/certs"),        vec![SSL_CERT_FILE, SSL_CERT_DIR])]
  #[case::empty_both(                Some(""),                  Some(""),                      vec![SSL_CERT_FILE])]
  #[trace]
  fn test_tls_system_store_overrides(
    #[case] cert_file: Option<&str>,
    #[case] cert_dir: Option<&str>,
    #[case] expected: Vec<&'static str>,
  ) {
    let cert_dir = cert_dir.map(path_list);
    let actual = system_store_overrides(cert_file.map(OsStr::new), cert_dir.as_deref());
    assert_eq!(expected, actual);
  }

  #[test]
  fn test_tls_parses_pem_ca_certificate() {
    let certs = parse_ca_certs_pem(ISRG_ROOT_X2_PEM.as_bytes()).unwrap();
    assert_eq!(1, certs.len());
    assert!(webpki_root_certs::TLS_SERVER_ROOT_CERTS.contains(&certs[0]));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty_file(
    "",
    "No certificates found. Expected PEM certificates, each starting with '-----BEGIN CERTIFICATE-----'.",
  )]
  #[case::not_pem(
    "MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw",
    "No certificates found. Expected PEM certificates, each starting with '-----BEGIN CERTIFICATE-----'.",
  )]
  #[case::invalid_certificate_after_valid_one(
    &format!("{ISRG_ROOT_X2_PEM}-----BEGIN CERTIFICATE-----\nAAECAwQ=\n-----END CERTIFICATE-----\n"),
    "Certificate 2 of 2 cannot be used as a trust anchor: invalid peer certificate: BadEncoding",
  )]
  #[trace]
  fn test_tls_rejects_invalid_ca_certificates_pem(#[case] pem: &str, #[case] expected: &str) {
    let actual = parse_ca_certs_pem(pem.as_bytes()).map_err(|report| report_to_string(&report));
    assert_eq!(Err(expected.to_owned()), actual);
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::empty_file(
    "",
    "No certificates found. Expected PEM certificates, each starting with '-----BEGIN CERTIFICATE-----'.",
  )]
  #[case::invalid_certificate(
    "-----BEGIN CERTIFICATE-----\nAAECAwQ=\n-----END CERTIFICATE-----\n",
    "Certificate 1 of 1 cannot be used as a trust anchor: invalid peer certificate: BadEncoding",
  )]
  #[trace]
  fn test_tls_extra_ca_certs_error_names_the_file(#[case] content: &str, #[case] expected_cause: &str) {
    let dir = tempfile::TempDir::new().unwrap();
    let path = dir.path().join("extra.pem");
    std::fs::write(&path, content).unwrap();

    let actual = extra_ca_certs(Some(&path)).map_err(|report| report_to_string(&report));

    let expected = format!(
      "When reading extra CA certificates from '{}' given with `--extra-ca-certs` or `NEXTCLADE_EXTRA_CA_CERTS`: {expected_cause}",
      path.display()
    );
    assert_eq!(Err(expected), actual);
  }

  mod helpers {
    use crate::io::tls::SystemStore;
    use rustls::pki_types::CertificateDer;
    use std::ffi::OsString;

    pub const ISRG_ROOT_X2_PEM: &str = "-----BEGIN CERTIFICATE-----
MIICGzCCAaGgAwIBAgIQQdKd0XLq7qeAwSxs6S+HUjAKBggqhkjOPQQDAzBPMQsw
CQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJuZXQgU2VjdXJpdHkgUmVzZWFyY2gg
R3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBYMjAeFw0yMDA5MDQwMDAwMDBaFw00
MDA5MTcxNjAwMDBaME8xCzAJBgNVBAYTAlVTMSkwJwYDVQQKEyBJbnRlcm5ldCBT
ZWN1cml0eSBSZXNlYXJjaCBHcm91cDEVMBMGA1UEAxMMSVNSRyBSb290IFgyMHYw
EAYHKoZIzj0CAQYFK4EEACIDYgAEzZvVn4CDCuwJSvMWSj5cz3es3mcFDR0HttwW
+1qLFNvicWDEukWVEYmO6gbf9yoWHKS5xcUy4APgHoIYOIvXRdgKam7mAHf7AlF9
ItgKbppbd9/w+kHsOdx1ymgHDB/qo0IwQDAOBgNVHQ8BAf8EBAMCAQYwDwYDVR0T
AQH/BAUwAwEB/zAdBgNVHQ4EFgQUfEKWrt5LSDv6kviejM9ti6lyN5UwCgYIKoZI
zj0EAwMDaAAwZQIwe3lORlCEwkSHRhtFcP9Ymd70/aTSVaYgLXTWNLxBo1BfASdW
tL4ndQavEi51mI38AjEAi/V3bNTIZargCyzuFJ0nN6T5U6VR5CmD1/iQMVtCnwr1
/q4AaOeMSQ+2b1tbFfLn
-----END CERTIFICATE-----
";

    /// Real root certificate number `index` of the built-in Mozilla list
    pub fn root(index: usize) -> CertificateDer<'static> {
      webpki_root_certs::TLS_SERVER_ROOT_CERTS[index].clone()
    }

    /// Built-in roots that every test store carries, distinct from the other roots of the tests
    pub fn built_in() -> Vec<CertificateDer<'static>> {
      vec![root(3), root(4)]
    }

    /// Bytes that are not a certificate
    pub fn malformed() -> CertificateDer<'static> {
      CertificateDer::from(b"not a certificate".to_vec())
    }

    /// List of paths written with `:`, joined with the path list separator of the platform
    pub fn path_list(list: &str) -> OsString {
      std::env::join_paths(list.split(':')).unwrap()
    }

    pub fn store(certs: Vec<CertificateDer<'static>>, load_errors: &[&str], overrides: &[&'static str]) -> SystemStore {
      SystemStore {
        certs,
        load_errors: load_errors.iter().map(|error| (*error).to_owned()).collect(),
        overrides: overrides.to_vec(),
        built_in: built_in(),
      }
    }
  }
}
