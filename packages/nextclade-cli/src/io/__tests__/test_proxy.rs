#[cfg(test)]
mod tests {
  use crate::io::proxy::{ProxyEnv, ProxySource, ignored_credentials_warning, select_proxy_source};
  use helpers::proxy_env;
  use pretty_assertions::assert_eq;
  use rstest::rstest;
  use std::collections::BTreeMap;
  use std::ffi::OsString;
  #[cfg(unix)]
  use std::os::unix::ffi::OsStringExt;

  #[rustfmt::skip]
  #[rstest]
  #[case::upper_case_only(     &[("HTTPS_PROXY", "http://upper:1")],                                   Some("http://upper:1"))]
  #[case::lower_case_only(     &[("https_proxy", "http://lower:1")],                                   Some("http://lower:1"))]
  #[case::upper_before_lower(  &[("HTTPS_PROXY", "http://upper:1"), ("https_proxy", "http://lower:1")], Some("http://upper:1"))]
  #[case::empty_upper_skipped( &[("HTTPS_PROXY", ""), ("https_proxy", "http://lower:1")],              Some("http://lower:1"))]
  #[case::empty_is_set(        &[("HTTPS_PROXY", ""), ("https_proxy", "")],                            Some(""))]
  #[case::empty_lower_is_set(  &[("https_proxy", "")],                                                 Some(""))]
  #[case::unset(               &[],                                                                    None)]
  #[trace]
  fn test_proxy_env_takes_first_non_empty_value_or_empty_when_set(
    #[case] vars: &[(&str, &str)],
    #[case] expected: Option<&str>,
  ) {
    let env = proxy_env(vars);
    assert_eq!(expected, env.https.as_deref());
  }

  #[test]
  fn test_proxy_env_reads_every_variable() {
    let env = proxy_env(&[
      ("all_proxy", "socks5://all:1080"),
      ("HTTP_PROXY", "http://http:1"),
      ("HTTPS_PROXY", "http://https:1"),
      ("no_proxy", "localhost,.internal"),
      ("REQUEST_METHOD", "GET"),
    ]);
    let expected = ProxyEnv {
      all: Some("socks5://all:1080".to_owned()),
      http: Some("http://http:1".to_owned()),
      https: Some("http://https:1".to_owned()),
      no_proxy: Some("localhost,.internal".to_owned()),
      is_cgi: true,
      non_utf8: vec![],
    };
    assert_eq!(expected, env);
  }

  #[test]
  fn test_proxy_explicit_proxy_wins_over_environment_and_keeps_no_proxy() {
    let url = "explicit:3128";
    let env = proxy_env(&[
      ("ALL_PROXY", "http://all:1"),
      ("HTTPS_PROXY", "http://https:1"),
      ("NO_PROXY", "example.org"),
    ]);
    assert_eq!(
      ProxySource::Explicit {
        url,
        no_proxy: Some("example.org"),
      },
      select_proxy_source(Some(url), &env)
    );
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::nothing_set(        &[],                                                          None)]
  #[case::only_no_proxy(      &[("NO_PROXY", "example.org")],                               None)]
  #[case::cgi_ignores_http(   &[("HTTP_PROXY", "http://http:1"), ("REQUEST_METHOD", "GET")], None)]
  #[case::cgi_ignores_lower_http( &[("http_proxy", "http://http:1"), ("REQUEST_METHOD", "GET")], None)]
  #[case::only_all(           &[("ALL_PROXY", "http://all:1")],                             Some((None, None, Some("http://all:1"))))]
  #[case::only_http(          &[("http_proxy", "http://http:1")],                           Some((None, Some("http://http:1"), None)))]
  #[case::https_and_all(      &[("HTTPS_PROXY", "http://https:1"), ("ALL_PROXY", "http://all:1")], Some((Some("http://https:1"), None, Some("http://all:1"))))]
  #[case::only_empty_https(   &[("HTTPS_PROXY", "")],                                       Some((None, None, None)))]
  #[case::empty_upper_lower_set( &[("HTTPS_PROXY", ""), ("https_proxy", "http://p:1")],     Some((Some("http://p:1"), None, None)))]
  #[case::empty_https_keeps_all( &[("HTTPS_PROXY", ""), ("ALL_PROXY", "http://all:1")],     Some((None, None, Some("http://all:1"))))]
  #[case::cgi_ignores_empty_http( &[("HTTP_PROXY", ""), ("REQUEST_METHOD", "GET")],         None)]
  #[case::cgi_keeps_https(    &[("HTTPS_PROXY", "http://https:1"), ("HTTP_PROXY", "http://http:1"), ("REQUEST_METHOD", "GET")], Some((Some("http://https:1"), None, None)))]
  #[trace]
  fn test_proxy_standard_variables_are_used_alone_when_any_is_set(
    #[case] vars: &[(&str, &str)],
    #[case] expected: Option<(Option<&str>, Option<&str>, Option<&str>)>,
  ) {
    let env = proxy_env(vars);
    let no_proxy = env.no_proxy.as_deref();
    let expected = match expected {
      None => ProxySource::System,
      Some((https, http, all)) => ProxySource::Environment { https, http, all, no_proxy },
    };
    assert_eq!(expected, select_proxy_source(None, &env));
  }

  #[cfg(unix)]
  #[test]
  fn test_proxy_env_non_utf8_value_counts_as_set_and_is_recorded() {
    let env = ProxyEnv::from_lookup(|name| (name == "https_proxy").then(|| OsString::from_vec(vec![0xff])));
    assert_eq!((Some(""), vec!["https_proxy"]), (env.https.as_deref(), env.non_utf8));
  }

  #[rustfmt::skip]
  #[rstest]
  #[case::explicit_with_credentials(    true,  true,  false)]
  #[case::environment_with_credentials( false, true,  true)]
  #[case::environment_without(          false, false, false)]
  #[trace]
  fn test_proxy_credentials_without_explicit_proxy_warn(
    #[case] explicit: bool,
    #[case] has_credentials: bool,
    #[case] expected: bool,
  ) {
    let source = if explicit {
      ProxySource::Explicit { url: "explicit:3128", no_proxy: None }
    } else {
      ProxySource::Environment { https: Some("http://https:1"), http: None, all: None, no_proxy: None }
    };
    let warning = ignored_credentials_warning(&source, has_credentials);
    assert_eq!(expected, warning.is_some());
  }

  #[test]
  fn test_proxy_credentials_warning_names_the_options() {
    let warning = ignored_credentials_warning(&ProxySource::System, true).unwrap();
    assert!(
      warning.contains("`--proxy` or `NEXTCLADE_PROXY`") && warning.contains("http://user:password@"),
      "{warning}"
    );
  }

  mod helpers {
    use super::*;

    pub fn proxy_env(vars: &[(&str, &str)]) -> ProxyEnv {
      let vars: BTreeMap<&str, &str> = vars.iter().copied().collect();
      ProxyEnv::from_lookup(|name| vars.get(name).map(OsString::from))
    }
  }
}
