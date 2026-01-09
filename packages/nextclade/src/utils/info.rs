use semver::Version;
use std::sync::LazyLock;

pub fn this_package_name() -> &'static str {
  static PKG_NAME: &str = env!("CARGO_PKG_NAME");
  PKG_NAME
}

pub fn this_package_version() -> &'static Version {
  static VERSION: LazyLock<Version> = LazyLock::new(|| {
    Version::parse(env!("CARGO_PKG_VERSION")).expect(
      "Unable to parse env var `CARGO_PKG_VERSION` in semantic version format. \
        In most cases it comes from `version` field in `Cargo.toml` file.",
    )
  });
  &VERSION
}

pub fn this_package_version_str() -> &'static str {
  static VERSION_STR: LazyLock<String> = LazyLock::new(|| this_package_version().to_string());
  &VERSION_STR
}
